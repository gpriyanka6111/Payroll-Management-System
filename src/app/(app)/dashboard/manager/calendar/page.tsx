
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getYearlyPayPeriods, PayPeriod } from '@/lib/pay-period';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function PayPeriodCalendarPage() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [payPeriods, setPayPeriods] = React.useState<PayPeriod[]>([]);

  React.useEffect(() => {
    setPayPeriods(getYearlyPayPeriods(year));
  }, [year]);

  const handlePreviousYear = () => {
    setYear(prevYear => prevYear - 1);
  };

  const handleNextYear = () => {
    setYear(prevYear => prevYear + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Pay Period Calendar</h1>
            <p className="text-muted-foreground">View all pay periods for the selected year.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousYear}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-24 text-center">{year}</span>
            <Button variant="outline" size="icon" onClick={handleNextYear}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            {year} Pay Periods
          </CardTitle>
          <CardDescription>
            Each period runs from Sunday to Saturday, with the pay date on the following Thursday.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/4">Period Start Date</TableHead>
                        <TableHead className="w-1/4">Period End Date</TableHead>
                        <TableHead className="w-1/4 font-semibold text-primary">Pay Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payPeriods.map((period, index) => (
                        <TableRow key={index}>
                            <TableCell>{format(period.start, 'MM/dd/yyyy')}</TableCell>
                            <TableCell>{format(period.end, 'MM/dd/yyyy')}</TableCell>
                            <TableCell className="font-medium text-primary">{format(period.payDate, 'MM/dd/yyyy')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
