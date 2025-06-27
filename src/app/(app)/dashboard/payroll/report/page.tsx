
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PayrollResult, EmployeePayrollInput } from '@/components/payroll/payroll-calculation';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$ --.--';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatHours = (hours: number): string => {
    if (typeof hours !== 'number' || isNaN(hours)) {
        return '-- hrs';
    }
    return `${hours.toFixed(1)} hrs`;
};

export default function PayrollReportPage() {
    const router = useRouter();
    const [results, setResults] = React.useState<PayrollResult[]>([]);
    const [inputs, setInputs] = React.useState<EmployeePayrollInput[]>([]);
    const [period, setPeriod] = React.useState<{ from: Date; to: Date } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const resultsData = sessionStorage.getItem('payrollResultsData');
        const periodData = sessionStorage.getItem('payrollPeriodData');
        const inputData = sessionStorage.getItem('payrollInputData');

        if (resultsData && periodData && inputData) {
            // Must parse dates manually after JSON.parse
            const parsedPeriod = JSON.parse(periodData);
            setResults(JSON.parse(resultsData));
            setInputs(JSON.parse(inputData));
            setPeriod({
                from: new Date(parsedPeriod.from),
                to: new Date(parsedPeriod.to),
            });
        } else {
            // Handle case where data is missing (e.g., direct navigation)
            router.replace('/dashboard/payroll/run');
        }
        setIsLoading(false);
    }, [router]);
    
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
                <p>No payroll data found.</p>
                <Button onClick={() => router.push('/dashboard/payroll/run')}>Start a new payroll run</Button>
            </div>
        )
    }

    const companyName = "My Small Business"; // Placeholder

    const inputMetrics = [
        { key: 'totalHoursWorked', label: 'Total Hours Worked' },
        { key: 'checkHours', label: 'Check Hours' },
        { key: 'otherHours', label: 'Other Hours' },
        { key: 'ptoUsed', label: 'PTO Used (hrs)' },
    ] as const;

    const totals = {
        grossCheckAmount: results.reduce((sum, r) => sum + r.grossCheckAmount, 0),
        grossOtherAmount: results.reduce((sum, r) => sum + r.grossOtherAmount, 0),
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
            getValue: (result) => formatHours(result.newPtoBalance)
        },
    ];

    return (
        <div className="payroll-report-page p-6 space-y-6">
            <div className="report-actions flex justify-between items-center">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Calculation
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
                                                {formatHours(input[metric.key])}
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
                                    <TableCell><Input placeholder="Enter value..." className="print:border print:border-gray-400" /></TableCell>
                                    <TableCell><Input placeholder="Enter value..." className="print:border print:border-gray-400" /></TableCell>
                                    <TableCell><Input placeholder="Enter value..." className="print:border print:border-gray-400" /></TableCell>
                                    <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.grossOtherAmount)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
        </div>
    );
}
