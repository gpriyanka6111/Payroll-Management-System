
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function HolidaysPage() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);

  React.useEffect(() => {
    setHolidays(getHolidaysForYear(year));
  }, [year]);

  const handlePreviousYear = () => setYear(prevYear => prevYear - 1);
  const handleNextYear = () => setYear(prevYear => prevYear + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold">Holiday Schedule</h1>
            <p className="text-muted-foreground">A list of default US federal holidays for the selected year.</p>
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
            <Star className="mr-2 h-5 w-5" />
            {year} Holiday List
          </CardTitle>
          <CardDescription>
            This is a reference list of standard US holidays.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/2">Date</TableHead>
                        <TableHead className="w-1/2">Holiday Name</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {holidays.map((holiday, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{format(holiday.date, 'EEEE, MMMM d, yyyy')}</TableCell>
                            <TableCell>{holiday.name}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
