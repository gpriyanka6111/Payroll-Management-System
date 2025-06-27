"use client"

import * as React from "react";
import { format } from "date-fns"

import { PayrollCalculation } from '@/components/payroll/payroll-calculation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, History, Play, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Placeholder data - Replace with actual data fetching for past payrolls
const pastPayrolls = [
  { id: 'pay001', date: '2024-07-15', totalAmount: 5432.10, status: 'Completed' },
  { id: 'pay002', date: '2024-06-30', totalAmount: 5310.55, status: 'Completed' },
];

export default function PayrollPage() {
  const [from, setFrom] = React.useState<Date | undefined>();
  const [to, setTo] = React.useState<Date | undefined>();

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
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll.</p>
        </div>
        <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
           {/* Link or action to start a new payroll run */}
           <Play className="mr-2 h-4 w-4" /> Run New Payroll
        </Button>
      </div>

       {/* Pay Period Selector */}
       <Card>
        <CardHeader>
          <CardTitle>1. Select Pay Period</CardTitle>
          <CardDescription>Choose the date range for this payroll run.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-2">
                <Label htmlFor="from-date">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="from-date"
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {from ? format(from, "LLL dd, y") : <span>Pick a start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={from}
                      onSelect={setFrom}
                      disabled={(date) =>
                        (to && date > to) || date > new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                 <Label htmlFor="to-date">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="to-date"
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {to ? format(to, "LLL dd, y") : <span>Pick an end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={to}
                      onSelect={setTo}
                      disabled={(date) =>
                        !from || date < from || date > new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
        </CardContent>
      </Card>


      {/* Payroll Calculation Component */}
       {from && to ? (
        <PayrollCalculation key={`${format(from, "yyyy-MM-dd")}-${format(to, "yyyy-MM-dd")}`} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> 2. Calculate Payroll</CardTitle>
            <CardDescription>Enter hours for each employee for the selected pay period.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-10">Please select a pay period above to begin.</p>
          </CardContent>
        </Card>
      )}


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
