
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
import { Payslip } from '@/components/payroll/payslip';


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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-96 w-full" />
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

    const companyName = "My Small Business"; // Placeholder for company name from settings

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
            
             <header className="report-header">
                <div className="hidden print:block text-center mb-4">
                   <h2 className="text-2xl font-bold">{companyName}</h2>
                   <p className="text-lg text-muted-foreground">Payroll Report</p>
                   <p className="text-sm text-muted-foreground">Pay Period: {format(period.from, 'LLL dd, y')} - {format(period.to, 'LLL dd,y')}</p>
                </div>
                 <div className="print:hidden">
                   <h1 className="text-3xl font-bold">Payroll Report</h1>
                   <p className="text-muted-foreground">
                       Pay Period: {format(period.from, 'LLL dd, y')} - {format(period.to, 'LLL dd, y')}
                   </p>
                </div>
             </header>
            
            <Separator />

            <div className="payslips-container grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {results.map((result) => {
                    const employeeInput = inputs.find(i => i.employeeId === result.employeeId);
                    if (!employeeInput) return null;
                    
                    return (
                        <Payslip 
                            key={result.employeeId}
                            companyName={companyName}
                            payPeriod={period}
                            result={result}
                            input={employeeInput}
                        />
                    );
                })}
            </div>
        </div>
    );
}
