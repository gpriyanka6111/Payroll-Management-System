

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PayrollResult, EmployeePayrollInput } from '@/components/payroll/payroll-calculation';
import { Payslip } from '@/components/payroll/payslip';
import { format, startOfYear, eachDayOfInterval, isSameDay, getDay, isValid, parseISO, parse } from 'date-fns';
import { ArrowLeft, Users, Pencil, FileSpreadsheet } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { doc, getDoc, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import * as XLSX from 'xlsx-js-style';
import { getPayDateForPeriod } from '@/lib/pay-period';


const formatCurrency = (amount: unknown) => {
    const num = Number(amount);
    if (isNaN(num)) {
        return '$ --.--';
    }
    // Using 'en-IN' locale adds a space after the currency symbol, then we replace rupee with dollar.
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD' }).format(num).replace('₹', '$ ');
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

interface TimeEntry {
    timeIn: Timestamp;
    timeOut: Timestamp | null;
}

interface DailyEntries {
    date: Date;
    totalHours: number;
    entries: TimeEntry[];
}

interface EmployeeTimeData {
    [employeeId: string]: DailyEntries[];
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
                    router.replace('/dashboard/manager/payroll');
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
                        router.replace('/dashboard/manager/payroll/run');
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
                     router.replace('/dashboard/manager/payroll/run');
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
                <Button onClick={() => router.push('/dashboard/manager/payroll/run')}>Start a new payroll run</Button>
            </div>
        )
    }

    const inputMetrics = [
        { key: 'totalHoursWorked', label: 'TOTAL HOURS WORKED' },
        { key: 'checkHours', label: 'CHECK HOURS' },
        { key: 'otherHours', label: 'OTHER HOURS' },
        { key: 'vdHoursUsed', label: 'VD HOURS' },
        { key: 'hdHoursUsed', label: 'HD HOURS' },
        { key: 'sdHoursUsed', label: 'SD HOURS' },
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
        const employeeTimeData: EmployeeTimeData = {};
    
        for (const input of inputs) {
            employeeTimeData[input.employeeId] = [];
            const timeEntriesRef = collection(db, 'users', user.uid, 'employees', input.employeeId, 'timeEntries');
            const q = query(
                timeEntriesRef,
                where('timeIn', '>=', period.from),
                where('timeIn', '<=', toDateEnd)
            );
            const snapshot = await getDocs(q);
            const dailyData: { [key: string]: { totalMinutes: number, entries: TimeEntry[] } } = {};
            
            snapshot.forEach(doc => {
                const entry = doc.data();
                const dateKey = format(entry.timeIn.toDate(), 'yyyy-MM-dd');
                if (!dailyData[dateKey]) {
                    dailyData[dateKey] = { totalMinutes: 0, entries: [] };
                }

                if (entry.timeOut) {
                    const minutes = Math.round((entry.timeOut.toDate().getTime() - entry.timeIn.toDate().getTime()) / 60000);
                    dailyData[dateKey].totalMinutes += minutes > 0 ? minutes : 0;
                }
                 dailyData[dateKey].entries.push({ timeIn: entry.timeIn, timeOut: entry.timeOut });
            });
    
            for (const dateKey in dailyData) {
                 const dateWithTimezone = parseISO(dateKey + 'T12:00:00');
                 if(isValid(dateWithTimezone)) {
                    employeeTimeData[input.employeeId].push({
                        date: dateWithTimezone,
                        totalHours: dailyData[dateKey].totalMinutes / 60,
                        entries: dailyData[dateKey].entries
                    });
                 }
            }
        }
    
        const wb = XLSX.utils.book_new();
        const ws_data: (string | number | null)[][] = [];
        
        const payDate = getPayDateForPeriod(period.from);
        const payDateStr = payDate ? `Pay Date: ${format(payDate, 'LLL dd, yyyy')}` : '';
        const title = `${companyName} - Pay Period: ${format(period.from, 'LLL dd, yyyy')} - ${format(period.to, 'LLL dd, yyyy')} - ${payDateStr}`;

        ws_data.push([title]);
        ws_data.push(['Date', 'Metric', ...inputs.map(i => i.name.toUpperCase())]);
        let currentRow = 2; // Start after header
    
        const daysInPeriod = eachDayOfInterval({ start: period.from, end: period.to });
    
        daysInPeriod.forEach((day) => {
            const dayOfWeek = getDay(day);
            if (isSundayClosed && dayOfWeek === 0) return;

            const dateStr = format(day, 'eee, MMM dd');

            const inRow: (string | number)[] = [dateStr, 'In:'];
            const outRow: (string | number)[] = ['', 'Out:'];
            const totalRow: (string | number)[] = ['', 'Total:'];

            inputs.forEach(input => {
                const dayData = employeeTimeData[input.employeeId]?.find(d => isSameDay(d.date, day));
                
                let inValue: string = '-';
                let outValue: string = '-';
                let totalValue: string | number = '-';

                if (dayData) {
                    if (dayData.entries.length > 1) {
                        inValue = 'Multiple';
                        outValue = 'Multiple';
                    } else if (dayData.entries.length === 1) {
                        const entry = dayData.entries[0];
                        inValue = entry.timeIn ? format(entry.timeIn.toDate(), 'p') : '-';
                        outValue = entry.timeOut ? format(entry.timeOut.toDate(), 'p') : (entry.timeIn ? 'ACTIVE' : '-');
                    }
                    totalValue = dayData.totalHours > 0 ? parseFloat(dayData.totalHours.toFixed(2)) : '-';
                }
                
                inRow.push(inValue);
                outRow.push(outValue);
                totalRow.push(totalValue);
            });
            ws_data.push(inRow, outRow, totalRow);
            currentRow += 3;
        });

        const employeeTotals = inputs.map(input => {
            return (employeeTimeData[input.employeeId] || []).reduce((sum, day) => sum + day.totalHours, 0);
        });
        const grandTotalRow: (string | number | null)[] = ['Total Hours', null, ...employeeTotals.map(t => t > 0 ? parseFloat(t.toFixed(2)) : '')];
        ws_data.push(grandTotalRow);
        
        const summaryMetrics: { label: string; key: keyof EmployeePayrollInput | keyof PayrollResult; type: 'input' | 'result'; format?: 'currency' | 'hours'; isBold?: boolean }[] = [
            { label: 'COMMENTS', key: 'comment', type: 'input', isBold: true },
            { label: 'CHECK HOURS', key: 'checkHours', type: 'input', format: 'hours', isBold: true },
            { label: 'OTHER HOURS', key: 'otherHours', type: 'input', format: 'hours', isBold: true },
            { label: 'RATE/CHECK', key: 'payRateCheck', type: 'result', format: 'currency', isBold: true },
            { label: 'RATE/OTHERS', key: 'payRateOthers', type: 'result', format: 'currency', isBold: true },
            { label: 'OTHER-ADJ$', key: 'otherAdjustment', type: 'result', format: 'currency', isBold: true },
        ];
        
        summaryMetrics.forEach(metric => {
            const row: (string | number | null)[] = [metric.label, null];
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
        });
        
        ws_data.push([null, null, ...inputs.map(i => i.name.toUpperCase())]);

        const grossMetrics = [
            { label: 'GROSS CHECK AMOUNT', key: 'grossCheckAmount' },
            { label: 'GROSS OTHER AMOUNT', key: 'grossOtherAmount' },
        ];

        grossMetrics.forEach(metric => {
            const row: (string | number | null)[] = [metric.label, null];
            results.forEach(result => {
                const rawValue = (result as any)[metric.key];
                row.push(typeof rawValue === 'number' ? formatCurrency(rawValue) : '');
            });
            ws_data.push(row);
        });
        
        ws_data.push(['GP', 'EMPLOYER', 'EMPLOYEE', 'DED', 'NET', 'OTHERS']);
        ws_data.push([
            formatCurrency(totals.totalNetPay),
            summaryData.employer || '',
            summaryData.employee || '',
            summaryData.deductions || '',
            summaryData.netPay || '',
            formatCurrency(totals.totalOtherPay)
        ]);
        
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 + inputs.length -1 } }];
        for (let i = 2; i < ws_data.length; i += 3) {
             const firstCell = ws_data[i]?.[0];
             if (typeof firstCell === 'string' && firstCell.match(/^[A-Za-z]{3}, [A-Za-z]{3} \d{2}$/)) {
                 merges.push({ s: { r: i, c: 0 }, e: { r: i + 2, c: 0 } });
             } else {
                 break; 
             }
        }
        ws_data.forEach((row, r) => {
            if (['Total Hours', ...summaryMetrics.map(m => m.label), ...grossMetrics.map(m => m.label)].includes(row[0] as string)) {
                merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
            }
        });
        ws['!merges'] = merges;
        
        const thickBorderStyle = { 
            border: { top: { style: "thick" }, bottom: { style: "thick" }, left: { style: "thick" }, right: { style: "thick" } }
        };

        const blueFill = { fill: { fgColor: { rgb: "ADD8E6" } } }; // Light Blue
        const yellowFill = { fill: { fgColor: { rgb: "FFFF00" } } }; // Yellow
        const redFill = { fill: { fgColor: { rgb: "FFC7CE" } } }; // Light Red
        
        const boldFont = { font: { bold: true } };

        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if (!ws[cell_ref]) ws[cell_ref] = { t: 's', v: '' };
                const cell = ws[cell_ref];
                let currentStyle = cell.s || {};

                if (R === 0) {
                    currentStyle = {
                        ...currentStyle,
                        font: { bold: true, sz: 14 },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        ...thickBorderStyle
                    };
                } else if (R === 1) {
                     currentStyle = { ...currentStyle, ...thickBorderStyle, font: { ...(currentStyle.font || {}), bold: true } };
                }

                const secondCellValue = ws[XLSX.utils.encode_cell({c:1, r:R})]?.v;
                if (typeof secondCellValue === 'string') {
                    if (secondCellValue === 'Total:') {
                        for (let c = 0; c <= range.e.c; c++) {
                            const totalCellRef = XLSX.utils.encode_cell({c, r: R});
                            if (!ws[totalCellRef]) ws[totalCellRef] = { t: 's', v: ''};
                            ws[totalCellRef].s = { ...(ws[totalCellRef].s || {}), ...thickBorderStyle, font: { ...(ws[totalCellRef].s?.font || {}), bold: true } };
                        }
                    } else if (C === 1 && (secondCellValue === 'In:' || secondCellValue === 'Out:')) {
                        currentStyle = { ...currentStyle, ...thickBorderStyle };
                    }
                }

                if (C > 1 && secondCellValue && (secondCellValue === 'In:' || secondCellValue === 'Out:')) {
                     currentStyle.border = { ...(currentStyle.border || {}), right: { style: "thick" } };
                }
                
                const rowLabel = ws_data[R]?.[0] as string;
                if (rowLabel === 'Total Hours') {
                    currentStyle = { ...currentStyle, ...blueFill };
                } else if (rowLabel === 'GROSS CHECK AMOUNT') {
                    currentStyle = { ...currentStyle, ...yellowFill };
                } else if (rowLabel === 'GROSS OTHER AMOUNT') {
                    currentStyle = { ...currentStyle, ...redFill };
                }

                if (summaryMetrics.some(m => m.label === rowLabel && m.isBold)) {
                    const firstCellRef = XLSX.utils.encode_cell({ c: 0, r: R });
                    if (ws[firstCellRef]) {
                        ws[firstCellRef].s = { ...(ws[firstCellRef].s || {}), font: { ...(ws[firstCellRef].s?.font || {}), bold: true } };
                    }
                }
                
                const summaryRowLabels = new Set([
                    'Total Hours', 'COMMENTS', 'CHECK HOURS', 'OTHER HOURS', 'RATE/CHECK', 
                    'RATE/OTHERS', 'OTHER-ADJ$', 'GROSS CHECK AMOUNT', 'GROSS OTHER AMOUNT', 'GP'
                ]);

                if (summaryRowLabels.has(rowLabel)) {
                     for(let i = 0; i <= range.e.c; i++){
                        const targetCellRef = XLSX.utils.encode_cell({c: i, r: R});
                        if (!ws[targetCellRef]) ws[targetCellRef] = { t: 's', v: '' };
                        const existingStyle = ws[targetCellRef].s || {};
                        ws[targetCellRef].s = { ...existingStyle, ...thickBorderStyle };
                     }
                }
                
                const lastDataRowLabel = ws_data[ws_data.length - 2]?.[0];
                if(lastDataRowLabel === 'GP' && R === ws_data.length - 1){
                     for(let i = 0; i <= range.e.c; i++){
                        const targetCellRef = XLSX.utils.encode_cell({c: i, r: R});
                        if (!ws[targetCellRef]) ws[targetCellRef] = { t: 's', v: '' };
                        ws[targetCellRef].s = { ...(ws[targetCellRef].s || {}), ...thickBorderStyle };
                     }
                }

                if (R === ws_data.length - 4 && C > 1) { // Employee name row in summary
                     currentStyle = { ...currentStyle, font: { ...(currentStyle.font || {}), bold: true } };
                }
                
                cell.s = currentStyle;
            }
        }
        
        const rowsToHeighten = new Set([
            'Total Hours', 'COMMENTS', 'CHECK HOURS', 'OTHER HOURS', 'RATE/CHECK', 'RATE/OTHERS', 'OTHER-ADJ$',
            'GROSS CHECK AMOUNT', 'GROSS OTHER AMOUNT', 'GP'
        ]);
        
        const wsRows = ws_data.map((row, index) => {
            if (index === 0) return { hpt: 30 };
            const firstCell = row[0];
            const isEmployeeNameRow = index === ws_data.length - 4 && row[2]; 

            if ((typeof firstCell === 'string' && rowsToHeighten.has(firstCell)) || isEmployeeNameRow) {
                return { hpt: 25 };
            }
            if(index === ws_data.length - 1){
                 return { hpt: 25 };
            }
            return {};
        });

        ws['!rows'] = wsRows;
        ws['!cols'] = [{ wch: 15 }, { wch: 8 }, ...Array(inputs.length).fill({ wch: 15 })];

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
        { label: "New VD Balance", getValue: (result) => `(${formatHours(result.newVacationBalance)})` },
        { label: "New HD Balance", getValue: (result) => `(${formatHours(result.newHolidayBalance)})` },
        { label: "New SD Balance", getValue: (result) => `(${formatHours(result.newSickDayBalance)})` },
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
                            <Link href={`/dashboard/manager/payroll/run?id=${payrollId}`}>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                    {inputs.map((input) => (
                                        <TableHead key={input.employeeId} className="text-right min-w-[150px]">{input.name}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inputMetrics.map(metric => (
                                    <TableRow key={metric.key}>
                                        <TableCell className="font-medium">{metric.label}</TableCell>
                                        {inputs.map(input => (
                                            <TableCell key={input.employeeId} className="text-right tabular-nums">
                                                {metric.key.toLowerCase().includes('hours') 
                                                    ? formatHours((input as any)[metric.key])
                                                    : (input as any)[metric.key]
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                    {results.map((result) => (
                                        <TableHead key={result.employeeId} className="text-right min-w-[150px]">{result.name}</TableHead>
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
                                    <TableCell>{summaryData.employer || ''}</TableCell>
                                    <TableCell>{summaryData.employee || ''}</TableCell>
                                    <TableCell>{summaryData.deductions || ''}</TableCell>
                                    <TableCell>{summaryData.netPay || ''}</TableCell>
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
