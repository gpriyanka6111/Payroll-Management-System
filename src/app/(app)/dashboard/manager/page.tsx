
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, CalendarClock, DollarSign, ArrowLeft } from "lucide-react";
import Link from 'next/link';

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

export default function ManagerDashboardPage() {
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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {managerLinks.map((link) => (
                    <Card key={link.href} className="hover:shadow-md hover:border-primary/50 transition-all">
                        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                           <div className="flex-shrink-0">
                                <div className="bg-primary/10 text-primary p-3 rounded-full">
                                    <link.icon className="h-6 w-6" />
                                </div>
                           </div>
                           <div className="flex-1">
                               <CardTitle>{link.title}</CardTitle>
                               <CardDescription className="mt-1">{link.description}</CardDescription>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <Button asChild className="w-full">
                             <Link href={link.href}>Go to {link.title}</Link>
                           </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
