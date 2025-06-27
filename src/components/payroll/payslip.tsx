'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import type { PayrollResult } from './payroll-calculation';
import { format } from 'date-fns';

interface PayslipProps {
    companyName: string;
    payPeriod: { from: Date; to: Date };
    result: PayrollResult;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatHours = (hours: number): string => {
    return `${hours.toFixed(2)} hrs`;
};

export function Payslip({ companyName, payPeriod, result }: PayslipProps) {
    const earnings = [
        { description: 'Regular Pay', hours: result.checkHours, rate: result.payRateCheck, total: result.checkHours * result.payRateCheck },
        { description: 'PTO Pay', hours: result.ptoUsed, rate: result.payRateCheck, total: result.ptoUsed * result.payRateCheck },
        { description: 'Other Pay', hours: result.otherHours, rate: result.payRateOthers, total: result.otherHours * result.payRateOthers },
        { description: 'Other Adjustments', hours: '-', rate: '-', total: result.otherAdjustment },
    ].filter(item => item.total !== 0);
    
    const grossPay = result.grossCheckAmount + result.grossOtherAmount;

    return (
        <Card className="payslip-card shadow-md break-inside-avoid border border-border">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl text-primary">{companyName}</CardTitle>
                        <CardDescription>Payslip</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{result.name}</p>
                        <p className="text-sm text-muted-foreground">Pay Period: {format(payPeriod.from, 'MM/dd/yy')} - {format(payPeriod.to, 'MM/dd/yy')}</p>
                        <p className="text-sm text-muted-foreground">Pay Date: {format(new Date(), 'MM/dd/yyyy')}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Separator />
                <h3 className="text-lg font-semibold my-4">Earnings</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {earnings.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right tabular-nums">{typeof item.hours === 'number' ? formatHours(item.hours) : item.hours}</TableCell>
                                <TableCell className="text-right tabular-nums">{typeof item.rate === 'number' ? formatCurrency(item.rate) : item.rate}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Separator className="my-4" />
                <h3 className="text-lg font-semibold my-4">Summary</h3>
                 <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Pay</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(grossPay)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Deductions</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(0)}</span>
                    </div>
                 </div>

            </CardContent>
            <CardFooter>
                 <div className="flex justify-between w-full p-4 bg-muted/50 rounded-lg">
                    <span className="text-lg font-bold">Net Pay</span>
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(grossPay)}</span>
                 </div>
            </CardFooter>
        </Card>
    )
}
