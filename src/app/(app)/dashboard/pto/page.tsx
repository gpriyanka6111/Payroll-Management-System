"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import { format, startOfYear } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PayPeriodEarning {
    period: string; // "MM/dd/yy - MM/dd/yy"
    grossPay: number;
    grossCheckAmount: number;
    grossOtherAmount: number;
}

interface YtdEarningsRecord {
    employeeId: string;
    employeeName: string;
    totalGrossPay: number;
    totalGrossCheckAmount: number;
    totalGrossOtherAmount: number;
    payPeriods: PayPeriodEarning[];
}

export default function YtdSummaryPage() {
  const { user } = useAuth();
  const [ytdEarnings, setYtdEarnings] = React.useState<YtdEarningsRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState({ from: '', to: '' });

  React.useEffect(() => {
    const today = new Date();
    const yearStart = startOfYear(today);
    setDateRange({
        from: format(yearStart, "MMMM d, yyyy"),
        to: format(today, "MMMM d, yyyy")
    });
  }, []);

  React.useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const employeesQuery = query(employeesCollectionRef, orderBy('firstName', 'asc'));
      const employeeSnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));

      const yearStart = startOfYear(new Date());
      const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
      const payrollsQuery = query(
        payrollsCollectionRef, 
        where('toDate', '>=', format(yearStart, 'yyyy-MM-dd')),
        orderBy('toDate', 'asc')
      );
      const payrollSnapshot = await getDocs(payrollsQuery);
      const payrollsData: Payroll[] = payrollSnapshot.docs.map(doc => doc.data() as Payroll);
      
      const ytdTotals: { [employeeId: string]: YtdEarningsRecord } = {};

      employeesData.forEach(emp => {
          ytdTotals[emp.id] = {
              employeeId: emp.id,
              employeeName: `${emp.firstName}`,
              totalGrossPay: 0,
              totalGrossCheckAmount: 0,
              totalGrossOtherAmount: 0,
              payPeriods: []
          };
      });

      payrollsData.forEach(payroll => {
        payroll.results.forEach((result: any) => {
          if (ytdTotals[result.employeeId]) {
              const grossCheck = result.grossCheckAmount || 0;
              const grossOther = result.grossOtherAmount || 0;
              const gross = grossCheck + grossOther;

              ytdTotals[result.employeeId].totalGrossPay += gross;
              ytdTotals[result.employeeId].totalGrossCheckAmount += grossCheck;
              ytdTotals[result.employeeId].totalGrossOtherAmount += grossOther;
              
              const [fromY, fromM, fromD] = payroll.fromDate.split('-').map(Number);
              const [toY, toM, toD] = payroll.toDate.split('-').map(Number);
              const fromDate = new Date(fromY, fromM - 1, fromD);
              const toDate = new Date(toY, toM - 1, toD);

              ytdTotals[result.employeeId].payPeriods.push({
                  period: `${format(fromDate, 'MM/dd/yy')} - ${format(toDate, 'MM/dd/yy')}`,
                  grossPay: gross,
                  grossCheckAmount: grossCheck,
                  grossOtherAmount: grossOther,
              });
          }
        });
      });
      
      setYtdEarnings(Object.values(ytdTotals));
      setIsLoading(false);
    };

    fetchAllData().catch(console.error);

  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const totalYtdGrossPay = React.useMemo(() => {
    return ytdEarnings.reduce((sum, employee) => sum + employee.totalGrossPay, 0);
  }, [ytdEarnings]);
  const totalYtdGrossCheck = React.useMemo(() => {
    return ytdEarnings.reduce((sum, employee) => sum + employee.totalGrossCheckAmount, 0);
  }, [ytdEarnings]);
    const totalYtdGrossOther = React.useMemo(() => {
    return ytdEarnings.reduce((sum, employee) => sum + employee.totalGrossOtherAmount, 0);
  }, [ytdEarnings]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Year-to-Date Summary</h1>
        <p className="text-muted-foreground">Review total gross pay for all employees for the current calendar year.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
            YTD Earnings Summary
          </CardTitle>
          <CardDescription>
            Summary of total gross pay from finalized payrolls from <span className="font-semibold">{dateRange.from}</span> to <span className="font-semibold">{dateRange.to}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
          ) : ytdEarnings.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Gross Check Amount</TableHead>
                        <TableHead className="text-right">Gross Other Amount</TableHead>
                        <TableHead className="text-right font-bold">Total Gross Pay</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {ytdEarnings.map(employee => (
                    <Accordion type="single" collapsible className="w-full" asChild key={employee.employeeId}>
                        <TableRow>
                          <TableCell colSpan={4} className="p-0">
                              <AccordionItem value={employee.employeeId} className="border-b-0">
                                <AccordionTrigger className="hover:no-underline px-4 py-2">
                                  <div className="flex justify-between w-full">
                                    <span className="font-medium">{employee.employeeName}</span>
                                    <div className="grid grid-cols-3 gap-x-4 w-3/4 text-right tabular-nums">
                                        <span>{formatCurrency(employee.totalGrossCheckAmount)}</span>
                                        <span>{formatCurrency(employee.totalGrossOtherAmount)}</span>
                                        <span className="font-bold">{formatCurrency(employee.totalGrossPay)}</span>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="bg-muted/50 p-4">
                                      <Table>
                                          <TableHeader>
                                              <TableRow>
                                                  <TableHead>Pay Period</TableHead>
                                                  <TableHead className="text-right">Gross Check</TableHead>
                                                  <TableHead className="text-right">Gross Other</TableHead>
                                                  <TableHead className="text-right">Gross Pay</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {employee.payPeriods.map((pp, index) => (
                                                  <TableRow key={index}>
                                                      <TableCell>{pp.period}</TableCell>
                                                      <TableCell className="text-right tabular-nums">{formatCurrency(pp.grossCheckAmount)}</TableCell>
                                                      <TableCell className="text-right tabular-nums">{formatCurrency(pp.grossOtherAmount)}</TableCell>
                                                      <TableCell className="text-right tabular-nums">{formatCurrency(pp.grossPay)}</TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                      </Table>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                          </TableCell>
                        </TableRow>
                    </Accordion>
                   ))}
                </TableBody>
                 <TableFooter>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell className="font-bold text-lg">Total</TableCell>
                        <TableCell className="text-right font-bold text-lg tabular-nums">{formatCurrency(totalYtdGrossCheck)}</TableCell>
                        <TableCell className="text-right font-bold text-lg tabular-nums">{formatCurrency(totalYtdGrossOther)}</TableCell>
                        <TableCell className="text-right font-bold text-lg tabular-nums">{formatCurrency(totalYtdGrossPay)}</TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </>
          ) : (
            <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                No earnings data found for this year.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}