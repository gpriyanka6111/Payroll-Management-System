
"use client"

import * as React from "react";
import { format } from "date-fns"
import Link from "next/link";

import { PayrollCalculation } from '@/components/payroll/payroll-calculation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export default function RunPayrollPage() {
  const [from, setFrom] = React.useState<Date | undefined>();
  const [to, setTo] = React.useState<Date | undefined>();

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Run New Payroll</h1>
          <p className="text-muted-foreground">Calculate employee payroll for a specific period.</p>
        </div>
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
        <PayrollCalculation 
            key={`${format(from, "yyyy-MM-dd")}-${format(to, "yyyy-MM-dd")}`} 
            from={from}
            to={to}
        />
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
    </div>
  );
}
