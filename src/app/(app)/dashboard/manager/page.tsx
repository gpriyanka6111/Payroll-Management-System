
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, PlayCircle, History, DollarSign, CalendarClock, ChevronRight, Loader2, FileText } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payroll } from '@/lib/types';
import { format } from 'date-fns';

const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function ManagerDashboardPage() {
    const { user } = useAuth();
    const [lastPayroll, setLastPayroll] = React.useState<Payroll | null>(null);
    const [employeeCount, setEmployeeCount] = React.useState<number>(0);
    const [isLoading, setIsLoading] = React.useState(true);
    
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

    const reportLinks = [
        { href: "/dashboard/payroll", icon: History, title: "Payroll History", description: "View all past payroll runs." },
        { href: "/dashboard/ytd-summary", icon: DollarSign, title: "YTD Summary", description: "Year-to-date gross pay totals." },
        { href: "/dashboard/pto", icon: CalendarClock, title: "PTO Tracker", description: "Review leave balances and history." },
    ];

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild className="w-fit">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>

            <div>
                <h1 className="text-3xl font-bold">Manager Area</h1>
                <p className="text-muted-foreground">Access payroll, employee, and reporting tools.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-primary text-primary-foreground">
                       <CardHeader>
                            <CardTitle>Run Payroll</CardTitle>
                       </CardHeader>
                       <CardContent className="flex flex-col items-center text-center">
                            <PlayCircle className="h-16 w-16 mb-4"/>
                            <p className="mb-4">Ready to pay your team? Start a new payroll run for the next pay period.</p>
                            <Button variant="secondary" asChild className="w-full">
                                <Link href="/dashboard/payroll/run">Run New Payroll</Link>
                            </Button>
                       </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/> Manage People</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-3xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : employeeCount}</p>
                                    <p className="text-sm text-muted-foreground">Active Employees</p>
                                </div>
                                <Button asChild>
                                    <Link href="/dashboard/employees">View All</Link>
                                </Button>
                           </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
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
                                        <Link href={`/dashboard/payroll/report?id=${lastPayroll.id}`}>
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
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5"/> Reports</CardTitle>
                            <CardDescription>Access historical data and summaries.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ul className="space-y-2">
                                {reportLinks.map(link => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary/10 text-primary p-2 rounded-full">
                                                    <link.icon className="h-5 w-5"/>
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{link.title}</p>
                                                    <p className="text-xs text-muted-foreground">{link.description}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground"/>
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
