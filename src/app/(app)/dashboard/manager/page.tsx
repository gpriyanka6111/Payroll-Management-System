
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, ChevronRight, Loader2, ArrowRight, CalendarIcon } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payroll } from '@/lib/types';
import { format } from 'date-fns';
import { getCurrentPayPeriod } from '@/lib/pay-period';


const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function ManagerDashboardPage() {
    const { user } = useAuth();
    const [lastPayroll, setLastPayroll] = React.useState<Payroll | null>(null);
    const [employeeCount, setEmployeeCount] = React.useState<number>(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [payPeriod, setPayPeriod] = React.useState({ start: new Date(), end: new Date(), payDate: new Date() });

    React.useEffect(() => {
        setPayPeriod(getCurrentPayPeriod(new Date()));
    }, []);
    
    React.useEffect(() => {
        if (!user) return;
        
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch last payroll
                const payrollsRef = collection(db, 'users', user.uid, 'payrolls');
                const qPayroll = query(payrollsRef, orderBy('toDate', 'desc'), limit(1));
                const payrollSnapshot = await getDocs(qPayroll);
                if (!payrollSnapshot.empty) {
                    setLastPayroll({ id: payrollSnapshot.docs[0].id, ...payrollSnapshot.docs[0].data() } as Payroll);
                }

                // Fetch employee count
                const employeesRef = collection(db, 'users', user.uid, 'employees');
                const employeeSnapshot = await getDocs(employeesRef);
                setEmployeeCount(employeeSnapshot.size);
                
            } catch (error) {
                console.error("Error fetching manager dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const topThingsToDo = [
        { title: "Run Payroll", description: "The next pay period is ready to be processed.", href: "/dashboard/manager/payroll/run", cta: "Run Payroll" },
        { title: "Review Timesheets", description: "Check and approve employee hours for accuracy.", href: "/dashboard/timesheet", cta: "View Timesheets" },
        { title: "Onboard New Hire", description: "Add your newest team member to the system.", href: "/dashboard/manager/employees/add", cta: "Add Employee" },
    ];


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Manager Dashboard</h1>
                <p className="text-muted-foreground">Access payroll, employee, and reporting tools.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                 {/* Center Column */}
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Upcoming Payroll</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>{format(new Date(), 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                            <CardDescription>The next payroll run that is due.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pay Period</p>
                                <p className="text-lg font-semibold">{format(payPeriod.start, 'MMM dd')} - {format(payPeriod.end, 'MMM dd, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-primary">Pay Date</p>
                                <p className="text-lg font-semibold text-primary">{format(payPeriod.payDate, 'MMM dd, yyyy')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5"/> Last Payroll</CardTitle>
                            <CardDescription>Summary of your most recent payroll run.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-24">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                                </div>
                            ) : lastPayroll ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pay Period</p>
                                            <p className="font-semibold">
                                                {format(new Date(lastPayroll.fromDate.replace(/-/g, '/')), 'MMM dd')} - {format(new Date(lastPayroll.toDate.replace(/-/g, '/')), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                         <div>
                                            <p className="text-sm text-muted-foreground">Total Payroll</p>
                                            <p className="font-semibold text-primary">{formatCurrency(lastPayroll.totalAmount)}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full" asChild>
                                        <Link href={`/dashboard/manager/payroll/report?id=${lastPayroll.id}`}>
                                            View Full Report
                                            <ChevronRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No payroll history found.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                   <Card>
                        <CardHeader>
                            <CardTitle>Top Things To Do</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {topThingsToDo.map(item => (
                                    <li key={item.title}>
                                        <Link href={item.href} className="block p-4 -m-4 rounded-lg hover:bg-muted/50 transition-colors">
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                            <div className="text-sm font-semibold text-primary flex items-center">
                                                {item.cta} <ArrowRight className="ml-1 h-4 w-4" />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
