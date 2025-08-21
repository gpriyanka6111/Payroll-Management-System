
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PayrollResult, EmployeePayrollInput } from '@/components/payroll/payroll-calculation';
import { Payslip } from '@/components/payroll/payslip';
import { format, startOfYear, eachDayOfInterval, isSameDay, getDay, isValid, parseISO } from 'date-fns';
import { ArrowLeft, Users, Pencil, FileSpreadsheet } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { doc, getDoc, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const formatCurrency = (amount: unknown) => {
    const num = Number(amount);
    if (isNaN(num)) {
        return '$ --.--';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

const formatHours = (hours: unknown): string => {
    const num = Number(hours);
    if (isNaN(num)) {
        return '--';
    }
    return num.toFixed(2);
};

interface YtdData {
    [employeeId: string]: {
        grossPay: number;
    };
}

interface DailyHours {
    date: Date;
    hours: number;
}

interface EmployeeDailyHours {
    [employeeId: string]: DailyHours[];
}

function PayrollReportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const payrollId = searchParams.get('id');
    
    const [results, setResults] = React.useState<PayrollResult[]>([]);
    const [inputs, setInputs] = React.useState<EmployeePayrollInput[]>([]);
    const [period, setPeriod] = React.useState<{ from: Date; to: Date } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [companyName, setCompanyName] = React.useState("My Small Business");
    const [summaryData, setSummaryData] = React.useState<{ employer?: string; employee?: string; deductions?: string; netPay?: string }>({});
    const [ytdData, setYtdData] = React.useState<YtdData>({});


    React.useEffect(() => {
        const loadPayrollData = async () => {
            setIsLoading(true);
            if (!user) {
                 setIsLoading(false);
                 return;
            };

            let currentPayrollData: any;
            let fromDate: Date;
            let toDate: Date;

            if (payrollId) {
                 try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        setCompanyName(userSnap.data().companyName || "My Small Business");
                    }

                    const payrollDocRef = doc(db, 'users', user.uid, 'payrolls', payrollId);
                    const payrollSnap = await getDoc(payrollDocRef);

                    if (payrollSnap.exists()) {
                        currentPayrollData = payrollSnap.data();
                        const [fromY, fromM, fromD] = currentPayrollData.fromDate.split('-').map(Number);
                        const [toY, toM, toD] = currentPayrollData.toDate.split('-').map(Number);
                        fromDate = new Date(fromY, fromM - 1, fromD);
                        toDate = new Date(toY, toM - 1, toD);

                        setResults(currentPayrollData.results);
                        setInputs(currentPayrollData.inputs);
                        setPeriod({ from: fromDate, to: toDate });
                        setSummaryData({
                            employer: currentPayrollData.summaryEmployer,
                            employee: currentPayrollData.summaryEmployee,
                            deductions: currentPayrollData.summaryDeductions,
                            netPay: currentPayrollData.summaryNetPay,
                        });
                    } else {
                        throw new Error("Payroll document not found.");
                    }
                } catch (error) {
                    console.error("Error fetching payroll data:", error);
                    router.replace('/dashboard/payroll');
                    return;
                }
            } else {
                 const resultsData = sessionStorage.getItem('payrollResultsData');
                 const periodData = sessionStorage.getItem('payrollPeriodData');
                 const inputData = sessionStorage.getItem('payrollInputData');
                 const companyData = sessionStorage.getItem('companyName');
                 const summaryJSON = sessionStorage.getItem('payrollSummaryData');

                 if (resultsData && periodData && inputData) {
                    const parsedPeriod = JSON.parse(periodData);
                    fromDate = new Date(parsedPeriod.from);
                    toDate = new Date(parsedPeriod.to);

                     if (!isValid(fromDate) || !isValid(toDate)) {
                        router.replace('/dashboard/payroll/run');
                        return;
                    }

                    currentPayrollData = {
                        results: JSON.parse(resultsData),
                        inputs: JSON.parse(inputData),
                        fromDate: format(fromDate, 'yyyy-MM-dd')
                    }
                    setResults(currentPayrollData.results);
                    setInputs(currentPayrollData.inputs);
                    setPeriod({ from: fromDate, to: toDate });
                    if (summaryJSON) setSummaryData(JSON.parse(summaryJSON));
                    if (companyData) setCompanyName(companyData);
                    
                    // Clear session storage after loading
                    sessionStorage.removeItem('payrollResultsData');
                    sessionStorage.removeItem('payrollPeriodData');
                    sessionStorage.removeItem('payrollInputData');
                    sessionStorage.removeItem('companyName');
                    sessionStorage.removeItem('payrollSummaryData');
                 } else {
                     router.replace('/dashboard/payroll/run');
                     return;
                 }
            }
            
            // Calculate YTD data
            const yearStart = startOfYear(fromDate);
            const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
            const q = query(
                payrollsCollectionRef,
                where('toDate', '>=', format(yearStart, 'yyyy-MM-dd')),
                where('toDate', '<', currentPayrollData.fromDate),
                orderBy('toDate', 'asc')
            );

            const previousPayrollsSnapshot = await getDocs(q);
            const ytdTotals: YtdData = {};

            currentPayrollData.results.forEach((res: PayrollResult) => {
                ytdTotals[res.employeeId] = { grossPay: 0 };
            });

            previousPayrollsSnapshot.forEach(doc => {
                const payroll = doc.data();
                payroll.results.forEach((result: PayrollResult) => {
                    if (ytdTotals[result.employeeId]) {
                         const gross = result.grossCheckAmount + result.grossOtherAmount;
                         ytdTotals[result.employeeId].grossPay += gross;
                    }
                });
            });

            setYtdData(ytdTotals);
            setIsLoading(false);
        };

        if (user) {
          loadPayrollData();
        }
    }, [router, payrollId, user]);
    
    if (isLoading) {
        return (
             <div className="space-y-4 p-6">
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
             </div>
        )
    }

    if (!period || results.length === 0 || inputs.length === 0) {
        return (
            <div className="text-center py-10">
                <p>No payroll data found or you do not have permission to view it.</p>
                <Button onClick={() => router.push('/dashboard/payroll/run')}>Start a new payroll run</Button>
            </div>
        )
    }

    const inputMetrics = [
        { key: 'totalHoursWorked', label: 'TOTAL HOURS WORKED' },
        { key: 'checkHours', label: 'CHECK HOURS' },
        { key: 'otherHours', label: 'OTHER HOURS' },
        { key: 'ptoUsed', label: 'PTO USED' },
    ] as const;

    const totals = {
        totalGrossPay: results.reduce((sum, r) => sum + r.grossCheckAmount + r.grossOtherAmount, 0),
        totalNetPay: results.reduce((sum, r) => sum + r.grossCheckAmount, 0),
        totalOtherPay: results.reduce((sum, r) => sum + r.grossOtherAmount, 0),
        totalEmployees: results.length,
    };

    const handleExportToExcel = async () => {
        if (!period || !results.length || !user) return;
    
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const isSundayClosed = userSnap.exists() ? userSnap.data().storeTimings?.sundayClosed === true : false;

        const toDateEnd = new Date(period.to);
        toDateEnd.setHours(23, 59, 59, 999);
        const employeeHours: EmployeeDailyHours = {};
    
        for (const input of inputs) {
            employeeHours[input.employeeId] = [];
            const timeEntriesRef = collection(db, 'users', user.uid, 'employees', input.employeeId, 'timeEntries');
            const q = query(
                timeEntriesRef,
                where('timeIn', '>=', period.from),
                where('timeIn', '<=', toDateEnd)
            );
            const snapshot = await getDocs(q);
            const dailyMinutes: { [key: string]: number } = {};
            snapshot.forEach(doc => {
                const entry = doc.data();
                if (entry.timeOut) {
                    const dateKey = format(entry.timeIn.toDate(), 'yyyy-MM-dd');
                    const minutes = Math.round((entry.timeOut.toDate().getTime() - entry.timeIn.toDate().getTime()) / 60000);
                    dailyMinutes[dateKey] = (dailyMinutes[dateKey] || 0) + minutes;
                }
            });
    
            for (const dateKey in dailyMinutes) {
                 const dateWithTimezone = parseISO(dateKey + 'T12:00:00');
                 if(isValid(dateWithTimezone)) {
                    employeeHours[input.employeeId].push({
                        date: dateWithTimezone,
                        hours: dailyMinutes[dateKey] / 60
                    });
                 }
            }
        }
    
        const wb = XLSX.utils.book_new();
        const ws_data: (string | number | null)[][] = [];
        const merges: XLSX.Range[] = [];
        const row_heights: { hpx: number }[] = [];
        let currentRow = 0;
    
        ws_data.push([`${companyName} - Pay Period: ${format(period.from, 'LLL dd, yyyy')} - ${format(period.to, 'LLL dd, yyyy')}`]);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 + inputs.length } });
        row_heights.push({ hpx: 25 });
        currentRow++;
    
        ws_data.push([]);
        row_heights.push({ hpx: 20 });
        currentRow++;
    
        const employeeNames = inputs.map(i => i.name.toUpperCase());
        ws_data.push(['Date', 'Day', 'HRS', ...employeeNames]);
        row_heights.push({ hpx: 25 });
        currentRow++;
    
        const daysInPeriod = eachDayOfInterval({ start: period.from, end: period.to });
        let weeklyTotals: number[] = Array(inputs.length).fill(0);
        const grandTotals: number[] = Array(inputs.length).fill(0);
    
        daysInPeriod.forEach((day, index) => {
            const dayOfWeek = getDay(day);
    
            if (!(isSundayClosed && dayOfWeek === 0)) {
                const row: (string | number | null)[] = [
                    format(day, 'MM/dd'),
                    format(day, 'EEE').toUpperCase(),
                    "HRS",
                ];
                inputs.forEach((input, i) => {
                    const dayData = employeeHours[input.employeeId]?.find(d => isSameDay(d.date, day));
                    const hours = dayData ? parseFloat(dayData.hours.toFixed(2)) : 0;
                    row.push(hours > 0 ? hours : '');
                    weeklyTotals[i] += hours;
                    grandTotals[i] += hours;
                });
                ws_data.push(row);
                row_heights.push({ hpx: 20 });
                currentRow++;
            }

            const isSaturday = dayOfWeek === 6;
            const isLastDay = index === daysInPeriod.length - 1;
            
            if ((isSaturday || isLastDay) && weeklyTotals.some(t => t > 0)) {
                const weeklyTotalRow: (string | number | null)[] = ['Total Hrs of this week', null, null];
                weeklyTotals.forEach(total => {
                    weeklyTotalRow.push(total > 0 ? parseFloat(total.toFixed(2)) : '');
                });
                ws_data.push(weeklyTotalRow);
                merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
                row_heights.push({ hpx: 25 });
                currentRow++;
                weeklyTotals = Array(inputs.length).fill(0);
            }
        });
    
        const grandTotalRow: (string | number | null)[] = ['Total Hours', null, null];
        grandTotals.forEach(total => {
            grandTotalRow.push(total > 0 ? parseFloat(total.toFixed(2)) : '');
        });
        ws_data.push(grandTotalRow);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
        row_heights.push({ hpx: 25 });
        currentRow++;

        // --- Start of Financial Summary ---

        const summaryMetrics: { label: string; key: keyof EmployeePayrollInput | keyof PayrollResult; type: 'input' | 'result'; format?: 'currency' | 'hours' }[] = [
            { label: 'COMMENTS', key: 'comment', type: 'input' },
            { label: 'CHECK HOURS', key: 'checkHours', type: 'input', format: 'hours' },
            { label: 'OTHER HOURS', key: 'otherHours', type: 'input', format: 'hours' },
            { label: 'RATE/CHECK', key: 'payRateCheck', type: 'result', format: 'currency' },
            { label: 'RATE/OTHERS', key: 'payRateOthers', type: 'result', format: 'currency' },
            { label: 'OTHER-ADJ$', key: 'otherAdjustment', type: 'result', format: 'currency' },
        ];

        summaryMetrics.forEach(metric => {
            const row: (string | number | null)[] = [metric.label, null, null];
            inputs.forEach(input => {
                const source = metric.type === 'input' ? input : results.find(r => r.employeeId === input.employeeId);
                let value: any = source ? (source as any)[metric.key] : undefined;

                if (value !== undefined && value !== null && value !== '') {
                    if (metric.format === 'currency') value = formatCurrency(value);
                    else if (metric.format === 'hours') value = formatHours(value);
                } else {
                    value = '';
                }
                
                row.push(value);
            });
            ws_data.push(row);
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
            row_heights.push({ hpx: 25 });
            currentRow++;
        });

        ws_data.push([null, null, null, ...employeeNames]);
        row_heights.push({ hpx: 20 });
        currentRow++;

        const grossMetrics = [
            { label: 'GROSS CHECK AMOUNT', key: 'grossCheckAmount' },
            { label: 'GROSS OTHER AMOUNT', key: 'grossOtherAmount' },
        ];

        grossMetrics.forEach(metric => {
            const row: (string | number | null)[] = [metric.label, null, null];
            results.forEach(result => {
                row.push(formatCurrency((result as any)[metric.key]));
            });
            ws_data.push(row);
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
            row_heights.push({ hpx: 25 });
            currentRow++;
        });
        
        ws_data.push([]); // Empty row
        row_heights.push({ hpx: 20 });
        currentRow++;

        // Final Payroll Summary
        ws_data.push(['Payroll Summary', null, null]);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
        row_heights.push({ hpx: 25 });
        currentRow++;

        ws_data.push([null, null, null, 'GP', 'EMPLOYER', 'EMPLOYEE', 'DED', 'NET', 'OTHERS']);
        row_heights.push({ hpx: 25 });
        currentRow++;

        ws_data.push([null, null, null,
            formatCurrency(totals.totalNetPay),
            summaryData.employer || '-',
            summaryData.employee || '-',
            summaryData.deductions || '-',
            summaryData.netPay || '-',
            formatCurrency(totals.totalOtherPay)
        ]);
        row_heights.push({ hpx: 25 });
        currentRow++;
        // --- End of Financial Summary ---

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        ws['!merges'] = merges;
        
        ws['!rows'] = row_heights;

        const colWidths = [{ wch: 6.5 }, { wch: 7 }, { wch: 6 }];
        inputs.forEach(() => colWidths.push({ wch: 12 }));
        ws['!cols'] = colWidths;
        
        // --- Cell Styling ---
        const lightGrayFill = { fgColor: { rgb: "F0F0F0" } };
        const centerAlign = { horizontal: 'center' };

        // Helper to get cell address
        const getCellAddress = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

        // Apply styles
        ws_data.forEach((row, r) => {
            row.forEach((cell, c) => {
                const cellAddress = getCellAddress(r, c);
                if (!ws[cellAddress]) ws[cellAddress] = { t: typeof cell === 'number' ? 'n' : 's', v: cell };
                let currentStyle = ws[cellAddress].s || {};

                // Center align all data columns
                if (c >= 3) {
                    currentStyle.alignment = { ...currentStyle.alignment, ...centerAlign };
                }
                
                const rowText = typeof row[0] === 'string' ? row[0] : '';
                const isHeaderRow = r === 2;
                const isWeeklyTotalRow = rowText === 'Total Hrs of this week';
                const isGrandTotalRow = rowText === 'Total Hours';

                // Header row
                if (isHeaderRow || isWeeklyTotalRow || isGrandTotalRow) {
                    currentStyle.fill = lightGrayFill;
                    currentStyle.font = { ...currentStyle.font, bold: true };
                    if (ws[getCellAddress(r,0)]) ws[getCellAddress(r,0)].s = { ...ws[getCellAddress(r,0)].s, alignment: centerAlign };
                }
                // Financial summary labels
                else if (r > grandTotals.length + 3 && c === 0 && rowText.match(/^[A-Z\s/$-]+$/)) {
                     if (ws[getCellAddress(r,0)]) ws[getCellAddress(r,0)].s = { ...ws[getCellAddress(r,0)].s, alignment: centerAlign };
                }

                ws[cellAddress].s = currentStyle;
            });
        });

        XLSX.utils.book_append_sheet(wb, ws, "Timesheet Report");
    
        const fileName = `Payroll_Timesheet_${format(period.from, 'yyyy-MM-dd')}_to_${format(period.to, 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const resultMetricsOnScreen: Array<{
        label: string;
        getValue: (result: PayrollResult) => string | number;
        isBold?: boolean;
    }> = [
        { label: "Rate/Check", getValue: (result) => formatCurrency(result.payRateCheck) + "/hr" },
        { label: "Rate/Others", getValue: (result) => formatCurrency(result.payRateOthers) + "/hr" },
        { label: "Others-ADJ $", getValue: (result) => formatCurrency(result.otherAdjustment) },
        {
            label: "Gross Check Amount",
            getValue: (result) => formatCurrency(result.grossCheckAmount),
            isBold: true,
        },
        {
            label: "Gross Other Amount",
            getValue: (result) => formatCurrency(result.grossOtherAmount),
            isBold: true,
        },
        {
            label: "New PTO Balance",
            getValue: (result) => `(${formatHours(result.newPtoBalance)})`
        },
    ];

    return (
        <div className="space-y-6">
            <div className="report-actions flex justify-between items-center">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex items-center gap-2">
                    {payrollId && (
                        <Button variant="outline" asChild>
                            <Link href={`/dashboard/payroll/run?id=${payrollId}`}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Link>
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleExportToExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </div>
            
            <div className="report-content-wrapper border rounded-lg p-6 bg-card text-card-foreground">
                <header className="report-header text-center mb-6">
                    <h1 className="text-2xl font-bold">{companyName}</h1>
                    <p className="text-lg text-muted-foreground">Payroll Report</p>
                    <p className="text-sm text-muted-foreground">Pay Period: {format(period.from, 'LLL dd, y')} - {format(period.to, 'LLL dd,y')}</p>
                </header>
                
                <Separator className="my-6" />

                {/* Payroll Inputs */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Payroll Inputs</h2>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table className="min-w-max">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                    {inputs.map((input) => (
                                        <TableHead key={input.employeeId} className="text-right">{input.name}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inputMetrics.map(metric => (
                                    <TableRow key={metric.key}>
                                        <TableCell className="font-medium">{metric.label}</TableCell>
                                        {inputs.map(input => (
                                            <TableCell key={input.employeeId} className="text-right tabular-nums">
                                                {metric.key === 'ptoUsed' 
                                                    ? `(${formatHours(input[metric.key])})`
                                                    : formatHours(input[metric.key])
                                                }
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <Separator className="my-6" />

                {/* Payroll Results */}
                 <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Payroll Results</h2>
                     <div className="overflow-x-auto border rounded-lg">
                        <Table className="min-w-max">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                    {results.map((result) => (
                                        <TableHead key={result.employeeId} className="text-right">{result.name}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resultMetricsOnScreen.map((metric) => (
                                    <TableRow key={metric.label}>
                                        <TableCell className={cn("font-medium", metric.isBold && "font-bold")}>{metric.label}</TableCell>
                                        {results.map((result) => (
                                            <TableCell key={result.employeeId} className={cn("text-right tabular-nums", { "font-semibold": metric.isBold })}>
                                                {metric.getValue(result)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <Separator className="my-6" />

                {/* Payroll Summary */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Payroll Summary</h2>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>GP</TableHead>
                                    <TableHead>EMPLOYER</TableHead>
                                    <TableHead>EMPLOYEE</TableHead>
                                    <TableHead>DED</TableHead>
                                    <TableHead>NET</TableHead>
                                    <TableHead>OTHERS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.totalNetPay)}</TableCell>
                                    <TableCell>{summaryData.employer || '-'}</TableCell>
                                    <TableCell>{summaryData.employee || '-'}</TableCell>
                                    <TableCell>{summaryData.deductions || '-'}</TableCell>
                                    <TableCell>{summaryData.netPay || '-'}</TableCell>
                                    <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.totalOtherPay)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
            
            {/* Individual Payslips Section */}
            <div className="payslip-section mt-8 printable-section">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center">
                            <Users className="mr-2 h-5 w-5"/> Individual Payslips
                        </h2>
                        <p className="text-muted-foreground">
                            A payslip for each employee included in this payroll run.
                        </p>
                    </div>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
                    {results.map(result => {
                        const input = inputs.find(i => i.employeeId === result.employeeId);
                        if (!input) return null;
                        const ytd = ytdData[result.employeeId] || { grossPay: 0 };
                        return (
                             <Payslip
                                key={result.employeeId}
                                companyName={companyName}
                                payPeriod={period}
                                result={result}
                                input={input}
                                ytdGrossPay={ytd.grossPay}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

export default function PayrollReportPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Report...</div>}>
            <PayrollReportContent />
        </React.Suspense>
    )
}
