
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter, getQuarter, parse } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPayDateForPeriod } from '@/lib/pay-period';

interface PayPeriodEarning {
    period: string; // "MM/dd/yy - MM/dd/yy"
    payDate: string; // "MM/dd/yy"
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
  const [dateRange, setDateRange] = React.useState({ from: new Date(), to: new Date() });
  const [selectedQuarter, setSelectedQuarter] = React.useState<string>(`q${getQuarter(new Date())}`);
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
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

      const today = new Date();
      const yearForQuery = today.getFullYear();
      let fromDate: Date, toDate: Date;

      if (selectedQuarter === 'all') {
        fromDate = startOfYear(today);
        toDate = endOfYear(today);
      } else {
        const quarterIndex = parseInt(selectedQuarter.replace('q', '')) - 1;
        const targetDate = new Date(yearForQuery, quarterIndex * 3, 1);
        fromDate = startOfQuarter(targetDate);
        toDate = endOfQuarter(targetDate);
      }
      
      setDateRange({ from: fromDate, to: toDate });

      const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
      const payrollsQuery = query(
        payrollsCollectionRef, 
        where('toDate', '>=', format(fromDate, 'yyyy-MM-dd')),
        where('toDate', '<=', format(toDate, 'yyyy-MM-dd')),
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
              
              const fromDatePayroll = parse(payroll.fromDate, 'yyyy-MM-dd', new Date());
              const toDatePayroll = parse(payroll.toDate, 'yyyy-MM-dd', new Date());
              
              let payDateStr = 'N/A';
              if (payroll.payDate) {
                  payDateStr = format(parse(payroll.payDate, 'yyyy-MM-dd', new Date()), 'MM/dd/yy');
              } else {
                  // Fallback to calculate from calendar if not stored on payroll doc
                  const payDateFromCalendar = getPayDateForPeriod(fromDatePayroll);
                  if (payDateFromCalendar) {
                      payDateStr = format(payDateFromCalendar, 'MM/dd/yy');
                  }
              }

              ytdTotals[result.employeeId].payPeriods.push({
                  period: `${format(fromDatePayroll, 'MM/dd/yy')} - ${format(toDatePayroll, 'MM/dd/yy')}`,
                  payDate: payDateStr,
                  grossPay: gross,
                  grossCheckAmount: grossCheck,
                  grossOtherAmount: grossOther,
              });
          }
        });
      });
      
      setYtdEarnings(Object.values(ytdTotals).filter(e => e.totalGrossPay > 0));
      setIsLoading(false);
    };

    fetchAllData().catch(console.error);

  }, [user, selectedQuarter]);

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

  const getPeriodDescription = () => {
    if (selectedQuarter === 'all') {
      return `Full Year (${format(dateRange.from, 'MM/dd/yy')} - ${format(dateRange.to, 'MM/dd/yy')})`;
    }
    const quarterNumber = selectedQuarter.replace('q', '');
    return `Quarter ${quarterNumber} (${format(dateRange.from, 'MM/dd/yy')} - ${format(dateRange.to, 'MM/dd/yy')})`;
  };

  const quarterOptions = [
    { value: "q1", label: `Quarter 1 (01/${currentYear} - 03/${currentYear})` },
    { value: "q2", label: `Quarter 2 (04/${currentYear} - 06/${currentYear})` },
    { value: "q3", label: `Quarter 3 (07/${currentYear} - 09/${currentYear})` },
    { value: "q4", label: `Quarter 4 (10/${currentYear} - 12/${currentYear})` },
    { value: "all", label: `Full Year (${currentYear})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Earnings Summary</h1>
        <p className="text-muted-foreground">Review total gross pay for all employees by quarter or year-to-date.</p>
      </div>

      <Card>
        <CardHeader>
           <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
                Earnings Report
              </CardTitle>
              <CardDescription>
                Summary of total gross pay from finalized payrolls for <span className="font-semibold">{getPeriodDescription()}</span>.
              </CardDescription>
            </div>
             <div className="w-64">
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                        {quarterOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
           </div>
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
                                                  <TableHead>Pay Date</TableHead>
                                                  <TableHead className="text-right">Gross Check</TableHead>
                                                  <TableHead className="text-right">Gross Other</TableHead>
                                                  <TableHead className="text-right">Gross Pay</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {employee.payPeriods.map((pp, index) => (
                                                  <TableRow key={index}>
                                                      <TableCell>{pp.period}</TableCell>
                                                      <TableCell className="font-medium">{pp.payDate}</TableCell>
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
                No earnings data found for the selected period.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
