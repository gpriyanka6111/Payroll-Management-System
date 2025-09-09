
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format } from 'date-fns';

export default function HolidaysPage() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);

  React.useEffect(() => {
    setHolidays(getHolidaysForYear(year));
  }, [year]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Holidays</h1>
        <p className="text-muted-foreground">A list of recognized US holidays for {year}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2 h-5 w-5" />
            {year} Holiday Schedule
          </CardTitle>
          <CardDescription>
            These are the standard US federal holidays. In the future, you'll be able to customize this list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Date</TableHead>
                <TableHead>Holiday</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{format(holiday.date, 'MM/dd/yyyy')}</TableCell>
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
