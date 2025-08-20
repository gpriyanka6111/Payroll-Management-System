
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PayPeriodEarning {
    period: string; // "MM/dd/yy - MM/dd/yy"
    grossPay: number;
}

interface YtdEarningsRecord {
    employeeId: string;
    employeeName: string;
    totalGrossPay: number;
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
              payPeriods: []
          };
      });

      payrollsData.forEach(payroll => {
        payroll.results.forEach((result: any) => {
          if (ytdTotals[result.employeeId]) {
              const gross = (result.grossCheckAmount || 0) + (result.grossOtherAmount || 0);
              ytdTotals[result.employeeId].totalGrossPay += gross;
              
              const [fromY, fromM, fromD] = payroll.fromDate.split('-').map(Number);
              const [toY, toM, toD] = payroll.toDate.split('-').map(Number);
              const fromDate = new Date(fromY, fromM - 1, fromD);
              const toDate = new Date(toY, toM - 1, toD);

              ytdTotals[result.employeeId].payPeriods.push({
                  period: `${format(fromDate, 'MM/dd/yy')} - ${format(toDate, 'MM/dd/yy')}`,
                  grossPay: gross
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


  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard/manager">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manager Dashboard
        </Link>
      </Button>
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
              <Accordion type="single" collapsible className="w-full">
                {ytdEarnings.map(employee => (
                    <AccordionItem value={employee.employeeId} key={employee.employeeId}>
                        <AccordionTrigger className="hover:no-underline">
                           <div className="flex justify-between w-full pr-4">
                             <span className="font-medium">{employee.employeeName}</span>
                             <span className="font-semibold tabular-nums">{formatCurrency(employee.totalGrossPay)}</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Pay Period</TableHead>
                                       <TableHead className="text-right">Gross Pay</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {employee.payPeriods.map((pp, index) => (
                                       <TableRow key={index}>
                                           <TableCell>{pp.period}</TableCell>
                                           <TableCell className="text-right tabular-nums">{formatCurrency(pp.grossPay)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
              <div className="flex justify-between font-bold text-lg border-t pt-4 mt-4 pr-4">
                  <span>Total YTD Gross Pay</span>
                  <span className="tabular-nums">{formatCurrency(totalYtdGrossPay)}</span>
              </div>
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
