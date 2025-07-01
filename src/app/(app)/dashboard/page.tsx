
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DashboardPage() {
  const { user } = useAuth();
  const [totalEmployees, setTotalEmployees] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  // Placeholder data for past payrolls, used as an initial fallback.
  const initialPayrolls = [
    { id: 'pay001', fromDate: '2024-07-01', toDate: '2024-07-15', totalAmount: 5432.10, status: 'Completed' },
    { id: 'pay002', fromDate: '2024-06-16', toDate: '2024-06-30', totalAmount: 5310.55, status: 'Completed' },
  ];

  const [pastPayrolls, setPastPayrolls] = React.useState(initialPayrolls);

  React.useEffect(() => {
    if (user) {
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const q = query(employeesCollectionRef);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTotalEmployees(snapshot.size);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  React.useEffect(() => {
    try {
        const storedHistoryJSON = localStorage.getItem('payrollHistory');
        if (storedHistoryJSON) {
            const storedHistory = JSON.parse(storedHistoryJSON);
            if (storedHistory.length > 0) {
              setPastPayrolls(storedHistory);
            }
        }
    } catch (error) {
        console.error("Could not parse payroll history from localStorage", error);
        setPastPayrolls(initialPayrolls); // Fallback to default
    }
  }, []);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

   const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "LLL d, yyyy");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome back! Here's a quick overview of your payroll status.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="text-2xl font-bold">-</div>
            ) : (
                <div className="text-2xl font-bold">{totalEmployees}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Live data from your database.
            </p>
             <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
               <Link href="/dashboard/employees">
                View Employees <ArrowRight className="ml-1 h-3 w-3" />
               </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Payroll Run
            </CardTitle>
             <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">July 31, 2024</div> {/* Placeholder Data */}
            <p className="text-xs text-muted-foreground">
              Bi-weekly schedule
            </p>
             <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
               <Link href="/dashboard/payroll">
                Run Payroll <ArrowRight className="ml-1 h-3 w-3" />
               </Link>
            </Button>
          </CardContent>
        </Card>

         <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
             <CardDescription>Get started quickly with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
             <Button variant="outline" asChild>
               <Link href="/dashboard/employees/add">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Employee
               </Link>
            </Button>
             <Button variant="default" asChild>
               <Link href="/dashboard/payroll/run">
                <Calculator className="mr-2 h-4 w-4" /> Run New Payroll
               </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       {/* Payroll History */}
       <Card>
         <CardHeader>
            <CardTitle>Payroll History</CardTitle>
            <CardDescription>A summary of your most recent payroll runs.</CardDescription>
         </CardHeader>
         <CardContent>
           {pastPayrolls.length > 0 ? (
              <ul className="space-y-3">
                {pastPayrolls.map((payroll) => (
                  <li key={payroll.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">Payroll for {formatDate(payroll.fromDate)} - {formatDate(payroll.toDate)}</p>
                      <p className="text-sm text-muted-foreground">Status: {payroll.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                       <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                        <Link href="/dashboard/payroll">View Details</Link>
                       </Button>
                    </div>
                  </li>
                ))}
              </ul>
           ) : (
             <p className="text-center text-muted-foreground py-4">No payroll history to display.</p>
           )}
         </CardContent>
       </Card>
    </div>
  );
}
