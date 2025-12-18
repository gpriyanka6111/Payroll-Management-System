

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Pencil, AlertTriangle, Loader2, FileSpreadsheet, Save, XCircle } from "lucide-react";
import { format, differenceInMinutes, startOfDay, isSameDay, eachDayOfInterval, parse, isValid, getYear, isAfter, endOfToday } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import type { Employee } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import * as XLSX from 'xlsx-js-style';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { getYearlyPayPeriods, PayPeriod, getCurrentPayPeriod, getPayDateForPeriod } from '@/lib/pay-period';
import { cn } from '@/lib/utils';
import { applyRoundingRules } from '@/lib/time-rounding';


interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
    employeeId: string;
    employeeName: string;
}

interface DailySummary {
    employeeId: string;
    date: Date;
    entries: TimeEntry[];
}

interface EditableCell {
    time: string; // "HH:mm"
    period: 'AM' | 'PM' | '';
}
type EditableGridState = Record<string, Record<string, { in: EditableCell, out: EditableCell }>>;

function PinDialog({ open, onOpenChange, onPinVerified, description }: { open: boolean, onOpenChange: (open: boolean) => void, onPinVerified: () => void, description: string }) {
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
            } else {
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
                    <DialogDescription>{description}</DialogDescription>
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
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify PIN"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const parseTimeInput = (time: string, period: 'AM' | 'PM' | '', date: Date): Date | null => {
    if (!time.trim() || !period) return null;
    const timeStr = `${time} ${period}`;
    const parsedDate = parse(timeStr, 'hh:mm a', date);
    return isValid(parsedDate) ? parsedDate : null;
};

const formatTimeForEdit = (date: Date | null | undefined): EditableCell => {
    if (!date || !isValid(date)) return { time: '', period: '' };
    return {
        time: format(date, 'hh:mm'),
        period: format(date, 'a') as 'AM' | 'PM'
    }
}

export default function TimesheetPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [employees, setEmployees] = React.useState<Employee[]>([]);
    const [dailySummaries, setDailySummaries] = React.useState<DailySummary[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
    const [payPeriods, setPayPeriods] = React.useState<PayPeriod[]>([]);
    const [selectedPeriodValue, setSelectedPeriodValue] = React.useState('');
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [editableGrid, setEditableGrid] = React.useState<EditableGridState>({});
    const [isPinDialogOpen, setIsPinDialogOpen] = React.useState(false);
    const [pinAction, setPinAction] = React.useState<'enable_edit' | 'save_changes' | null>(null);
    const [companyName, setCompanyName] = React.useState('Your Company');
    const headerRef = React.useRef<HTMLDivElement>(null);
    const bodyRef = React.useRef<HTMLDivElement>(null);


    const handleScroll = () => {
        if (headerRef.current && bodyRef.current) {
            headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
        }
    };


    React.useEffect(() => {
        const today = new Date();
        const currentYear = getYear(today);
        const periods = getYearlyPayPeriods(currentYear);
        setPayPeriods(periods);

        const currentPeriod = getCurrentPayPeriod(today);
        const initialValue = `${format(currentPeriod.start, 'yyyy-MM-dd')}_${format(currentPeriod.end, 'yyyy-MM-dd')}`;
        setSelectedPeriodValue(initialValue);
        setDateRange({ from: currentPeriod.start, to: currentPeriod.end });
    }, []);

    const handlePeriodChange = (value: string) => {
        setSelectedPeriodValue(value);
        const [fromStr, toStr] = value.split('_');
        const fromDate = parse(fromStr, 'yyyy-MM-dd', new Date());
        const toDate = parse(toStr, 'yyyy-MM-dd', new Date());
        if (isValid(fromDate) && isValid(toDate)) {
            setDateRange({ from: fromDate, to: toDate });
        }
    };

    const fetchData = React.useCallback(async () => {
        if (!user || !dateRange?.from || !dateRange?.to) {
            setDailySummaries([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                setCompanyName(userSnap.data().companyName || "My Small Business");
            }

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

                const entriesByDay = new Map<string, { entries: TimeEntry[] }>();
                employeeEntries.forEach(entry => {
                    const dayKey = format(startOfDay(entry.timeIn.toDate()), 'yyyy-MM-dd');
                    const dayData = entriesByDay.get(dayKey) || { entries: [] };
                    dayData.entries.push(entry);
                    entriesByDay.set(dayKey, dayData);
                });

                entriesByDay.forEach((data, dayKey) => {
                    allSummaries.push({
                        employeeId: employee.id,
                        date: parse(dayKey, 'yyyy-MM-dd', new Date()),
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
    
    const initializeEditGrid = () => {
        const grid: EditableGridState = {};
        const days = dateRange?.from && dateRange.to ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }) : [];

        employees.forEach(emp => {
            grid[emp.id] = {};
            days.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const summary = dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day));
                const entry = summary?.entries[0]; // Simplified: only supports one entry per day for now.
                
                grid[emp.id][dayKey] = {
                    in: formatTimeForEdit(entry?.timeIn?.toDate()),
                    out: formatTimeForEdit(entry?.timeOut?.toDate()),
                };
                 if (grid[emp.id][dayKey].in.time && !grid[emp.id][dayKey].in.period) {
                    grid[emp.id][dayKey].in.period = 'AM';
                }
                if (grid[emp.id][dayKey].out.time && !grid[emp.id][dayKey].out.period) {
                    grid[emp.id][dayKey].out.period = 'PM';
                }
            });
        });
        setEditableGrid(grid);
    };
    
    const handlePinVerified = () => {
        setIsPinDialogOpen(false);
        if (pinAction === 'enable_edit') {
            initializeEditGrid();
            setIsEditMode(true);
        } else if (pinAction === 'save_changes') {
            handleSaveChanges();
        }
        setPinAction(null);
    };

    const handleEditClick = () => {
        setPinAction('enable_edit');
        setIsPinDialogOpen(true);
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditableGrid({});
    };

    const handleSaveClick = () => {
        setPinAction('save_changes');
        setIsPinDialogOpen(true);
    };
    
    const handleTimeInputChange = (employeeId: string, dateKey: string, field: 'in' | 'out', value: string) => {
        const numbers = value.replace(/\D/g, '').substring(0, 4);
        let formattedTime = numbers;
        if (numbers.length > 2) {
            formattedTime = `${numbers.substring(0, 2)}:${numbers.substring(2, 4)}`;
        }
        
        setEditableGrid(prev => {
            const newGrid = JSON.parse(JSON.stringify(prev)); // Deep copy
            if (!newGrid[employeeId]) newGrid[employeeId] = {};
            if (!newGrid[employeeId][dateKey]) newGrid[employeeId][dateKey] = { in: { time: '', period: '' }, out: { time: '', period: '' } };

            const currentPeriod = newGrid[employeeId][dateKey][field].period;
            let newPeriod = currentPeriod;
            if (formattedTime.length >= 2 && !currentPeriod) {
                newPeriod = field === 'in' ? 'AM' : 'PM';
            }

            newGrid[employeeId][dateKey][field] = { time: formattedTime, period: newPeriod };
            return newGrid;
        });
    };

    const handlePeriodChangeForCell = (employeeId: string, dateKey: string, field: 'in' | 'out', period: 'AM' | 'PM') => {
        setEditableGrid(prev => ({
            ...prev,
            [employeeId]: {
                ...prev[employeeId],
                [dateKey]: {
                    ...prev[employeeId][dateKey],
                    [field]: {
                        ...prev[employeeId][dateKey][field],
                        period: period
                    }
                }
            }
        }));
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const days = dateRange?.from && dateRange.to ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }) : [];

            for (const emp of employees) {
                for (const day of days) {
                    if (isAfter(day, endOfToday())) continue; // Safeguard: skip future dates

                    const dateKey = format(day, 'yyyy-MM-dd');
                    const originalSummary = dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day));
                    const originalEntry = originalSummary?.entries[0];
                    const editedCell = editableGrid[emp.id]?.[dateKey];

                    if (!editedCell) continue;

                    const newTimeIn = parseTimeInput(editedCell.in.time, editedCell.in.period, day);
                    const newTimeOut = parseTimeInput(editedCell.out.time, editedCell.out.period, day);

                    if (originalEntry) { // Existing entry needs update or deletion
                        if (newTimeIn) { // Update
                            batch.update(doc(db, 'users', user.uid, 'employees', emp.id, 'timeEntries', originalEntry.id), {
                                timeIn: Timestamp.fromDate(newTimeIn),
                                timeOut: newTimeOut ? Timestamp.fromDate(newTimeOut) : null,
                            });
                        } else { // Delete
                            batch.delete(doc(db, 'users', user.uid, 'employees', emp.id, 'timeEntries', originalEntry.id));
                        }
                    } else if (newTimeIn) { // New entry needs creation
                        const newEntryRef = doc(collection(db, 'users', user.uid, 'employees', emp.id, 'timeEntries'));
                        batch.set(newEntryRef, {
                            employeeId: emp.id,
                            employeeName: emp.firstName,
                            timeIn: Timestamp.fromDate(newTimeIn),
                            timeOut: newTimeOut ? Timestamp.fromDate(newTimeOut) : null,
                        });
                    }
                }
            }
            await batch.commit();
            toast({ title: "Success", description: "Timesheet updated successfully." });
            setIsEditMode(false);
            setEditableGrid({});
            await fetchData();
        } catch (error) {
            console.error("Error saving timesheet:", error);
            toast({ title: "Error", description: "Failed to save timesheet.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTotalHours = (employeeId: string, date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const cell = editableGrid[employeeId]?.[dateKey];
        if (!cell) return 0;

        let timeIn = parseTimeInput(cell.in.time, cell.in.period, date);
        let timeOut = parseTimeInput(cell.out.time, cell.out.period, date);

        if (timeIn) timeIn = applyRoundingRules(timeIn);
        if (timeOut) timeOut = applyRoundingRules(timeOut);
        
        if (timeIn && timeOut && timeOut > timeIn) {
            return differenceInMinutes(timeOut, timeIn) / 60;
        }
        return 0;
    };

    const calculateEmployeeTotal = (employeeId: string) => {
        const days = dateRange?.from && dateRange.to ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }) : [];
        return days.reduce((total, day) => total + calculateTotalHours(employeeId, day), 0);
    };

    const employeeTotals = React.useMemo(() => {
        const totals = new Map<string, number>();
        employees.forEach(emp => {
            const sum = dailySummaries
                .filter(s => s.employeeId === emp.id)
                .reduce((acc, s) => acc + s.entries.reduce((dayTotal, entry) => {
                    if (entry.timeIn && entry.timeOut) {
                        const roundedIn = applyRoundingRules(entry.timeIn.toDate());
                        const roundedOut = applyRoundingRules(entry.timeOut.toDate());
                        const minutes = differenceInMinutes(roundedOut, roundedIn);
                        return dayTotal + (minutes > 0 ? minutes / 60 : 0);
                    }
                    return dayTotal;
                }, 0), 0);
            totals.set(emp.id, sum);
        });
        return totals;
    }, [employees, dailySummaries]);

    const handleExportToExcel = () => {
        if (!dateRange?.from || !dateRange.to) return;

        if (employees.length === 0) {
            toast({
                title: 'No Employees',
                description: 'There are no employees to export a timesheet for.',
                variant: 'destructive',
            });
            return;
        }

        const wb = XLSX.utils.book_new();
        const sheetName = "Timesheet";
        const ws_data: (string | number | null)[][] = [];
        const daysInPeriod = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

        const EMPLOYEES_PER_PAGE = 6;
        const employeePages = [];
        for (let i = 0; i < employees.length; i += EMPLOYEES_PER_PAGE) {
            employeePages.push(employees.slice(i, i + EMPLOYEES_PER_PAGE));
        }

        employeePages.forEach((page, pageIndex) => {
            // Add space between pages
            if (pageIndex > 0) {
                ws_data.push([]);
            }

            // Page Header
            const payDate = getPayDateForPeriod(dateRange.from);
            const payDateStr = payDate ? `Pay Date: ${format(payDate, 'LLL dd, yyyy')}` : '';
            const title = `${companyName} - Time Report: ${format(dateRange.from, 'LLL dd, yyyy')} - ${format(dateRange.to, 'LLL dd, yyyy')} - ${payDateStr}`;
            ws_data.push([title, null, null, null, null, null, null, null]);

            const employeeHeaders = page.map(e => e.firstName.toUpperCase());
            const paddedEmployeeHeaders = [...employeeHeaders, ...Array(EMPLOYEES_PER_PAGE - employeeHeaders.length).fill(null)];
            ws_data.push(['Date', 'Metric', ...paddedEmployeeHeaders]);

            // Page Body
            daysInPeriod.forEach(day => {
                const inRow: (string | number | null)[] = [format(day, 'eee, MMM dd'), 'In:'];
                const outRow: (string | number | null)[] = [null, 'Out:'];
                const totalRow: (string | number | null)[] = [null, 'Total:'];

                page.forEach(emp => {
                    const summary = dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day));
                    const entry = summary?.entries[0];
                    let dailyTotal = 0;

                    if (entry) {
                        inRow.push(format(entry.timeIn.toDate(), 'p'));
                        if (entry.timeOut) {
                            outRow.push(format(entry.timeOut.toDate(), 'p'));
                            const roundedIn = applyRoundingRules(entry.timeIn.toDate());
                            const roundedOut = applyRoundingRules(entry.timeOut.toDate());
                            const minutes = differenceInMinutes(roundedOut, roundedIn);
                            dailyTotal = minutes > 0 ? minutes / 60 : 0;
                        } else {
                            outRow.push('ACTIVE');
                        }
                    } else {
                        inRow.push('-');
                        outRow.push('-');
                    }
                    totalRow.push(dailyTotal > 0 ? parseFloat(dailyTotal.toFixed(2)) : '-');
                });

                // Pad rows to 6 employees
                const paddingNeeded = EMPLOYEES_PER_PAGE - page.length;
                inRow.push(...Array(paddingNeeded).fill('-'));
                outRow.push(...Array(paddingNeeded).fill('-'));
                totalRow.push(...Array(paddingNeeded).fill('-'));

                ws_data.push(inRow, outRow, totalRow);
            });

            // Page Footer (Totals)
            const grandTotalRow: (string | number | null)[] = ['Total Hours', null];
            page.forEach(emp => {
                const total = employeeTotals.get(emp.id) || 0;
                grandTotalRow.push(parseFloat(total.toFixed(2)));
            });
            grandTotalRow.push(...Array(EMPLOYEES_PER_PAGE - page.length).fill(null));
            ws_data.push(grandTotalRow);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // --- STYLING AND MERGING ---
        const merges: XLSX.Range[] = [];
        let currentRow = 0;

        employeePages.forEach(() => {
            if (currentRow > 0) currentRow++;

            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 7 } });

            let mergeStartRow = currentRow + 2;
            daysInPeriod.forEach(() => {
                merges.push({ s: { r: mergeStartRow, c: 0 }, e: { r: mergeStartRow + 2, c: 0 } });
                mergeStartRow += 3;
            });
            
            merges.push({ s: { r: mergeStartRow, c: 0 }, e: { r: mergeStartRow, c: 1 } });
            
            currentRow = mergeStartRow + 1;
        });

        ws['!merges'] = merges;
        
        ws['!cols'] = [
            { wch: 14 }, { wch: 5 },
            ...Array(6).fill({ wch: 10 })
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const fileName = `Timesheet_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };


    const days = dateRange && dateRange.from && dateRange.to ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }) : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-4">
                    <Button variant="outline" asChild className="w-fit">
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Timesheet</h1>
                        <p className="text-muted-foreground">Review total logged hours for all employees.</p>
                    </div>
                </div>
            </div>

            <Card>
                <div className="p-6 sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <CardTitle>Time Log Summary</CardTitle>
                            <CardDescription>Select a pay period to view time entries.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
                            <Select value={selectedPeriodValue} onValueChange={handlePeriodChange}>
                                <SelectTrigger className="w-full sm:w-[380px]">
                                    <SelectValue placeholder="Select a pay period..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {payPeriods.map((period, index) => {
                                        const value = `${format(period.start, 'yyyy-MM-dd')}_${format(period.end, 'yyyy-MM-dd')}`;
                                        return (
                                            <SelectItem key={index} value={value}>
                                                {format(period.start, 'MM/dd/yy')} - {format(period.end, 'MM/dd/yy')} (Pay Date: {format(period.payDate, 'MM/dd/yy')})
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                            {!isEditMode ? (
                                <>
                                    <Button variant="outline" onClick={handleExportToExcel}><FileSpreadsheet className="mr-2 h-4 w-4" />Export</Button>
                                    <Button onClick={handleEditClick}><Pencil className="mr-2 h-4 w-4" />Edit Times</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={handleCancelEdit}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                                    <Button onClick={handleSaveClick}><Save className="mr-2 h-4 w-4" />Save Changes</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                    ) : employees.length > 0 ? (
                       <div className="border rounded-lg">
                            {/* Synced Sticky Header */}
                            <div className="relative overflow-hidden" ref={headerRef}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px] sticky left-0 bg-card z-20">Date</TableHead>
                                            <TableHead className="w-[80px] sticky left-[120px] bg-card z-20">Metric</TableHead>
                                            {employees.map(emp => (
                                                <TableHead key={emp.id} className="min-w-[200px] text-center">{emp.firstName}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                            </div>

                            {/* Scrolling Body */}
                            <div className="max-h-[calc(100vh-25rem)] overflow-auto" ref={bodyRef} onScroll={handleScroll}>
                                <Table>
                                    <TableBody>
                                        {days.map(day => {
                                            const dateKey = format(day, 'yyyy-MM-dd');
                                            const isFutureDate = isAfter(day, endOfToday());
                                            return (
                                                <React.Fragment key={day.toISOString()}>
                                                    <TableRow>
                                                        <TableCell rowSpan={3} className="sticky left-0 bg-card z-10 font-medium align-top pt-3 border-b w-[120px]">{format(day, 'eee, MMM dd')}</TableCell>
                                                        <TableCell className="sticky left-[120px] bg-card z-10 font-semibold text-muted-foreground p-2 w-[80px]">In:</TableCell>
                                                        {employees.map(emp => (
                                                            <TableCell key={`${emp.id}-in`} className="text-center p-1 min-w-[200px]">
                                                                {isEditMode ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <Input value={editableGrid[emp.id]?.[dateKey]?.in.time || ''} onChange={(e) => handleTimeInputChange(emp.id, dateKey, 'in', e.target.value)} className="h-8 text-center" placeholder="hh:mm" disabled={isFutureDate} />
                                                                        <div className="flex flex-col">
                                                                            <Button size="icon" variant="ghost" className={cn("h-4 w-6 text-xs", editableGrid[emp.id]?.[dateKey]?.in.period === 'AM' && 'bg-accent text-accent-foreground')} onClick={() => handlePeriodChangeForCell(emp.id, dateKey, 'in', 'AM')} disabled={isFutureDate}>AM</Button>
                                                                            <Button size="icon" variant="ghost" className={cn("h-4 w-6 text-xs", editableGrid[emp.id]?.[dateKey]?.in.period === 'PM' && 'bg-accent text-accent-foreground')} onClick={() => handlePeriodChangeForCell(emp.id, dateKey, 'in', 'PM')} disabled={isFutureDate}>PM</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span>{dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day))?.entries[0]?.timeIn ? format(dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day))!.entries[0]!.timeIn.toDate(), 'p') : '-'}</span>
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="sticky left-[120px] bg-card z-10 font-semibold text-muted-foreground p-2 w-[80px]">Out:</TableCell>
                                                        {employees.map(emp => (
                                                            <TableCell key={`${emp.id}-out`} className="text-center p-1 min-w-[200px]">
                                                                {isEditMode ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <Input value={editableGrid[emp.id]?.[dateKey]?.out.time || ''} onChange={(e) => handleTimeInputChange(emp.id, dateKey, 'out', e.target.value)} className="h-8 text-center" placeholder="hh:mm" disabled={isFutureDate}/>
                                                                        <div className="flex flex-col">
                                                                            <Button size="icon" variant="ghost" className={cn("h-4 w-6 text-xs", editableGrid[emp.id]?.[dateKey]?.out.period === 'AM' && 'bg-accent text-accent-foreground')} onClick={() => handlePeriodChangeForCell(emp.id, dateKey, 'out', 'AM')} disabled={isFutureDate}>AM</Button>
                                                                            <Button size="icon" variant="ghost" className={cn("h-4 w-6 text-xs", editableGrid[emp.id]?.[dateKey]?.out.period === 'PM' && 'bg-accent text-accent-foreground')} onClick={() => handlePeriodChangeForCell(emp.id, dateKey, 'out', 'PM')} disabled={isFutureDate}>PM</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span>{dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day))?.entries[0]?.timeOut ? format(dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day))!.entries[0]!.timeOut!.toDate(), 'p') : (dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day))?.entries[0] ? <span className="text-accent font-semibold">ACTIVE</span> : '-')}</span>
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="sticky left-[120px] bg-card z-10 font-bold p-2 w-[80px]">Total:</TableCell>
                                                        {employees.map(emp => {
                                                            let dailyTotal = 0;
                                                            if (isEditMode) {
                                                                dailyTotal = calculateTotalHours(emp.id, day);
                                                            } else {
                                                                const summary = dailySummaries.find(s => s.employeeId === emp.id && isSameDay(s.date, day));
                                                                if (summary && summary.entries[0]?.timeIn && summary.entries[0]?.timeOut) {
                                                                    const roundedIn = applyRoundingRules(summary.entries[0].timeIn.toDate());
                                                                    const roundedOut = applyRoundingRules(summary.entries[0].timeOut.toDate());
                                                                    const minutes = differenceInMinutes(roundedOut, roundedIn);
                                                                    dailyTotal = minutes > 0 ? minutes / 60 : 0;
                                                                }
                                                            }
                                                            return (
                                                                <TableCell key={`${emp.id}-total`} className="text-center font-bold tabular-nums p-2 min-w-[200px]">
                                                                    {dailyTotal.toFixed(2)}
                                                                </TableCell>
                                                            )
                                                        })}
                                                    </TableRow>
                                                </React.Fragment>
                                            )
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="bg-card">
                                            <TableCell colSpan={2} className="sticky left-0 bg-card z-10 font-bold p-2 text-right text-base">Total Hours</TableCell>
                                            {employees.map(emp => (
                                                <TableCell key={emp.id} className="font-bold text-primary tabular-nums p-2 text-center text-base">
                                                    {isEditMode ? calculateEmployeeTotal(emp.id).toFixed(2) : (employeeTotals.get(emp.id) || 0).toFixed(2)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">No employees found. Add an employee to get started.</div>
                    )}
                </CardContent>
            </Card>

            <PinDialog
                open={isPinDialogOpen}
                onOpenChange={setIsPinDialogOpen}
                description={pinAction === 'enable_edit' ? "Enter your PIN to enable editing." : "Enter your PIN to save all changes."}
                onPinVerified={handlePinVerified}
            />
        </div>
    );
}

    

    








