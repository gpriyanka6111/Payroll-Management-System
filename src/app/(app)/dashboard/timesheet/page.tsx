
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, Users } from "lucide-react";
import { format, differenceInMinutes, startOfDay, isSameDay, subDays, eachDayOfInterval } from "date-fns";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"


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

interface TimesheetData {
    dates: Date[];
    employees: { id: string; name: string }[];
    entries: Record<string, Record<string, DailySummary | undefined>>; // [dateString][employeeId]
    totals: Record<string, number>; // [employeeId] -> totalHours
}

function DailyActivityDialog({ isOpen, onClose, date, summaries }: { isOpen: boolean, onClose: () => void, date: Date | null, summaries: DailySummary[] }) {
    if (!date) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> Daily Activity Summary</DialogTitle>
                    <DialogDescription>
                        A detailed log of all employee activity for {format(date, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {summaries.length > 0 ? (
                        <ul className="space-y-4 py-4">
                            {summaries.map(summary => (
                                <li key={summary.employeeId} className="border-b pb-4 last:border-b-0">
                                    <h4 className="font-semibold">{summary.employeeName}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">Total Hours: <span className="font-bold text-primary">{summary.totalHours.toFixed(2)}</span></p>
                                    <ul className="space-y-1 pl-4">
                                        {summary.entries.map(entry => (
                                            <li key={entry.id} className="text-xs list-disc list-inside">
                                                {format(entry.timeIn.toDate(), 'p')} - {entry.timeOut ? format(entry.timeOut.toDate(), 'p') : '...'}
                                                <span className="ml-2 text-muted-foreground">({formatDuration(entry.timeIn.toDate(), entry.timeOut?.toDate() ?? null)})</span>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No activity was recorded for this day.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Moved outside the component to avoid re-declaration on every render
const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return 'Active';
    const totalMinutes = differenceInMinutes(end, start);
    if (totalMinutes < 0) return '0h 0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
};


export default function TimesheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timesheetData, setTimesheetData] = React.useState<TimesheetData>({ dates: [], employees: [], entries: {}, totals: {} });
  const [isLoading, setIsLoading] = React.useState(true);
  
  const fourteenDaysAgo = subDays(new Date(), 13);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: fourteenDaysAgo,
    to: new Date(),
  });

  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = React.useState<{ date: Date | null; summaries: DailySummary[] }>({ date: null, summaries: [] });

  React.useEffect(() => {
    if (!user || !date?.from || !date?.to) {
        setTimesheetData({ dates: [], employees: [], entries: {}, totals: {} });
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
            const uniqueEmployees = employeesData.map(emp => ({ id: emp.id, name: `${emp.firstName} ${emp.lastName}` }));


            // 2. Fetch time entries for each employee within the date range
            const allSummaries: DailySummary[] = [];
            const toDateEnd = new Date(date.to);
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
            
            // 5. Transform data for pivot table
            const allDatesInRange = eachDayOfInterval({
                start: date.from,
                end: date.to,
            }).sort((a, b) => a.getTime() - b.getTime()); // Sort ascending: oldest first


            const entriesMap: Record<string, Record<string, DailySummary | undefined>> = {};
            const employeeTotals: Record<string, number> = {};
            uniqueEmployees.forEach(emp => employeeTotals[emp.id] = 0);

            allDatesInRange.forEach(d => {
                const dateKey = format(d, 'yyyy-MM-dd');
                entriesMap[dateKey] = {};
                uniqueEmployees.forEach(emp => {
                    const summary = allSummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, d));
                    entriesMap[dateKey][emp.id] = summary;
                    if (summary) {
                        employeeTotals[emp.id] += summary.totalHours;
                    }
                });
            });

            setTimesheetData({
                dates: allDatesInRange,
                employees: uniqueEmployees,
                entries: entriesMap,
                totals: employeeTotals,
            });

        } catch (error) {
            console.error("Error fetching timesheets:", error);
            toast({ title: "Error", description: "Could not fetch timesheet data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    fetchAllTimesheets();

  }, [user, date, toast]);

  const handleDateClick = (d: Date) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const dailySummaries = timesheetData.employees
        .map(emp => timesheetData.entries[dateKey]?.[emp.id])
        .filter((summary): summary is DailySummary => !!summary && summary.totalHours > 0);
    
    setSelectedDateDetails({ date: d, summaries: dailySummaries });
    setIsDetailsDialogOpen(true);
  };

  const totalHoursForAll = React.useMemo(() => {
     return Object.values(timesheetData.totals).reduce((acc, total) => acc + total, 0);
  }, [timesheetData.totals]);

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Consolidated Timesheet</h1>
      <p className="text-muted-foreground">Review total logged hours for all employees. Click on a date for a daily summary, or an hour value for detailed entries.</p>
      
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
            timesheetData.employees.length > 0 ? (
                <TooltipProvider>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Date</TableHead>
                                    {timesheetData.employees.map(emp => (
                                        <TableHead key={emp.id} className="text-right">{emp.name}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {timesheetData.dates.map(d => {
                                    const dateKey = format(d, 'yyyy-MM-dd');
                                    return (
                                        <TableRow key={dateKey}>
                                            <TableCell className="font-medium sticky left-0 bg-card z-10">
                                                <Button variant="link" className="p-0 h-auto" onClick={() => handleDateClick(d)}>
                                                    {format(d, 'PPP')}
                                                </Button>
                                            </TableCell>
                                            {timesheetData.employees.map(emp => {
                                                const summary = timesheetData.entries[dateKey]?.[emp.id];
                                                return (
                                                    <TableCell key={emp.id} className="text-right tabular-nums">
                                                        {summary && summary.totalHours > 0 ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="font-semibold cursor-pointer text-primary hover:underline">{summary.totalHours.toFixed(2)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="p-2">
                                                                        <h4 className="font-bold mb-2">Time Entries</h4>
                                                                        <ul className="space-y-1">
                                                                            {summary.entries.map(entry => (
                                                                                <li key={entry.id} className="text-xs">
                                                                                   {format(entry.timeIn.toDate(), 'p')} - {entry.timeOut ? format(entry.timeOut.toDate(), 'p') : '...'}
                                                                                   <span className="ml-2 text-muted-foreground">({formatDuration(entry.timeIn.toDate(), entry.timeOut?.toDate() ?? null)})</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-card z-10">Total Hours</TableHead>
                                     {timesheetData.employees.map(emp => (
                                        <TableHead key={`total-${emp.id}`} className="text-right font-bold text-primary tabular-nums">
                                            {timesheetData.totals[emp.id]?.toFixed(2) ?? '0.00'}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </TooltipProvider>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No employees found. Please add an employee first.
                </div>
            )
           )}
        </CardContent>
      </Card>

        <DailyActivityDialog
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            date={selectedDateDetails.date}
            summaries={selectedDateDetails.summaries}
        />

    </div>
  );
}
