
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, Users, Pencil, AlertTriangle, Loader2, FileSpreadsheet, Trash2 } from "lucide-react";
import { format, differenceInMinutes, startOfDay, isSameDay, subDays, eachDayOfInterval, parse, isValid, addDays } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx-js-style';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
    employeeId: string;
    employeeName: string;
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
                        Enter your 4-digit PIN to modify this time entry.
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

const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    let formatted = rawValue;
    if (rawValue.length > 2) {
        formatted = `${rawValue.slice(0, 2)}:${rawValue.slice(2, 4)}`;
    }
    fieldOnChange(formatted);
};


function AddTimeEntryDialog({ isOpen, onClose, employee, date, onSave }: { isOpen: boolean, onClose: () => void, employee: Employee | null, date: Date | null, onSave: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    const [timeIn, setTimeIn] = React.useState('09:00');
    const [timeInAmPm, setTimeInAmPm] = React.useState<'AM' | 'PM'>('AM');
    const [timeOut, setTimeOut] = React.useState('05:00');
    const [timeOutAmPm, setTimeOutAmPm] = React.useState<'AM' | 'PM'>('PM');

    const handleSave = async () => {
        if (!user || !employee || !date) return;
        setError('');

        const timeInDate = parse(`${timeIn} ${timeInAmPm}`, 'hh:mm a', date);
        const timeOutDate = parse(`${timeOut} ${timeOutAmPm}`, 'hh:mm a', date);
        
        if (timeOutDate < timeInDate) {
            setError('Clock-out time cannot be before clock-in time.');
            return;
        }
        
        setIsSaving(true);
        try {
            const timeEntriesRef = collection(db, 'users', user.uid, 'employees', employee.id, 'timeEntries');
            await addDoc(timeEntriesRef, {
                timeIn: Timestamp.fromDate(timeInDate),
                timeOut: Timestamp.fromDate(timeOutDate),
                employeeId: employee.id,
                employeeName: employee.firstName,
            });
            toast({ title: 'Success', description: 'Time entry created successfully.' });
            onSave();
        } catch (err) {
            console.error('Error creating time entry:', err);
            toast({ title: 'Error', description: 'Failed to create time entry.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!employee || !date) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Time Entry</DialogTitle>
                    <DialogDescription>
                        Create a new entry for {employee.firstName} on {format(date, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{error}</AlertTitle></Alert>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Clock In</Label>
                            <div className="flex gap-2">
                                <Input value={timeIn} onChange={(e) => handleTimeInputChange(e, setTimeIn)} placeholder="hh:mm" />
                                <Select value={timeInAmPm} onValueChange={(v: 'AM' | 'PM') => setTimeInAmPm(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label>Clock Out</Label>
                            <div className="flex gap-2">
                                <Input value={timeOut} onChange={(e) => handleTimeInputChange(e, setTimeOut)} placeholder="hh:mm" />
                                <Select value={timeOutAmPm} onValueChange={(v: 'AM' | 'PM') => setTimeOutAmPm(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function EditTimeEntryDialog({ isOpen, onClose, entry, date, onSave, onDeleteRequest }: { isOpen: boolean, onClose: () => void, entry: TimeEntry | null, date: Date | null, onSave: () => void, onDeleteRequest: (entry: TimeEntry) => void }) {
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
                                <Input value={timeIn} onChange={(e) => handleTimeInputChange(e, setTimeIn)} placeholder="hh:mm" />
                                <Select value={timeInAmPm} onValueChange={(v: 'AM' | 'PM') => setTimeInAmPm(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label>Clock Out</Label>
                            <div className="flex gap-2">
                                <Input value={timeOut} onChange={(e) => handleTimeInputChange(e, setTimeOut)} placeholder="hh:mm" disabled={!isClockedOut} />
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
                <DialogFooter className="justify-between">
                    <Button variant="destructive" onClick={() => onDeleteRequest(entry)}>
                        <Trash2 className="mr-2 h-4 w-4"/> Delete Entry
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={onClose}>Cancel</Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save
                      </Button>
                    </div>
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
  
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [rememberDates, setRememberDates] = React.useState(false);
  
  const headerRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('timesheetDateRange');
    const lastPayrollEndDateStr = localStorage.getItem('lastPayrollEndDate');

    if (saved) {
      const { from, to, remembered } = JSON.parse(saved);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isValid(fromDate) && isValid(toDate) && remembered) {
        setDateRange({ from: fromDate, to: toDate });
        setRememberDates(true);
        return; // Prioritize saved dates
      }
    }
    
    if (lastPayrollEndDateStr) {
        const lastEndDate = new Date(lastPayrollEndDateStr);
        const newStartDate = addDays(lastEndDate, 1);
        const newEndDate = addDays(newStartDate, 13);
        setDateRange({ from: newStartDate, to: newEndDate });
    } else {
        // Fallback to last 14 days if nothing is stored
        const fourteenDaysAgo = subDays(new Date(), 13);
        setDateRange({ from: fourteenDaysAgo, to: new Date() });
    }
  }, []);

  React.useEffect(() => {
    if (rememberDates && dateRange?.from && dateRange?.to) {
      localStorage.setItem('timesheetDateRange', JSON.stringify({ from: dateRange.from, to: dateRange.to, remembered: true }));
    } else {
      localStorage.removeItem('timesheetDateRange');
    }
  }, [dateRange, rememberDates]);


  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedCellDetails, setSelectedCellDetails] = React.useState<{ date: Date | null; summary: DailySummary | null }>({ date: null, summary: null });
  const [isPinDialogOpen, setIsPinDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [entryToEdit, setEntryToEdit] = React.useState<{entry: TimeEntry, date: Date} | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [entryToAdd, setEntryToAdd] = React.useState<{employee: Employee, date: Date} | null>(null);

  const [actionType, setActionType] = React.useState<'edit' | 'add' | 'delete' | null>(null);

  
  const fetchData = React.useCallback(async () => {
     if (!user || !dateRange?.from || !dateRange?.to) {
        setDailySummaries([]);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
        const employeesQuery = query(employeesCollectionRef, orderBy('firstName', 'asc'));
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
            const employeeEntries: TimeEntry[] = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), employeeId: employee.id, employeeName: employee.firstName } as TimeEntry));

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
                    employeeName: employee.firstName,
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

  const handleCellClick = (employee: Employee, date: Date) => {
    const summary = dailySummaries.find(s => s.employeeId === employee.id && isSameDay(s.date, date));
    if (summary) {
      setSelectedCellDetails({ date: summary.date, summary: summary });
      setIsDetailsDialogOpen(true);
    } else {
      setActionType('add');
      setEntryToAdd({ employee, date });
      setIsPinDialogOpen(true);
    }
  };


  const handleEditRequest = (entry: TimeEntry) => {
    if (selectedCellDetails.date) {
        setActionType('edit');
        setEntryToEdit({ entry, date: selectedCellDetails.date });
        setIsPinDialogOpen(true);
    }
  };
  
  const handleDeleteRequest = (entry: TimeEntry) => {
    setActionType('delete');
    setEntryToEdit({ entry, date: new Date() }); // date is not important here, just need entry
    setIsPinDialogOpen(true);
  }

  const handleDeleteEntry = async () => {
    if (!user || !entryToEdit) return;

    try {
        const { entry } = entryToEdit;
        const entryDocRef = doc(db, 'users', user.uid, 'employees', entry.employeeId, 'timeEntries', entry.id);
        await deleteDoc(entryDocRef);
        toast({ title: 'Success', description: 'Time entry deleted.' });
        handleEditSave(); // This will close dialogs and refetch data
    } catch (error) {
        console.error("Error deleting entry:", error);
        toast({ title: 'Error', description: 'Failed to delete time entry.', variant: 'destructive' });
    }
  };

  const handlePinVerified = () => {
    setIsPinDialogOpen(false);
    if (actionType === 'edit' && entryToEdit) {
        setIsDetailsDialogOpen(false);
        setIsEditDialogOpen(true);
    } else if (actionType === 'add' && entryToAdd) {
        setIsAddDialogOpen(true);
    } else if (actionType === 'delete' && entryToEdit) {
        handleDeleteEntry();
    }
  };

  const handleEditSave = () => {
      setIsEditDialogOpen(false);
      setEntryToEdit(null);
      setActionType(null);
      fetchData(); // Refetch data to show updated times
  }

   const handleAddSave = () => {
      setIsAddDialogOpen(false);
      setEntryToAdd(null);
      setActionType(null);
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
    const headerRow = ['Date', 'Metric', ...employees.map(e => `${e.firstName}`)];
    ws_data.push(headerRow);
    currentRow++;

    // Data rows
    days.forEach((day) => {
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
        if (currentRow > 0) {
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 2, c: 0 } });
        }
        currentRow += 3;
    });

    // Footer row
    const footerRow: (string | number)[] = ['Total Hours', '', ...employees.map(emp => (employeeTotals.get(emp.id) || 0).toFixed(2))];
    ws_data.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;

    // Set column widths
    const colWidths = [{ wch: 15 }, { wch: 8 }, ...employees.map(() => ({ wch: 20 }))];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

    const fileName = `timesheet (${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}).xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  
  const handleScroll = () => {
    if (headerRef.current && bodyRef.current) {
        headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
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
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
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
                    <div className="flex items-center space-x-2">
                        <Checkbox id="remember-dates" checked={rememberDates} onCheckedChange={(checked) => setRememberDates(!!checked)} />
                        <Label htmlFor="remember-dates" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Remember these dates
                        </Label>
                    </div>
                    <Button variant="outline" onClick={handleExportToExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export
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
                <div className="border rounded-lg">
                    {/* Synced Sticky Header */}
                    <div className="relative overflow-hidden" ref={headerRef}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px] sticky left-0 bg-card z-20">Date</TableHead>
                                    <TableHead className="w-[80px] sticky left-[120px] bg-card z-20">Metric</TableHead>
                                    {employees.map(emp => (
                                        <TableHead key={emp.id} className="min-w-[150px] text-center">{emp.firstName}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                        </Table>
                    </div>
                    {/* Scrolling Body */}
                    <div className="max-h-[60vh] overflow-auto" ref={bodyRef} onScroll={handleScroll}>
                        <Table>
                            <TableBody>
                                {days.map(day => {
                                    const daySummaries = dailySummaries.filter(s => isSameDay(s.date, day));
                                    return (
                                        <React.Fragment key={day.toISOString()}>
                                            <TableRow>
                                                <TableCell rowSpan={3} className="font-medium align-top pt-3 border-b sticky left-0 bg-card z-10 w-[120px]">
                                                    {format(day, 'eee, MMM dd')}
                                                </TableCell>
                                                <TableCell className="font-semibold text-muted-foreground p-2 sticky left-[120px] bg-card z-10 w-[80px]">In:</TableCell>
                                                {employees.map(emp => {
                                                    const summary = daySummaries.find(s => s.employeeId === emp.id);
                                                    return (
                                                        <TableCell key={`${emp.id}-in`} className="text-center tabular-nums cursor-pointer p-2 min-w-[150px]" onClick={() => handleCellClick(emp, day)}>
                                                            {summary ? (summary.entries.length > 1 ? 'Multiple' : (summary.entries[0]?.timeIn ? format(summary.entries[0].timeIn.toDate(), 'p') : '-')) : '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold text-muted-foreground p-2 sticky left-[120px] bg-card z-10 w-[80px]">Out:</TableCell>
                                                {employees.map(emp => {
                                                    const summary = daySummaries.find(s => s.employeeId === emp.id);
                                                    return (
                                                        <TableCell key={`${emp.id}-out`} className="text-center tabular-nums cursor-pointer p-2 min-w-[150px]" onClick={() => handleCellClick(emp, day)}>
                                                            {summary ? (summary.entries.length > 1 ? 'Multiple' : (summary.entries[0]?.timeOut ? format(summary.entries[0].timeOut.toDate(), 'p') : (summary.entries[0]?.timeIn ? <span className="text-accent font-semibold">ACTIVE</span> : '-'))) : '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-bold p-2 sticky left-[120px] bg-card z-10 w-[80px]">Total:</TableCell>
                                                {employees.map(emp => {
                                                    const summary = daySummaries.find(s => s.employeeId === emp.id);
                                                    return (
                                                        <TableCell key={`${emp.id}-total`} className="text-center font-bold tabular-nums cursor-pointer p-2 min-w-[150px]" onClick={() => handleCellClick(emp, day)}>
                                                            {summary && summary.totalHours > 0 ? `${summary.totalHours.toFixed(2)}` : '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        </React.Fragment>
                                    )
                                })}
                                {/* Footer Row */}
                                <TableRow>
                                     <TableCell colSpan={2} className="sticky left-0 bg-card z-10 font-bold p-2 text-right w-[200px]">Total Hours</TableCell>
                                     {employees.map(emp => (
                                        <TableCell key={emp.id} className="font-bold text-primary tabular-nums p-2 text-center min-w-[150px]">
                                            {(employeeTotals.get(emp.id) || 0).toFixed(2)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
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
            onDeleteRequest={handleDeleteRequest}
        />

        <AddTimeEntryDialog
            isOpen={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            employee={entryToAdd?.employee ?? null}
            date={entryToAdd?.date ?? null}
            onSave={handleAddSave}
        />

    </div>
  );
}
