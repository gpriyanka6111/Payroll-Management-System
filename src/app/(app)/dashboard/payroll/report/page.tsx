
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PayrollResult, EmployeePayrollInput } from '@/components/payroll/payroll-calculation';
import { Payslip } from '@/components/payroll/payslip';
import { format } from 'date-fns';
import { Printer, ArrowLeft, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

function PayrollReportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [results, setResults] = React.useState<PayrollResult[]>([]);
    const [inputs, setInputs] = React.useState<EmployeePayrollInput[]>([]);
    const [period, setPeriod] = React.useState<{ from: Date; to: Date } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const payrollId = searchParams.get('id');

        const loadPayrollData = async () => {
            setIsLoading(true);
            if (payrollId) {
                if (!user) {
                    // Waiting for auth context to load user
                    return;
                }
                try {
                    const payrollDocRef = doc(db, 'users', user.uid, 'payrolls', payrollId);
                    const payrollSnap = await getDoc(payrollDocRef);
                    if (payrollSnap.exists()) {
                        const payrollData = payrollSnap.data();
                        const [fromY, fromM, fromD] = payrollData.fromDate.split('-').map(Number);
                        const [toY, toM, toD] = payrollData.toDate.split('-').map(Number);

                        setResults(payrollData.results);
                        setInputs(payrollData.inputs);
                        setPeriod({
                            from: new Date(fromY, fromM - 1, fromD),
                            to: new Date(toY, toM - 1, toD),
                        });
                    } else {
                        console.error("Payroll document not found.");
                        router.replace('/dashboard/payroll');
                    }
                } catch (error) {
                    console.error("Error fetching payroll data:", error);
                    router.replace('/dashboard/payroll');
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Fallback to sessionStorage for the "run new payroll" flow
                const resultsData = sessionStorage.getItem('payrollResultsData');
                const periodData = sessionStorage.getItem('payrollPeriodData');
                const inputData = sessionStorage.getItem('payrollInputData');

                if (resultsData && periodData && inputData) {
                    const parsedPeriod = JSON.parse(periodData);
                    setResults(JSON.parse(resultsData));
                    setInputs(JSON.parse(inputData));
                    setPeriod({
                        from: new Date(parsedPeriod.from),
                        to: new Date(parsedPeriod.to),
                    });
                     // Clear session storage after loading to prevent stale data on back navigation
                    sessionStorage.removeItem('payrollResultsData');
                    sessionStorage.removeItem('payrollPeriodData');
                    sessionStorage.removeItem('payrollInputData');
                } else {
                    router.replace('/dashboard/payroll/run');
                }
                 setIsLoading(false);
            }
        };

        loadPayrollData();
    }, [router, searchParams, user]);
    
    const handlePrint = () => {
        window.print();
    };
    
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

    const companyName = "My Small Business"; // Placeholder

    const inputMetrics = [
        { key: 'totalHoursWorked', label: 'Total Hours Worked' },
        { key: 'checkHours', label: 'Check Hours' },
        { key: 'otherHours', label: 'Other Hours' },
        { key: 'ptoUsed', label: 'PTO Used' },
    ] as const;

    const totals = {
        grossCheckAmount: results.reduce((sum, r) => sum + r.grossCheckAmount, 0),
        grossOtherAmount: results.reduce((sum, r) => sum + r.grossOtherAmount, 0),
        netPay: results.reduce((sum, r) => sum + r.netPay, 0),
    };

    const resultMetrics: Array<{
        label: string;
        getValue: (result: PayrollResult) => string | number;
        getTotal?: () => string | number;
        isBold?: boolean;
    }> = [
        { label: "Rate/Check", getValue: (result) => formatCurrency(result.payRateCheck) + "/hr" },
        { label: "Rate/Others", getValue: (result) => formatCurrency(result.payRateOthers) + "/hr" },
        { label: "Others-ADJ $", getValue: (result) => formatCurrency(result.otherAdjustment) },
        {
            label: "Gross Check Amount",
            getValue: (result) => formatCurrency(result.grossCheckAmount),
            getTotal: () => formatCurrency(totals.grossCheckAmount),
            isBold: true,
        },
        {
            label: "Gross Other Amount",
            getValue: (result) => formatCurrency(result.grossOtherAmount),
            getTotal: () => formatCurrency(totals.grossOtherAmount),
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
                 <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
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
                                        <TableHead key={input.employeeId}>{input.name}</TableHead>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                    {results.map((result) => (
                                        <TableHead key={result.employeeId} className="text-right">{result.name}</TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold">Totals</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resultMetrics.map((metric) => (
                                    <TableRow key={metric.label}>
                                        <TableCell className={cn("font-medium", metric.isBold && "font-bold")}>{metric.label}</TableCell>
                                        {results.map((result) => (
                                            <TableCell key={result.employeeId} className={cn("text-right tabular-nums", { "font-semibold": metric.isBold })}>
                                                {metric.getValue(result)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold tabular-nums">
                                            {metric.getTotal ? metric.getTotal() : ''}
                                        </TableCell>
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
                                    <TableHead>EMPLOYEE</TableHead>
                                    <TableHead>DED:</TableHead>
                                    <TableHead>NET</TableHead>
                                    <TableHead>Others</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.grossCheckAmount)}</TableCell>
                                    <TableCell className="text-muted-foreground">--</TableCell>
                                    <TableCell className="text-muted-foreground">--</TableCell>
                                    <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.netPay)}</TableCell>
                                    <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.grossOtherAmount)}</TableCell>
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
                        return (
                             <Payslip
                                key={result.employeeId}
                                companyName={companyName}
                                payPeriod={period}
                                result={result}
                                input={input}
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
