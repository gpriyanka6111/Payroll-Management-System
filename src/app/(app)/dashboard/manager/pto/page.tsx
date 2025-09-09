
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, History, Printer } from 'lucide-react';
import { format, startOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PtoUsageRecord {
  employeeId: string;
  employeeName: string;
  payPeriod: string; // YYYY-MM-DD
  vdHoursUsed: number;
  hdHoursUsed: number;
  sdHoursUsed: number;
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
      const employeesQuery = query(employeesCollectionRef, orderBy('firstName', 'asc'));
      const employeeSnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(employeesData);

      // Fetch Payrolls for the current year to calculate PTO usage
      const yearStart = startOfYear(new Date());
      const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
      const payrollsQuery = query(
        payrollsCollectionRef, 
        where('toDate', '>=', format(yearStart, 'yyyy-MM-dd')),
        orderBy('toDate', 'desc')
      );
      const payrollSnapshot = await getDocs(payrollsQuery);
      const payrollsData: Payroll[] = payrollSnapshot.docs.map(doc => doc.data() as Payroll);
      
      const usageHistory: PtoUsageRecord[] = [];

      payrollsData.forEach(payroll => {
        payroll.inputs.forEach((input: any) => {
          if ((input.vdHoursUsed ?? 0) > 0 || (input.hdHoursUsed ?? 0) > 0 || (input.sdHoursUsed ?? 0) > 0) {
            usageHistory.push({
              employeeId: input.employeeId,
              employeeName: input.name,
              payPeriod: payroll.toDate,
              vdHoursUsed: input.vdHoursUsed ?? 0,
              hdHoursUsed: input.hdHoursUsed ?? 0,
              sdHoursUsed: input.sdHoursUsed ?? 0,
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
          .reduce((sum, record) => {
              sum.vacation += record.vdHoursUsed;
              sum.holiday += record.hdHoursUsed;
              sum.sick += record.sdHoursUsed;
              return sum;
          }, { vacation: 0, holiday: 0, sick: 0 });
      
      const remainingBalance = {
          vacation: employee.vacationBalance,
          holiday: employee.holidayBalance,
          sick: employee.sickDayBalance,
      };

      const initialBalance = {
          vacation: (remainingBalance.vacation || 0) + usedYTD.vacation,
          holiday: (remainingBalance.holiday || 0) + usedYTD.holiday,
          sick: (remainingBalance.sick || 0) + usedYTD.sick,
      };

      return {
          ...employee,
          initialBalance,
          usedYTD,
          remainingBalance,
      };
  });

  const formatHours = (hours: number | undefined): string => {
      if (typeof hours !== 'number' || isNaN(hours)) {
        return '0.00';
      }
      return hours.toFixed(2);
  };

  const formatDate = (dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, "MMMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PTO Tracker</h1>
        <p className="text-muted-foreground">Review employee Paid Time Off balances from live payroll data.</p>
      </div>

      {/* PTO Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5 text-muted-foreground" />
            Leave Balance Summary
          </CardTitle>
          <CardDescription>An overview of current leave balances for all employees as of {today}.</CardDescription>
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
                  <TableHead rowSpan={2} className="align-bottom">Employee</TableHead>
                  <TableHead colSpan={3} className="text-center border-b">Initial Balance (YTD)</TableHead>
                  <TableHead colSpan={3} className="text-center border-b">Used (YTD)</TableHead>
                  <TableHead colSpan={3} className="text-center border-b">Remaining Balance</TableHead>
                </TableRow>
                 <TableRow>
                  <TableHead className="text-right text-xs">VD</TableHead>
                  <TableHead className="text-right text-xs">HD</TableHead>
                  <TableHead className="text-right text-xs">SD</TableHead>
                  <TableHead className="text-right text-xs">VD</TableHead>
                  <TableHead className="text-right text-xs">HD</TableHead>
                  <TableHead className="text-right text-xs">SD</TableHead>
                  <TableHead className="text-right text-xs font-semibold">VD</TableHead>
                  <TableHead className="text-right text-xs font-semibold">HD</TableHead>
                  <TableHead className="text-right text-xs font-semibold">SD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ptoSummary.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.firstName}</TableCell>
                    {/* Initial */}
                    <TableCell className="text-right tabular-nums">{formatHours(employee.initialBalance.vacation)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatHours(employee.initialBalance.holiday)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatHours(employee.initialBalance.sick)}</TableCell>
                    {/* Used */}
                    <TableCell className="text-right tabular-nums text-destructive">({formatHours(employee.usedYTD.vacation)})</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">({formatHours(employee.usedYTD.holiday)})</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">({formatHours(employee.usedYTD.sick)})</TableCell>
                    {/* Remaining */}
                    <TableCell className="text-right font-semibold tabular-nums">{formatHours(employee.remainingBalance.vacation)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatHours(employee.remainingBalance.holiday)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatHours(employee.remainingBalance.sick)}</TableCell>
                  </TableRow>
                ))}
                {ptoSummary.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
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
              Detailed Leave Log
            </CardTitle>
            <CardDescription>A complete log of all leave hours used during payroll runs.</CardDescription>
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
                    <TableHead className="text-right">VD Hours Used</TableHead>
                    <TableHead className="text-right">HD Hours Used</TableHead>
                    <TableHead className="text-right">SD Hours Used</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {ptoHistory.map((record, index) => (
                    <TableRow key={`${record.employeeId}-${record.payPeriod}-${index}`}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{formatDate(record.payPeriod)}</TableCell>
                        <TableCell className="text-right tabular-nums">{record.vdHoursUsed > 0 ? `(${formatHours(record.vdHoursUsed)})` : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">{record.hdHoursUsed > 0 ? `(${formatHours(record.hdHoursUsed)})` : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">{record.sdHoursUsed > 0 ? `(${formatHours(record.sdHoursUsed)})` : '-'}</TableCell>
                    </TableRow>
                ))}
                {ptoHistory.length === 0 && !isLoading && (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No leave usage history found for this year.
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
