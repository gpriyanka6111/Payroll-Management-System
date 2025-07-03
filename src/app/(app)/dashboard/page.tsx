
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, ArrowRight, UserPlus, Pencil } from "lucide-react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanySettings {
  payFrequency: 'bi-weekly' | 'weekly' | 'monthly' | 'semi-monthly';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [totalEmployees, setTotalEmployees] = React.useState(0);
  const [pastPayrolls, setPastPayrolls] = React.useState<Payroll[]>([]);
  const [companySettings, setCompanySettings] = React.useState<CompanySettings | null>(null);
  const [nextPayrollDate, setNextPayrollDate] = React.useState<string | null>(null);
  
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(true);
  const [isLoadingPayrolls, setIsLoadingPayrolls] = React.useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      // Listener for employees count
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const employeesQuery = query(employeesCollectionRef);
      const unsubscribeEmployees = onSnapshot(employeesQuery, (snapshot) => {
        setTotalEmployees(snapshot.size);
        setIsLoadingEmployees(false);
      });

      // Listener for payroll history
      const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
      const payrollsQuery = query(payrollsCollectionRef, orderBy('toDate', 'desc'), limit(5)); // Get latest 5
      const unsubscribePayrolls = onSnapshot(payrollsQuery, (snapshot) => {
        const payrollsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Payroll));
        setPastPayrolls(payrollsData);
        setIsLoadingPayrolls(false);
      }, () => setIsLoadingPayrolls(false));
      
      // Listener for company settings
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSettings = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
              setCompanySettings(docSnap.data() as CompanySettings);
          }
          setIsLoadingSettings(false);
      }, () => setIsLoadingSettings(false));


      return () => {
        unsubscribeEmployees();
        unsubscribePayrolls();
        unsubscribeSettings();
      };
    }
  }, [user]);

  React.useEffect(() => {
    if (isLoadingPayrolls || isLoadingSettings) return;

    if (pastPayrolls.length > 0 && companySettings) {
      const lastPayroll = pastPayrolls[0]; // It's sorted desc
      const lastPayDateString = lastPayroll.toDate;
      const [year, month, day] = lastPayDateString.split('-').map(Number);
      // JS Date month is 0-indexed, so subtract 1
      const lastPayDate = new Date(year, month - 1, day);

      let nextDate: Date;
      // This can be expanded if more frequencies are added
      switch (companySettings.payFrequency) {
        case 'bi-weekly':
          nextDate = addDays(lastPayDate, 14);
          break;
        case 'weekly':
          nextDate = addDays(lastPayDate, 7);
          break;
        case 'monthly':
            // This is a simplification; real monthly logic is more complex
            nextDate = addDays(lastPayDate, 30); 
            break;
        default:
          // Default to a sensible value if frequency is unknown
          nextDate = addDays(lastPayDate, 14);
      }
      setNextPayrollDate(format(nextDate, 'MMMM d, yyyy'));
    } else {
        // No past payrolls, so we can't calculate.
        setNextPayrollDate(null);
    }
  }, [pastPayrolls, companySettings, isLoadingPayrolls, isLoadingSettings]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

   const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "LLL d, yyyy");
  };

  const isLoadingNextPayroll = isLoadingPayrolls || isLoadingSettings;

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
            {isLoadingEmployees ? (
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
            {isLoadingNextPayroll ? (
                <Skeleton className="h-8 w-40" />
            ) : nextPayrollDate ? (
                <div className="text-2xl font-bold">{nextPayrollDate}</div>
            ) : (
                 <div className="text-lg font-semibold text-muted-foreground pt-1">Run first payroll</div>
            )}
            <p className="text-xs text-muted-foreground">
                {companySettings?.payFrequency 
                    ? `${companySettings.payFrequency.charAt(0).toUpperCase() + companySettings.payFrequency.slice(1)} schedule`
                    : 'Schedule not set'
                }
            </p>
             <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
               <Link href="/dashboard/payroll/run">
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
           {isLoadingPayrolls ? (
             <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
             </div>
           ) : pastPayrolls.length > 0 ? (
              <ul className="space-y-3">
                {pastPayrolls.map((payroll) => (
                  <li key={payroll.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">Payroll for {formatDate(payroll.fromDate)} - {formatDate(payroll.toDate)}</p>
                      <p className="text-sm text-muted-foreground">Status: {payroll.status}</p>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/payroll/run?id=${payroll.id}`} aria-label="Edit Payroll">
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                       <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                        <Link href={`/dashboard/payroll/report?id=${payroll.id}`}>View Details</Link>
                       </Button>
                      </div>
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
