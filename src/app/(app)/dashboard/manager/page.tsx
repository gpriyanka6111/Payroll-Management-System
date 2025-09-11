
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarIcon, Package, Truck } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payroll } from '@/lib/types';
import { format } from 'date-fns';
import { getCurrentPayPeriod } from '@/lib/pay-period';
import { LastPayrollChart } from '@/components/charts/last-payroll-chart';
import { RemindersCard } from '@/components/dashboard/reminders-card';


export default function ManagerDashboardPage() {
    const { user } = useAuth();
    const [lastPayroll, setLastPayroll] = React.useState<Payroll | null>(null);
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
                
            } catch (error) {
                console.error("Error fetching manager dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Manager Dashboard</h1>
                <p className="text-muted-foreground">Access payroll, employee, and reporting tools.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Upcoming Payroll</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>{format(new Date(), 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                            <CardDescription>The next payroll run is due. Click the pay date to start.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pay Period</p>
                                <p className="text-lg font-semibold">{format(payPeriod.start, 'MMM dd')} - {format(payPeriod.end, 'MMM dd, yyyy')}</p>
                            </div>
                             <Link href={`/dashboard/manager/payroll/run?from=${format(payPeriod.start, 'yyyy-MM-dd')}&to=${format(payPeriod.end, 'yyyy-MM-dd')}`} className="block rounded-lg p-4 -m-4 transition-all hover:bg-muted/50">
                                <p className="text-sm font-medium text-primary">Pay Date</p>
                                <p className="text-lg font-semibold text-primary">{format(payPeriod.payDate, 'MMM dd, yyyy')}</p>
                            </Link>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                           <CardTitle>Last Payroll</CardTitle>
                             <CardDescription>
                                {isLoading ? 'Loading...' : lastPayroll ? `Pay period from ${format(new Date(lastPayroll.fromDate.replace(/-/g, '/')), 'MMM dd')} to ${format(new Date(lastPayroll.toDate.replace(/-/g, '/')), 'MMM dd')}` : 'No history found.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                                </div>
                            ) : lastPayroll ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pay Date</p>
                                            <p className="font-semibold">
                                                {lastPayroll.payDate ? format(new Date(lastPayroll.payDate.replace(/-/g, '/')), 'MM/dd/yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <LastPayrollChart totalAmount={lastPayroll.totalAmount}/>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8 h-48 flex items-center justify-center">No payroll history found.</p>
                            )}
                        </CardContent>
                         {lastPayroll && (
                            <CardFooter className="flex-col items-start gap-4 border-t pt-4">
                                <div className="flex w-full gap-4 text-sm">
                                    <Button variant="ghost" className="p-0 h-auto text-primary hover:text-primary/90">
                                        <Package className="mr-2"/> Report package
                                    </Button>
                                    <Button variant="ghost" className="p-0 h-auto text-muted-foreground cursor-not-allowed">
                                        <Truck className="mr-2"/> Track delivery
                                    </Button>
                                </div>
                                <Button variant="link" className="p-0 h-auto font-semibold" asChild>
                                    <Link href={`/dashboard/manager/payroll/report?id=${lastPayroll.id}`}>
                                        Payroll details
                                    </Link>
                                </Button>
                            </CardFooter>
                         )}
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                   <RemindersCard />
                </div>
            </div>
        </div>
    );
}
