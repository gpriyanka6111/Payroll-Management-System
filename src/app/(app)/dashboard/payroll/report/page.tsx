'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PayrollResult } from '@/components/payroll/payroll-calculation';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function PayrollReportPage() {
    const router = useRouter();
    const [results, setResults] = React.useState<PayrollResult[]>([]);
    const [period, setPeriod] = React.useState<{ from: Date; to: Date } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const resultsData = sessionStorage.getItem('payrollResultsData');
        const periodData = sessionStorage.getItem('payrollPeriodData');

        if (resultsData && periodData) {
            // Must parse dates manually after JSON.parse
            const parsedPeriod = JSON.parse(periodData);
            setResults(JSON.parse(resultsData));
            setPeriod({
                from: new Date(parsedPeriod.from),
                to: new Date(parsedPeriod.to),
            });
        } else {
            // Handle case where data is missing (e.g., direct navigation)
            // Redirect back or show an error message.
            router.replace('/dashboard/payroll/run');
        }
        setIsLoading(false);
    }, [router]);
    
    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: number) => {
       if (typeof amount !== 'number' || isNaN(amount)) {
          return '$ ---.--';
       }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatHours = (hours: unknown): string => {
        const numHours = Number(hours);
        if (hours === undefined || hours === null || isNaN(numHours)) {
            return 'N/A';
        }
        return `${numHours.toFixed(1)} hrs`;
    };

    if (isLoading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
             </div>
        )
    }

    if (!period || results.length === 0) {
        return (
            <div className="text-center py-10">
                <p>No payroll data found.</p>
                <Button onClick={() => router.push('/dashboard/payroll/run')}>Start a new payroll run</Button>
            </div>
        )
    }

    const totals = {
        grossCheckAmount: results.reduce((sum, r) => sum + r.grossCheckAmount, 0),
        grossOtherAmount: results.reduce((sum, r) => sum + r.grossOtherAmount, 0),
        otherAdjustment: results.reduce((sum, r) => sum + r.otherAdjustment, 0),
    };

    const metrics: Array<{
        label: string;
        getValue: (result: PayrollResult) => string | number;
        getTotal?: () => string | number;
        isBold?: boolean;
        isDestructive?: boolean;
        type?: 'separator';
    }> = [
        { label: "Total Hours", getValue: (result) => formatHours(result.totalHoursWorked) },
        { label: "Check Hours", getValue: (result) => formatHours(result.checkHours) },
        { label: "Other Hours", getValue: (result) => formatHours(result.otherHours) },
        { label: "PTO Time", getValue: (result) => formatHours(result.ptoUsed) },
        { type: 'separator', label: '', getValue: () => '' },
        { label: "Rate/Check", getValue: (result) => formatCurrency(result.payRateCheck) + "/hr" },
        { label: "Rate/Others", getValue: (result) => formatCurrency(result.payRateOthers) + "/hr" },
        { label: "Others-ADJ $", getValue: (result) => formatCurrency(result.otherAdjustment), getTotal: () => formatCurrency(totals.otherAdjustment) },
        { type: 'separator', label: '', getValue: () => '' },
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
        { type: 'separator', label: '', getValue: () => '' },
        {
            label: "New PTO Balance",
             getValue: (result) => `${formatHours(result.newPtoBalance)}`
        },
    ];

    return (
        <div className="payroll-report-page space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Calculation
                </Button>
                 <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
            </div>
            
            <Card className="payroll-report-card">
                 <CardHeader className="print:text-center print:p-4">
                    <div className="hidden print:block mb-4">
                       <h2 className="text-xl font-bold">My Small Business</h2>
                       <p className="text-sm text-muted-foreground">Pay Period: {format(period.from, 'LLL dd, y')} - {format(period.to, 'LLL dd,y')}</p>
                    </div>
                     <div className="print:hidden">
                       <CardTitle>Payroll Report</CardTitle>
                       <CardDescription>
                           Pay Period: {format(period.from, 'LLL dd, y')} - {format(period.to, 'LLL dd, y')}
                       </CardDescription>
                    </div>
               </CardHeader>
               <CardContent className="print:pt-0">
                  <div className="overflow-x-auto">
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
                          {metrics.map((metric, index) => {
                              if (metric.type === 'separator') {
                                  return (
                                      <TableRow key={`sep-${index}`} className="bg-muted/20 hover:bg-muted/20">
                                          <TableCell colSpan={results.length + 2} className="h-2 p-0"></TableCell>
                                      </TableRow>
                                  );
                              }
                              return (
                                  <TableRow key={metric.label}>
                                     <TableCell className={cn("font-medium", metric.isBold && "font-bold")}>{metric.label}</TableCell>
                                     {results.map((result) => (
                                         <TableCell key={result.employeeId} className={cn("text-right tabular-nums", {
                                             "font-semibold": metric.isBold,
                                             "text-destructive": metric.isDestructive,
                                         })}>
                                             {metric.getValue(result)}
                                         </TableCell>
                                     ))}
                                     <TableCell className={cn("text-right font-bold tabular-nums", {
                                          "text-destructive": metric.isDestructive,
                                     })}>
                                         {metric.getTotal ? metric.getTotal() : ''}
                                     </TableCell>
                                  </TableRow>
                              );
                          })}
                      </TableBody>
                   </Table>
                   </div>

                  <Separator className="my-6" />
                  <h3 className="text-xl font-semibold mb-4 print:hidden">Payroll Summary</h3>
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
                                  <TableCell><Input placeholder="Enter value..." /></TableCell>
                                  <TableCell><Input placeholder="Enter value..." /></TableCell>
                                  <TableCell><Input placeholder="Enter value..." /></TableCell>
                                  <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.grossOtherAmount)}</TableCell>
                              </TableRow>
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
           </Card>
        </div>
    );
}
