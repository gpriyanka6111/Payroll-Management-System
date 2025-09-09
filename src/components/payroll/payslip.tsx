
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import type { PayrollResult, EmployeePayrollInput } from './payroll-calculation';
import { format } from 'date-fns';

interface PayslipProps {
    companyName: string;
    payPeriod: { from: Date; to: Date };
    result: PayrollResult;
    input: EmployeePayrollInput;
    ytdGrossPay: number;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$ --.--';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatHours = (hours: number): string => {
    if (typeof hours !== 'number' || isNaN(hours)) {
        return '--';
    }
    return hours.toFixed(2);
};

export function Payslip({ companyName, payPeriod, result, input, ytdGrossPay }: PayslipProps) {
    const ptoHours = result.vdHoursUsed + result.hdHoursUsed + result.sdHoursUsed;
    
    const earnings = [
        { description: 'Regular Pay', hours: result.checkHours, rate: result.payRateCheck, total: result.checkHours * result.payRateCheck },
        { description: 'Leave Pay (VD/HD/SD)', hours: ptoHours, rate: result.payRateCheck, total: ptoHours * result.payRateCheck },
        { description: 'Other Pay', hours: result.otherHours, rate: result.payRateOthers, total: result.otherHours * result.payRateOthers },
        { description: 'Other Adjustments', hours: '-', rate: '-', total: result.otherAdjustment },
    ].filter(item => item.total !== 0 || item.description === 'Other Adjustments' && item.total !== 0);
    
    const currentGrossPay = result.grossCheckAmount + result.grossOtherAmount;
    const totalYtdGross = ytdGrossPay + currentGrossPay;

    return (
        <Card className="payslip-card shadow-md break-inside-avoid border border-border print:shadow-none print:border-gray-300">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl text-primary">{result.name}</CardTitle>
                        <CardDescription>{companyName} Payslip</CardDescription>
                    </div>
                    <div className="text-right text-xs">
                        <p className="font-semibold">Pay Period:</p>
                        <p className="text-muted-foreground">{format(payPeriod.from, 'MM/dd/yy')} - {format(payPeriod.to, 'MM/dd/yy')}</p>
                        <p className="font-semibold mt-1">Pay Date:</p>
                        <p className="text-muted-foreground">{format(new Date(), 'MM/dd/yyyy')}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                     <h3 className="text-base font-semibold mb-2">Hours Summary (hrs)</h3>
                     <div className="grid grid-cols-4 gap-2 text-center border rounded-md p-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-medium tabular-nums">{formatHours(result.totalHoursWorked)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Check</p>
                            <p className="font-medium tabular-nums">{formatHours(result.checkHours)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Other</p>
                            <p className="font-medium tabular-nums">{formatHours(result.otherHours)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Leave</p>
                            <p className="font-medium tabular-nums">{formatHours(ptoHours)}</p>
                        </div>
                    </div>
                </div>
                
                <Separator />
                
                <div>
                    <h3 className="text-base font-semibold mb-2">Earnings</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Current</TableHead>
                                <TableHead className="text-right">YTD</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {earnings.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatCurrency(item.total)}</TableCell>
                                    <TableCell className="text-right tabular-nums">-</TableCell>
                                </TableRow>
                            ))}
                             <TableRow className="font-semibold">
                                <TableCell>Gross Pay</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(currentGrossPay)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(totalYtdGross)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <Separator/>

                 <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Deductions</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(0)}</span>
                    </div>
                 </div>

            </CardContent>
            <CardFooter>
                 <div className="flex justify-between w-full p-3 bg-muted/50 rounded-lg">
                    <span className="text-lg font-bold">Gross Pay</span>
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(currentGrossPay)}</span>
                 </div>
            </CardFooter>
        </Card>
    )
}
