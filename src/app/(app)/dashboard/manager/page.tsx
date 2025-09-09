
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, CalendarClock, DollarSign, ArrowLeft, CheckCircle, Calendar, CornerDownRight, Banknote } from "lucide-react";
import Link from 'next/link';
import { getNextPayPeriod } from '@/lib/pay-period';
import { format } from 'date-fns';

const managerLinks = [
    {
        href: "/dashboard/employees",
        icon: Users,
        title: "Employees",
        description: "Add, view, and manage all employee records and pay information."
    },
    {
        href: "/dashboard/payroll",
        icon: Calculator,
        title: "Payroll",
        description: "Run new payroll, view past payroll history, and generate reports."
    },
    {
        href: "/dashboard/pto",
        icon: CalendarClock,
        title: "PTO Tracker",
        description: "Review employee Paid Time Off balances and usage history."
    },
    {
        href: "/dashboard/ytd-summary",
        icon: DollarSign,
        title: "YTD Summary",
        description: "Get a year-to-date overview of gross pay for all employees."
    }
]

const thingsToDo = [
    { text: "Review and approve timesheets for the current period.", icon: CheckCircle },
    { text: "Run payroll for the upcoming pay date.", icon: CornerDownRight },
    { text: "Review any pending employee change requests.", icon: Users },
]

export default function ManagerDashboardPage() {
    const [payPeriod, setPayPeriod] = React.useState<{ current: any, next: any }>({
        current: null,
        next: null
    });

    React.useEffect(() => {
        const today = new Date();
        const currentPeriod = getNextPayPeriod(today);
        const nextPeriodStartDate = new Date(currentPeriod.end);
        nextPeriodStartDate.setDate(nextPeriodStartDate.getDate() + 1);
        const nextPeriod = getNextPayPeriod(nextPeriodStartDate);

        setPayPeriod({ current: currentPeriod, next: nextPeriod });
    }, []);

    const formatDateRange = (start: Date | undefined, end: Date | undefined) => {
        if (!start || !end) return 'Calculating...';
        return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild className="w-fit">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>

            <div>
                <h1 className="text-3xl font-bold">Manager Dashboard</h1>
                <p className="text-muted-foreground">Access payroll, employee, and reporting tools.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Manager Area Links */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Manager Area</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {managerLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-primary/10 text-primary p-3 rounded-full">
                                                    <link.icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{link.title}</p>
                                                    <p className="text-sm text-muted-foreground">{link.description}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Columns: Pay Period and Things to Do */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="">
                        <Card className="bg-primary/5 border-primary/20 h-full">
                            <CardHeader className="text-center">
                                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-2">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <CardTitle>Current Pay Period</CardTitle>
                                <CardDescription>{formatDateRange(payPeriod.current?.start, payPeriod.current?.end)}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center space-y-4">
                                <div className="p-3 bg-background/50 rounded-md">
                                <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"><Banknote className="h-4 w-4"/> Payroll Date</p>
                                <p className="text-lg font-bold text-primary">{payPeriod.current?.payDate ? format(payPeriod.current.payDate, 'eeee, MMM dd') : '...'}</p>
                                </div>
                                <div className="p-3 rounded-md">
                                <p className="text-sm font-semibold text-muted-foreground">Next Pay Period</p>
                                <p className="text-sm font-medium">{formatDateRange(payPeriod.next?.start, payPeriod.next?.end)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Things to Do</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {thingsToDo.map((item, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="bg-primary/10 text-primary p-2 rounded-full mt-1">
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm text-muted-foreground">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
