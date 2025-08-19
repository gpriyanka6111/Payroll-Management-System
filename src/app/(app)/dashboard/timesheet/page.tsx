
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, Users, Pencil, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import { format, differenceInMinutes, startOfDay, isSameDay, subDays, eachDayOfInterval, parse } from "date-fns";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';


interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
    employeeId: string;
}

interface DailySummary {
    employeeId: string;
    employeeName: string;
    date: Date;
    totalHours: number;
    entries: TimeEntry[];
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
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    const [timeIn, setTimeIn] = React.useState('09:00');
    const [timeInAmPm, setTimeInAmPm] = React.useState<'AM' | 'PM'>('AM');
    const [timeOut, setTimeOut] = React.useState('05:00');
    const [timeOutAmPm, setTimeOutAmPm] = React.useState<'AM' | 'PM'>('PM');
    const [isClockedOut, setIsClockedOut] = React.useState(true);


    React.useEffect(() => {
        if (entry) {
            const timeInDate = entry.timeIn.toDate();
            setTimeIn(format(timeInDate, 'hh:mm'));
            setTimeInAmPm(format(timeInDate, 'a') as 'AM' | 'PM');

            if (entry.timeOut) {
                 const timeOutDate = entry.timeOut.toDate();
                 setTimeOut(format(timeOutDate, 'hh:mm'));
                 setTimeOutAmPm(format(timeOutDate, 'a') as 'AM' | 'PM');
                 setIsClockedOut(true);
            } else {
                 setIsClockedOut(false);
                 setTimeOut('05:00');
                 setTimeOutAmPm('PM');
            }
        }
    }, [entry]);

    const handleSave = async () => {
        if (!user || !entry || !date) return;
        setError('');

        const timeInDate = parse(`${timeIn} ${timeInAmPm}`, 'hh:mm a', date);
        let timeOutDate: Date | null = null;
        if (isClockedOut) {
            timeOutDate = parse(`${timeOut} ${timeOutAmPm}`, 'hh:mm a', date);
        }
        
        if (timeOutDate && timeOutDate < timeInDate) {
            setError('Clock-out time cannot be before clock-in time.');
            return;
        }
        
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
                        Adjust the clock-in/out times for {format(date, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{error}</AlertTitle></Alert>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Clock In</Label>
                            <div className="flex gap-2">
                                <Input value={timeIn} onChange={e => setTimeIn(e.target.value)} placeholder="hh:mm" />
                                <Select value={timeInAmPm} onValueChange={(v: 'AM' | 'PM') => setTimeInAmPm(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label>Clock Out</Label>
                            <div className="flex gap-2">
                                <Input value={timeOut} onChange={e => setTimeOut(e.target.value)} placeholder="hh:mm" disabled={!isClockedOut} />
                                <Select value={timeOutAmPm} onValueChange={(v: 'AM' | 'PM') => setTimeOutAmPm(v)} disabled={!isClockedOut}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                             <div className="flex items-center space-x-2 mt-2">
                                <input type="checkbox" id="isClockedOut" checked={!isClockedOut} onChange={(e) => setIsClockedOut(!e.target.checked)} />
                                <label htmlFor="isClockedOut" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Still clocked in?
                                </label>
                            </div>
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


function DailyActivityDialog({ isOpen, onClose, date, summary, onEditRequest }: { isOpen: boolean, onClose: () => void, date: Date | null, summary: DailySummary | null, onEditRequest: (entry: TimeEntry) => void }) {
    if (!date || !summary) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> Daily Activity Summary</DialogTitle>
                    <DialogDescription>
                        {summary.employeeName} on {format(date, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {summary.entries.length > 0 ? (
                        <div className="space-y-4 py-4">
                            <h4 className="font-semibold">Total Hours: <span className="font-bold text-primary">{summary.totalHours.toFixed(2)}</span></h4>
                            <ul className="space-y-2 pl-4">
                                {summary.entries.map(entry => (
                                    <li key={entry.id} className="text-sm list-disc list-inside flex items-center justify-between p-2 border rounded-md">
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
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No activity was recorded for this day.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

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
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [dailySummaries, setDailySummaries] = React.useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const fourteenDaysAgo = subDays(new Date(), 13);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: fourteenDaysAgo,
    to: new Date(),
  });

  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedCellDetails, setSelectedCellDetails] = React.useState<{ date: Date | null; summary: DailySummary | null }>({ date: null, summary: null });
  const [isPinDialogOpen, setIsPinDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [entryToEdit, setEntryToEdit] = React.useState<{entry: TimeEntry, date: Date} | null>(null);
  
  const fetchData = React.useCallback(async () => {
     if (!user || !dateRange?.from || !dateRange?.to) {
        setDailySummaries([]);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
        const employeesQuery = query(employeesCollectionRef, orderBy('lastName', 'asc'));
        const employeeSnapshot = await getDocs(employeesQuery);
        const employeesData: Employee[] = employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(employeesData);

        const allSummaries: DailySummary[] = [];
        const toDateEnd = new Date(dateRange.to);
        toDateEnd.setHours(23, 59, 59, 999);

        for (const employee of employeesData) {
            const timeEntriesRef = collection(db, 'users', user.uid, 'employees', employee.id, 'timeEntries');
            const q = query(
                timeEntriesRef,
                where('timeIn', '>=', dateRange.from),
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
        
        setDailySummaries(allSummaries);

    } catch (error) {
        console.error("Error fetching timesheets:", error);
        toast({ title: "Error", description: "Could not fetch timesheet data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [user, dateRange, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCellClick = (summary: DailySummary | undefined, date: Date) => {
    if (summary) {
      setSelectedCellDetails({ date: summary.date, summary: summary });
      setIsDetailsDialogOpen(true);
    } else {
      setSelectedCellDetails({ date, summary: null });
      // Potentially open a dialog to add a new entry, or just do nothing.
      // For now, we do nothing if there's no data.
    }
  };


  const handleEditRequest = (entry: TimeEntry) => {
    if (selectedCellDetails.date) {
        setEntryToEdit({ entry, date: selectedCellDetails.date });
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

  const days = dateRange && dateRange.from && dateRange.to ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }) : [];

  const employeeTotals = React.useMemo(() => {
    const totals = new Map<string, number>();
    employees.forEach(emp => totals.set(emp.id, 0));
    dailySummaries.forEach(summary => {
        const currentTotal = totals.get(summary.employeeId) || 0;
        totals.set(summary.employeeId, currentTotal + summary.totalHours);
    });
    return totals;
  }, [employees, dailySummaries]);

  const handleExportToExcel = () => {
    if (!employees.length || !days.length || !dateRange?.from || !dateRange.to) {
        toast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws_data: (string | number)[][] = [];
    const merges: XLSX.Range[] = [];
    let currentRow = 0;


    // Header row
    const headerRow = ['Date', 'Metric', ...employees.map(e => `${e.firstName} ${e.lastName}`)];
    ws_data.push(headerRow);
    currentRow++;

    // Data rows
    days.forEach((day, dayIndex) => {
        const daySummaries = dailySummaries.filter(s => isSameDay(s.date, day));
        
        const dateStr = format(day, 'eee, MMM dd');
        // In row
        const inRow: (string | number)[] = [dateStr, 'In:'];
        employees.forEach(emp => {
            const summary = daySummaries.find(s => s.employeeId === emp.id);
            const value = summary ? (summary.entries.length > 1 ? 'Multiple' : (summary.entries[0]?.timeIn ? format(summary.entries[0].timeIn.toDate(), 'p') : '-')) : '-';
            inRow.push(value);
        });
        ws_data.push(inRow);

        // Out row
        const outRow: (string | number)[] = ['', 'Out:'];
         employees.forEach(emp => {
            const summary = daySummaries.find(s => s.employeeId === emp.id);
            const value = summary ? (summary.entries.length > 1 ? 'Multiple' : (summary.entries[0]?.timeOut ? format(summary.entries[0].timeOut.toDate(), 'p') : (summary.entries[0]?.timeIn ? 'ACTIVE' : '-'))) : '-';
            outRow.push(value);
        });
        ws_data.push(outRow);

        // Total row
        const totalRow: (string | number)[] = ['', 'Total:'];
         employees.forEach(emp => {
            const summary = daySummaries.find(s => s.employeeId === emp.id);
            const value = summary && summary.totalHours > 0 ? `${summary.totalHours.toFixed(2)}` : '-';
            totalRow.push(value);
        });
        ws_data.push(totalRow);

        // Add merge info for the date cell
        if (dayIndex > -1) { // Skip header
             merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 2, c: 0 } });
        }
        currentRow += 3;
    });

    // Footer row
    const footerRow: (string | number)[] = ['Total Hours', ''];
    employees.forEach(emp => {
        footerRow.push((employeeTotals.get(emp.id) || 0).toFixed(2));
    });
    ws_data.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

    const fileName = `timesheet (${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}).xlsx`;
    XLSX.writeFile(wb, fileName);
  };


  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Consolidated Timesheet</h1>
      <p className="text-muted-foreground">Review total logged hours for all employees. Click on a cell to view or edit detailed punch entries.</p>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                    <CardTitle>Time Log Summary</CardTitle>
                    <CardDescription>
                        Displaying time entries for the selected period.
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
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
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
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={handleExportToExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export to XLSX
                    </Button>
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
            employees.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px] font-bold">Date</TableHead>
                                <TableHead className="w-[80px] font-bold">Metric</TableHead>
                                {employees.map(emp => (
                                    <TableHead key={emp.id} className="text-center font-bold min-w-[150px]">{emp.firstName} {emp.lastName}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {days.map(day => {
                                const daySummaries = dailySummaries.filter(s => isSameDay(s.date, day));
                                return (
                                    <React.Fragment key={day.toISOString()}>
                                        <TableRow>
                                            <TableCell rowSpan={3} className="font-medium align-top pt-3 border-b">
                                                {format(day, 'eee, MMM dd')}
                                            </TableCell>
                                            <TableCell className="font-semibold text-muted-foreground p-2">In:</TableCell>
                                            {employees.map(emp => {
                                                const summary = daySummaries.find(s => s.employeeId === emp.id);
                                                return (
                                                    <TableCell key={`${emp.id}-in`} className="text-center tabular-nums cursor-pointer p-2" onClick={() => handleCellClick(summary, day)}>
                                                        {summary ? (summary.entries.length > 1 ? 'Multiple' : (summary.entries[0]?.timeIn ? format(summary.entries[0].timeIn.toDate(), 'p') : '-')) : '-'}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold text-muted-foreground p-2">Out:</TableCell>
                                             {employees.map(emp => {
                                                const summary = daySummaries.find(s => s.employeeId === emp.id);
                                                return (
                                                    <TableCell key={`${emp.id}-out`} className="text-center tabular-nums cursor-pointer p-2" onClick={() => handleCellClick(summary, day)}>
                                                        {summary ? (summary.entries.length > 1 ? 'Multiple' : (summary.entries[0]?.timeOut ? format(summary.entries[0].timeOut.toDate(), 'p') : (summary.entries[0]?.timeIn ? <span className="text-accent font-semibold">ACTIVE</span> : '-'))) : '-'}
                                                    TableCell>
                                                );
                                            })}
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="font-bold border-b p-2">Total:</TableCell>
                                            {employees.map(emp => {
                                                const summary = daySummaries.find(s => s.employeeId === emp.id);
                                                return (
                                                    <TableCell key={`${emp.id}-total`} className="text-center font-bold tabular-nums border-b cursor-pointer p-2" onClick={() => handleCellClick(summary, day)}>
                                                        {summary && summary.totalHours > 0 ? `${summary.totalHours.toFixed(2)}` : '-'}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="text-right font-bold p-2">Total Hours</TableCell>
                                {employees.map(emp => (
                                     <TableCell key={emp.id} className="text-center font-bold text-primary tabular-nums p-2">
                                        {(employeeTotals.get(emp.id) || 0).toFixed(2)}
                                     </TableCell>
                                ))}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No employees found. Add an employee to get started.
                </div>
            )
           )}
        </CardContent>
      </Card>

        <DailyActivityDialog
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            date={selectedCellDetails.date}
            summary={selectedCellDetails.summary}
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

    