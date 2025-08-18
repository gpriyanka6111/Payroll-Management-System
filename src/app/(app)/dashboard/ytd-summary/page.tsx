
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { format, startOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


interface YtdEarningsRecord {
    employeeId: string;
    employeeName: string;
    grossPay: number;
}

export default function YtdSummaryPage() {
  const { user } = useAuth();
  const [ytdEarnings, setYtdEarnings] = React.useState<YtdEarningsRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      
      // Fetch Employees to create the initial list
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const employeesQuery = query(employeesCollectionRef, orderBy('lastName', 'asc'));
      const employeeSnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));

      // Fetch Payrolls for the current year
      const yearStart = startOfYear(new Date());
      const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
      const payrollsQuery = query(
        payrollsCollectionRef, 
        where('toDate', '>=', format(yearStart, 'yyyy-MM-dd')),
        orderBy('toDate', 'desc')
      );
      const payrollSnapshot = await getDocs(payrollsQuery);
      const payrollsData: Payroll[] = payrollSnapshot.docs.map(doc => doc.data() as Payroll);
      
      const ytdTotals: { [employeeId: string]: YtdEarningsRecord } = {};

      employeesData.forEach(emp => {
          ytdTotals[emp.id] = {
              employeeId: emp.id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              grossPay: 0
          };
      });

      payrollsData.forEach(payroll => {
        payroll.results.forEach((result: any) => {
          if (ytdTotals[result.employeeId]) {
              const gross = (result.grossCheckAmount || 0) + (result.grossOtherAmount || 0);
              ytdTotals[result.employeeId].grossPay += gross;
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


  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Year-to-Date Summary</h1>
        <p className="text-muted-foreground">Review total gross pay for all employees for the current calendar year.</p>
      </div>

      {/* YTD Earnings Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
            YTD Earnings Summary
          </CardTitle>
          <CardDescription>A summary of total gross pay from finalized payrolls this year.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">YTD Gross Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ytdEarnings.map(employee => (
                  <TableRow key={employee.employeeId}>
                    <TableCell className="font-medium">{employee.employeeName}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(employee.grossPay)}</TableCell>
                  </TableRow>
                ))}
                {ytdEarnings.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                      No earnings data found for this year.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
