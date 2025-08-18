
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, Users, Pencil, AlertTriangle, Loader2 } from "lucide-react";
import { format, differenceInMinutes, startOfDay, isSameDay, subDays, eachDayOfInterval, parse, set } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
    employeeId: string; // Keep employeeId here for easy access
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

function PinDialog({ open, onOpenChange, onPinVerified }: { open: boolean, onOpenChange: (open: boolean) => void, onPinVerified: () => void }) {
    const [pin, setPin] = React.useState('');
    const [error, setError] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { user } = useAuth();

    const handleVerifyPin = async () => {
        if (!user) {
            setError('You must be logged in.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().securityPin === pin) {
                onPinVerified();
            } else if (docSnap.exists() && !docSnap.data().securityPin) {
                 onPinVerified();
            }
            else {
                setError('Invalid PIN. Please try again.');
            }
        } catch (err) {
            setError('An error occurred while verifying the PIN.');
        } finally {
            setIsLoading(false);
            setPin('');
        }
    };
     const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
        setPin(value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enter Security PIN</DialogTitle>
                    <DialogDescription>
                        Enter your 4-digit PIN to edit this time entry.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={pin}
                        onChange={handlePinChange}
                        className="text-center text-2xl tracking-[1rem]"
                    />
                    <Button onClick={handleVerifyPin} className="w-full" disabled={isLoading || pin.length !== 4}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Verify PIN"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


function EditTimeEntryDialog({ isOpen, onClose, entry, date, onSave }: { isOpen: boolean, onClose: () => void, entry: TimeEntry | null, date: Date | null, onSave: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [timeIn, setTimeIn] = React.useState('');
    const [timeOut, setTimeOut] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (entry) {
            setTimeIn(format(entry.timeIn.toDate(), 'HH:mm'));
            setTimeOut(entry.timeOut ? format(entry.timeOut.toDate(), 'HH:mm') : '');
        }
    }, [entry]);

    const handleSave = async () => {
        if (!user || !entry || !date) return;

        const [inHours, inMinutes] = timeIn.split(':').map(Number);
        const timeInDate = set(date, { hours: inHours, minutes: inMinutes, seconds: 0, milliseconds: 0 });

        let timeOutDate: Date | null = null;
        if (timeOut) {
            const [outHours, outMinutes] = timeOut.split(':').map(Number);
            timeOutDate = set(date, { hours: outHours, minutes: outMinutes, seconds: 0, milliseconds: 0 });
        }
        
        if (timeOutDate && timeOutDate < timeInDate) {
            setError('Clock-out time cannot be before clock-in time.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            const entryDocRef = doc(db, 'users', user.uid, 'employees', entry.employeeId, 'timeEntries', entry.id);
            await updateDoc(entryDocRef, {
                timeIn: Timestamp.fromDate(timeInDate),
                timeOut: timeOutDate ? Timestamp.fromDate(timeOutDate) : null
            });
            toast({ title: 'Success', description: 'Time entry updated successfully.' });
            onSave();
        } catch (err) {
            console.error('Error updating time entry:', err);
            toast({ title: 'Error', description: 'Failed to update time entry.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!entry || !date) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Time Entry</DialogTitle>
                    <DialogDescription>
                        Adjust the clock-in and clock-out times for {format(date, 'PPP')}. Use 24-hour format (HH:mm).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{error}</AlertTitle></Alert>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="timeIn">Clock In</Label>
                            <Input id="timeIn" type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeOut">Clock Out</Label>
                            <Input id="timeOut" type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


function DailyActivityDialog({ isOpen, onClose, date, summaries, onEditRequest }: { isOpen: boolean, onClose: () => void, date: Date | null, summaries: DailySummary[], onEditRequest: (entry: TimeEntry) => void }) {
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
                                            <li key={entry.id} className="text-xs list-disc list-inside flex items-center justify-between">
                                                <span>
                                                    {format(entry.timeIn.toDate(), 'p')} - {entry.timeOut ? format(entry.timeOut.toDate(), 'p') : '...'}
                                                    <span className="ml-2 text-muted-foreground">({formatDuration(entry.timeIn.toDate(), entry.timeOut?.toDate() ?? null)})</span>
                                                </span>
                                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditRequest(entry)}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
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
  const [isPinDialogOpen, setIsPinDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [entryToEdit, setEntryToEdit] = React.useState<{entry: TimeEntry, date: Date} | null>(null);
  
  const fetchData = React.useCallback(async () => {
     if (!user || !date?.from || !date?.to) {
        setTimesheetData({ dates: [], employees: [], entries: {}, totals: {} });
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
        const employeesQuery = query(employeesCollectionRef, orderBy('lastName', 'asc'));
        const employeeSnapshot = await getDocs(employeesQuery);
        const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        const uniqueEmployees = employeesData.map(emp => ({ id: emp.id, name: `${emp.firstName} ${emp.lastName}` }));

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
            const employeeEntries: TimeEntry[] = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), employeeId: employee.id } as TimeEntry));

            const entriesByDay = new Map<string, { totalMinutes: number; entries: TimeEntry[] }>();
            employeeEntries.forEach(entry => {
                const dayKey = format(startOfDay(entry.timeIn.toDate()), 'yyyy-MM-dd');
                const dayData = entriesByDay.get(dayKey) || { totalMinutes: 0, entries: [] };
                
                if(entry.timeOut) {
                    const duration = differenceInMinutes(entry.timeOut.toDate(), entry.timeIn.toDate());
                    dayData.totalMinutes += duration > 0 ? duration : 0;
                }

                dayData.entries.push(entry);
                entriesByDay.set(dayKey, dayData);
            });

            entriesByDay.forEach((data, dayKey) => {
                allSummaries.push({
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    date: parse(dayKey, 'yyyy-MM-dd', new Date()),
                    totalHours: data.totalMinutes / 60,
                    entries: data.entries.sort((a, b) => a.timeIn.toDate().getTime() - b.timeIn.toDate().getTime()),
                });
            });
        }
        
        const allDatesInRange = eachDayOfInterval({
            start: date.from,
            end: date.to,
        }).sort((a, b) => a.getTime() - b.getTime());

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
  }, [user, date, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleDateClick = (d: Date) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const dailySummaries = timesheetData.employees
        .map(emp => timesheetData.entries[dateKey]?.[emp.id])
        .filter((summary): summary is DailySummary => !!summary && summary.totalHours > 0);
    
    setSelectedDateDetails({ date: d, summaries: dailySummaries });
    setIsDetailsDialogOpen(true);
  };

  const handleEditRequest = (entry: TimeEntry) => {
    if (selectedDateDetails.date) {
        setEntryToEdit({ entry, date: selectedDateDetails.date });
        setIsPinDialogOpen(true);
    }
  };

  const handlePinVerified = () => {
    setIsPinDialogOpen(false);
    setIsDetailsDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = () => {
      setIsEditDialogOpen(false);
      setEntryToEdit(null);
      fetchData(); // Refetch data to show updated times
  }


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
                                        <TableHead key={emp.id} className="text-left">{emp.name}</TableHead>
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
                                                    <TableCell key={emp.id} className="text-left tabular-nums">
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
                                        <TableHead key={`total-${emp.id}`} className="text-left font-bold text-primary tabular-nums">
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
            onEditRequest={handleEditRequest}
        />

        <PinDialog 
            open={isPinDialogOpen}
            onOpenChange={setIsPinDialogOpen}
            onPinVerified={handlePinVerified}
        />
        
        <EditTimeEntryDialog 
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            entry={entryToEdit?.entry ?? null}
            date={entryToEdit?.date ?? null}
            onSave={handleEditSave}
        />

    </div>
  );
}
