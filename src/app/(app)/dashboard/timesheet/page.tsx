
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { format, differenceInMinutes, startOfDay } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Employee } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
}

interface DailySummary {
    employeeId: string;
    employeeName: string;
    date: Date;
    totalHours: number;
    entries: TimeEntry[];
}

export default function TimesheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dailySummaries, setDailySummaries] = React.useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: thirtyDaysAgo,
    to: new Date(),
  });

  React.useEffect(() => {
    if (!user || !date?.from) {
        setDailySummaries([]);
        setIsLoading(false);
        return;
    };

    const fetchAllTimesheets = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all employees
            const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
            const employeesQuery = query(employeesCollectionRef, orderBy('lastName', 'asc'));
            const employeeSnapshot = await getDocs(employeesQuery);
            const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));

            // 2. Fetch time entries for each employee within the date range
            const allSummaries: DailySummary[] = [];
            const toDateEnd = date.to ? new Date(date.to) : new Date();
            toDateEnd.setHours(23, 59, 59, 999);

            for (const employee of employeesData) {
                const timeEntriesRef = collection(db, 'users', user.uid, 'employees', employee.id, 'timeEntries');
                const q = query(
                    timeEntriesRef,
                    where('timeIn', '>=', date.from),
                    where('timeIn', '<=', toDateEnd),
                    orderBy('timeIn', 'desc')
                );
                const entriesSnapshot = await getDocs(q);
                const employeeEntries: TimeEntry[] = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));

                // 3. Group entries by day and calculate totals
                const entriesByDay = new Map<string, { totalMinutes: number; entries: TimeEntry[] }>();

                employeeEntries.forEach(entry => {
                    if (!entry.timeOut) return;
                    const dayKey = format(startOfDay(entry.timeIn.toDate()), 'yyyy-MM-dd');
                    const dayData = entriesByDay.get(dayKey) || { totalMinutes: 0, entries: [] };
                    
                    const duration = differenceInMinutes(entry.timeOut.toDate(), entry.timeIn.toDate());
                    dayData.totalMinutes += duration > 0 ? duration : 0;
                    dayData.entries.push(entry);

                    entriesByDay.set(dayKey, dayData);
                });

                // 4. Create summary objects
                entriesByDay.forEach((data, dayKey) => {
                    allSummaries.push({
                        employeeId: employee.id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        date: new Date(dayKey),
                        totalHours: data.totalMinutes / 60,
                        entries: data.entries.sort((a, b) => a.timeIn.toDate().getTime() - b.timeIn.toDate().getTime()), // Sort entries chronologically for detail view
                    });
                });
            }
            
            // 5. Sort final summary list by date (most recent first), then by employee name
            allSummaries.sort((a, b) => {
                const dateDiff = b.date.getTime() - a.date.getTime();
                if (dateDiff !== 0) return dateDiff;
                return a.employeeName.localeCompare(b.employeeName);
            });

            setDailySummaries(allSummaries);

        } catch (error) {
            console.error("Error fetching timesheets:", error);
            toast({ title: "Error", description: "Could not fetch timesheet data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    fetchAllTimesheets();

  }, [user, date, toast]);

  const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return 'Active';
    const totalMinutes = differenceInMinutes(end, start);
    if (totalMinutes < 0) return '0h 0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const totalHoursForAll = React.useMemo(() => {
    return dailySummaries.reduce((acc, summary) => acc + summary.totalHours, 0);
  }, [dailySummaries]);

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Consolidated Timesheet</h1>
      <p className="text-muted-foreground">Review total logged hours for all employees. Click a row to see detailed entries.</p>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                    <CardTitle>Time Log Summary</CardTitle>
                    <CardDescription>
                        Total hours for selected period: <span className="font-bold text-primary">{totalHoursForAll.toFixed(2)} hours</span>
                    </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full sm:w-[300px] justify-start text-left font-normal",
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
            </div>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
           ) : (
            dailySummaries.length > 0 ? (
                 <Accordion type="single" collapsible className="w-full">
                    <div className="border-b font-medium text-muted-foreground">
                        <div className="flex px-4 py-3">
                            <div className="w-1/3">Employee</div>
                            <div className="w-1/3">Date</div>
                            <div className="w-1/3 text-right">Total Hours</div>
                        </div>
                    </div>
                    {dailySummaries.map((summary, index) => (
                         <AccordionItem value={`item-${index}`} key={`${summary.employeeId}-${summary.date}`}>
                            <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 py-3 rounded-md">
                                <div className="w-1/3 text-left font-medium">{summary.employeeName}</div>
                                <div className="w-1/3 text-left">{format(summary.date, 'PPP')}</div>
                                <div className="w-1/3 text-right font-semibold tabular-nums">{summary.totalHours.toFixed(2)} hrs</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="px-4 py-2 bg-muted/20 border-t">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Time In</TableHead>
                                                <TableHead>Time Out</TableHead>
                                                <TableHead className="text-right">Duration</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {summary.entries.map(entry => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>{format(entry.timeIn.toDate(), 'p')}</TableCell>
                                                    <TableCell>{entry.timeOut ? format(entry.timeOut.toDate(), 'p') : '---'}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatDuration(entry.timeIn.toDate(), entry.timeOut?.toDate() ?? null)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No time entries found for any employee in the selected period.
                </div>
            )
           )}
        </CardContent>
      </Card>
    </div>
  );
}
