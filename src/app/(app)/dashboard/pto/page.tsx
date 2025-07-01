
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, History, Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PtoUsageRecord {
  employeeId: string;
  employeeName: string;
  payPeriod: string; // YYYY-MM-DD
  ptoUsed: number;
}

export default function PtoTrackerPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [ptoHistory, setPtoHistory] = React.useState<PtoUsageRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [today, setToday] = React.useState('');

  React.useEffect(() => {
    setToday(format(new Date(), "MMMM d, yyyy"));
  }, []);

  React.useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      
      // Fetch Employees
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const employeesQuery = query(employeesCollectionRef, orderBy('lastName', 'asc'));
      const employeeSnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(employeesData);

      // Fetch Payrolls and generate PTO history
      const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
      const payrollsQuery = query(payrollsCollectionRef, orderBy('toDate', 'desc'));
      const payrollSnapshot = await getDocs(payrollsQuery);
      const payrollsData: Payroll[] = payrollSnapshot.docs.map(doc => doc.data() as Payroll);
      
      const usageHistory: PtoUsageRecord[] = [];
      payrollsData.forEach(payroll => {
        payroll.results.forEach((result: any) => {
          if (result.ptoUsed > 0) {
            usageHistory.push({
              employeeId: result.employeeId,
              employeeName: result.name,
              payPeriod: payroll.toDate,
              ptoUsed: result.ptoUsed,
            });
          }
        });
      });
      
      setPtoHistory(usageHistory);
      setIsLoading(false);
    };

    fetchAllData().catch(console.error);

  }, [user]);

  // Data processing
  const ptoSummary = employees.map(employee => {
      const usedYTD = ptoHistory
          .filter(record => record.employeeId === employee.id)
          .reduce((sum, record) => sum + record.ptoUsed, 0);
      
      // The current employee.ptoBalance should be the most up-to-date remaining balance
      const remainingBalance = employee.ptoBalance;
      const initialBalance = remainingBalance + usedYTD;

      return {
          ...employee,
          initialBalance,
          usedYTD,
          remainingBalance,
      };
  });

  const formatHours = (hours: number): string => {
      return `${hours.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, "MMMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">PTO Tracker</h1>
        <p className="text-muted-foreground">Review employee Paid Time Off balances and history from live payroll data.</p>
      </div>

      {/* PTO Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5 text-muted-foreground" />
            PTO Balance Summary
          </CardTitle>
          <CardDescription>An overview of current PTO balances for all employees as of {today}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Initial Balance (YTD)</TableHead>
                  <TableHead className="text-right">Used (YTD)</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ptoSummary.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatHours(employee.initialBalance)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">({formatHours(employee.usedYTD)})</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatHours(employee.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
                {ptoSummary.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No employee data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PTO History Log Card */}
      <Card className="printable-section">
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              Detailed PTO Log
            </CardTitle>
            <CardDescription>A complete log of all PTO hours used during payroll runs.</CardDescription>
          </div>
          <div className="print-action-button-container">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print Log
              </Button>
          </div>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
           ): (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Pay Period End Date</TableHead>
                    <TableHead className="text-right">Hours Used</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {ptoHistory.map((record, index) => (
                    <TableRow key={`${record.employeeId}-${record.payPeriod}-${index}`}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{formatDate(record.payPeriod)}</TableCell>
                        <TableCell className="text-right tabular-nums">({formatHours(record.ptoUsed)})</TableCell>
                    </TableRow>
                ))}
                {ptoHistory.length === 0 && !isLoading && (
                    <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        No PTO usage history found.
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
