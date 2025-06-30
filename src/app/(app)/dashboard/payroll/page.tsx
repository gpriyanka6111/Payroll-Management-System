
"use client"

import * as React from "react";
import { format } from "date-fns"
import Link from "next/link";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Play, ArrowLeft } from 'lucide-react';

// Placeholder data - Replace with actual data fetching for past payrolls
const pastPayrolls = [
  { id: 'pay001', date: '2024-07-15', totalAmount: 5432.10, status: 'Completed' },
  { id: 'pay002', date: '2024-06-30', totalAmount: 5310.55, status: 'Completed' },
];

export default function PayrollHistoryPage() {
   const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
   const formatDate = (dateString: string) => {
    // Parsing YYYY-MM-DD can be inconsistent across environments (server vs client timezone).
    // By splitting and creating the date this way, we avoid timezone interpretation issues
    // that cause hydration errors.
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
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Run new payroll or review past history.</p>
        </div>
        <Button asChild variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
           <Link href="/dashboard/payroll/run">
             <Play className="mr-2 h-4 w-4" /> Run New Payroll
           </Link>
        </Button>
      </div>

      {/* Past Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5 text-muted-foreground"/> Payroll History</CardTitle>
          <CardDescription>Review past payroll runs.</CardDescription>
        </CardHeader>
        <CardContent>
           {pastPayrolls.length > 0 ? (
              <ul className="space-y-3">
                {pastPayrolls.map((payroll) => (
                  <li key={payroll.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">Payroll Run - {formatDate(payroll.date)}</p>
                      <p className="text-sm text-muted-foreground">Status: {payroll.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                       {/* Add link/button to view details */}
                       <Button variant="link" size="sm" className="p-0 h-auto text-xs">View Details</Button>
                    </div>
                  </li>
                ))}
              </ul>
           ) : (
            <p className="text-center text-muted-foreground">No past payroll runs found.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
