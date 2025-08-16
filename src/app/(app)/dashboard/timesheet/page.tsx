
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
}

export default function TimesheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: thirtyDaysAgo,
    to: new Date(),
  });

  React.useEffect(() => {
    if (!user || !date?.from) return;

    setIsLoading(true);
    const timeEntriesRef = collection(db, 'users', user.uid, 'timeEntries');
    const q = query(
        timeEntriesRef, 
        where('timeIn', '>=', date.from),
        orderBy('timeIn', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let filteredEntries: TimeEntry[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TimeEntry));

        if (date.to) {
            const toDateEnd = new Date(date.to);
            toDateEnd.setHours(23, 59, 59, 999);
            filteredEntries = filteredEntries.filter(entry => entry.timeIn.toDate() <= toDateEnd);
        }

        setEntries(filteredEntries);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching time entries:", error);
        toast({ title: "Error", description: "Could not fetch timesheet data.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, date, toast]);

  const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return 'Shift Active';
    const totalMinutes = differenceInMinutes(end, start);
    if (totalMinutes < 0) return '0h 0m';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const totalHours = React.useMemo(() => {
    return entries.reduce((acc, entry) => {
        if (entry.timeOut) {
            const minutes = differenceInMinutes(entry.timeOut.toDate(), entry.timeIn.toDate());
            return acc + (minutes > 0 ? minutes / 60 : 0);
        }
        return acc;
    }, 0);
  }, [entries]);

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">My Timesheet</h1>
      <p className="text-muted-foreground">Review your logged hours for the selected period.</p>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Time Log</CardTitle>
                    <CardDescription>
                        Total hours for selected period: <span className="font-bold text-primary">{totalHours.toFixed(2)} hours</span>
                    </CardDescription>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
           ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length > 0 ? entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{format(entry.timeIn.toDate(), 'PPP')}</TableCell>
                    <TableCell>{format(entry.timeIn.toDate(), 'p')}</TableCell>
                    <TableCell>{entry.timeOut ? format(entry.timeOut.toDate(), 'p') : '---'}</TableCell>
                    <TableCell className="text-right font-mono">{formatDuration(entry.timeIn.toDate(), entry.timeOut?.toDate() ?? null)}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No time entries found for the selected period.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

