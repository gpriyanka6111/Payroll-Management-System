
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, CheckCircle, Users, Briefcase, Hourglass, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { format, differenceInHours, differenceInMinutes, startOfDay, endOfDay, isBefore, getDay, parse, isValid, setHours, setMinutes } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, Timestamp, getDocs, limit, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
    employeeId: string;
    employeeName: string;
}

function MissedClockOutDialog({
    isOpen,
    onClose,
    staleEntry,
    onUpdate,
}: {
    isOpen: boolean;
    onClose: () => void;
    staleEntry: TimeEntry | null;
    onUpdate: () => void;
}) {
    const [clockOutDate, setClockOutDate] = React.useState<Date | undefined>();
    const [clockOutTime, setClockOutTime] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState('');
    const { user } = useAuth();
    const { toast } = useToast();

    React.useEffect(() => {
        if (staleEntry) {
            setClockOutDate(staleEntry.timeIn.toDate());
        }
    }, [staleEntry]);

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        let formatted = value;
        if (value.length > 2) {
            formatted = `${value.substring(0, 2)}:${value.substring(2, 4)}`;
        }
        setClockOutTime(formatted);
    };

    const handleSubmit = async () => {
        if (!user || !staleEntry || !clockOutDate || !clockOutTime) {
            setError('Please select a valid date and time.');
            return;
        }

        const [hours, minutes] = clockOutTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            setError('Invalid time format. Please use HH:MM (24-hour).');
            return;
        }
        
        const finalClockOutDate = setMinutes(setHours(clockOutDate, hours), minutes);

        if (isBefore(finalClockOutDate, staleEntry.timeIn.toDate())) {
            setError('Clock-out time cannot be before the clock-in time.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const entryDocRef = doc(db, 'users', user.uid, 'employees', staleEntry.employeeId, 'timeEntries', staleEntry.id);
            await updateDoc(entryDocRef, {
                timeOut: Timestamp.fromDate(finalClockOutDate),
            });
            toast({
                title: 'Shift Updated',
                description: `Corrected clock-out for ${staleEntry.employeeName}.`,
            });
            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to update shift. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!staleEntry) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Missed Clock-Out</DialogTitle>
                    <DialogDescription>
                        {staleEntry.employeeName} forgot to clock out on{' '}
                        <span className="font-semibold">{format(staleEntry.timeIn.toDate(), 'eeee, MMM d')}</span>.
                        The shift started at{' '}
                        <span className="font-semibold">{format(staleEntry.timeIn.toDate(), 'p')}</span>.
                        <br />
                        Please enter the correct clock-out time below.
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Clock-Out Date</label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={'outline'} className={cn("w-full justify-start text-left font-normal", !clockOutDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {clockOutDate ? format(clockOutDate, 'LLL dd, y') : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={clockOutDate} onSelect={setClockOutDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Clock-Out Time (24h)</label>
                            <Input
                                placeholder="HH:MM"
                                value={clockOutTime}
                                onChange={handleTimeChange}
                                maxLength={5}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Clock-Out
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [activeTimeEntry, setActiveTimeEntry] = React.useState<TimeEntry | null>(null);
  const [todaysGlobalEntries, setTodaysGlobalEntries] = React.useState<TimeEntry[]>([]);

  const [isMissedClockOutDialogOpen, setIsMissedClockOutDialogOpen] = React.useState(false);
  const [staleEntryToFix, setStaleEntryToFix] = React.useState<TimeEntry | null>(null);
  
  // Effect for the live clock
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Master effect to fetch all data
  React.useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    
    setIsLoading(true);
    let employeeUnsubscriber: () => void;
    let timeEntryUnsubscribers: (() => void)[] = [];

    const fetchAllData = async () => {
        try {
            // 1. Fetch employees and set up a listener
            const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
            const qEmployees = query(employeesCollectionRef, orderBy('firstName', 'asc'));
            
            employeeUnsubscriber = onSnapshot(qEmployees, (snapshot) => {
                const employeesData: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
                setEmployees(employeesData);

                if (employeesData.length > 0 && !selectedEmployeeId) {
                    setSelectedEmployeeId(employeesData[0].id);
                } else if (employeesData.length === 0) {
                    setSelectedEmployeeId(null);
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching employees:", error);
                toast({ title: "Error", description: "Could not fetch employees.", variant: "destructive" });
                setIsLoading(false);
            });

            // 2. Fetch all of today's time entries for all employees via listeners
            const todayStart = startOfDay(new Date());
            const todayEnd = endOfDay(new Date());
            const employeeSnapshot = await getDocs(qEmployees);

            // Clear previous listeners
            timeEntryUnsubscribers.forEach(unsub => unsub());
            timeEntryUnsubscribers = [];

            const allEntriesListener = onSnapshot(query(collection(db, 'users', user.uid, 'allTimeEntries'), where('timeIn', '>=', todayStart), where('timeIn', '<=', todayEnd)), (snapshot) => {
                // This is a placeholder for a more efficient root collection query if implemented.
                // For now, we rely on per-employee listeners.
            });

            // Set up listeners for each employee's time entries for today and any active entries
            employeeSnapshot.docs.forEach(empDoc => {
                const timeEntriesRef = collection(db, 'users', user.uid, 'employees', empDoc.id, 'timeEntries');
                const qEntries = query(timeEntriesRef, orderBy('timeIn', 'desc'));
                const unsub = onSnapshot(qEntries, (entrySnapshot) => {
                    const allEntries = entrySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
                    const latestEntries = allEntries.filter(entry => 
                        isAfter(entry.timeIn.toDate(), startOfDay(new Date())) || entry.timeOut === null
                    );
                    
                    setTodaysGlobalEntries(prev => {
                        const otherEntries = prev.filter(e => e.employeeId !== empDoc.id);
                        return [...otherEntries, ...latestEntries].sort((a,b) => b.timeIn.toMillis() - a.timeIn.toMillis())
                    });
                });
                timeEntryUnsubscribers.push(unsub);
            });
            
        } catch (error) {
            console.error("Dashboard data fetch error:", error);
            toast({ title: "Error", description: "Could not fetch all dashboard data.", variant: "destructive" });
            setIsLoading(false);
        }
    };
    
    fetchAllData();

    return () => {
        if (employeeUnsubscriber) employeeUnsubscriber();
        timeEntryUnsubscribers.forEach(unsub => unsub());
    };
  }, [user, toast]);


  // Effect to manage the selected employee's specific active entry
  React.useEffect(() => {
    if (!selectedEmployeeId) {
        setActiveTimeEntry(null);
        return;
    };
    
    const activeEntry = todaysGlobalEntries.find(
        entry => entry.employeeId === selectedEmployeeId && entry.timeOut === null
    );

    setActiveTimeEntry(activeEntry || null);

  }, [selectedEmployeeId, todaysGlobalEntries]);

  const handleTimeIn = async () => {
    if (!user || !selectedEmployeeId) return;
    
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    if (!selectedEmployee) return;

    // Check for a stale clock-in from a previous day
    if (activeTimeEntry && activeTimeEntry.timeIn && isBefore(activeTimeEntry.timeIn.toDate(), startOfDay(new Date()))) {
        setStaleEntryToFix(activeTimeEntry);
        setIsMissedClockOutDialogOpen(true);
        return; // Stop the clock-in process
    }

    setIsSubmitting(true);
    
    try {
      const timeEntriesRef = collection(db, 'users', user.uid, 'employees', selectedEmployeeId, 'timeEntries');
      await addDoc(timeEntriesRef, {
        timeIn: serverTimestamp(),
        timeOut: null,
        employeeId: selectedEmployeeId,
        employeeName: selectedEmployee.firstName,
      });
      
      toast({
        title: "Clocked In!",
        description: `${selectedEmployee?.firstName}'s shift has started at ${format(new Date(), 'p')}.`,
      });

    } catch (error) {
      console.error("Error clocking in:", error);
      toast({ title: "Error", description: "Failed to clock in.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeOut = async () => {
    if (!user || !selectedEmployeeId || !activeTimeEntry) return;
    setIsSubmitting(true);

    try {
        const entryDocRef = doc(db, 'users', user.uid, 'employees', selectedEmployeeId, 'timeEntries', activeTimeEntry.id);
        
        await updateDoc(entryDocRef, {
            timeOut: serverTimestamp(),
        });

        const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
        toast({
            title: "Clocked Out!",
            description: `${selectedEmployee?.firstName || 'Employee'}'s shift has ended at ${format(new Date(), 'p')}.`,
            variant: "destructive",
        });

    } catch (error) {
      console.error("Error clocking out:", error);
      toast({ title: "Error", description: "Failed to clock out.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getElapsedTime = () => {
    if (!activeTimeEntry || !activeTimeEntry.timeIn) return '0h 0m';
    const startTime = activeTimeEntry.timeIn.toDate();
    if (!startTime) return '0h 0m';
    const hours = differenceInHours(new Date(), startTime);
    const minutes = Math.floor((new Date().getTime() - startTime.getTime()) / 60000) % 60;
    return `${hours}h ${minutes}m`;
  };

  const todaysStats = React.useMemo(() => {
    const todaysEntries = todaysGlobalEntries.filter(e => isAfter(e.timeIn.toDate(), startOfDay(new Date())));
    const clockedInCount = new Set(todaysEntries.filter(entry => entry.timeOut === null).map(e => e.employeeId)).size;
    const totalHoursToday = todaysEntries.reduce((total, entry) => {
        if (entry.timeIn && entry.timeOut) {
            const minutes = differenceInMinutes(entry.timeOut.toDate(), entry.timeIn.toDate());
            return total + (minutes > 0 ? minutes / 60 : 0);
        }
        return total;
    }, 0);
    return {
        clockedIn: clockedInCount,
        totalHours: totalHoursToday.toFixed(2),
        totalEmployees: employees.length
    }
  }, [todaysGlobalEntries, employees.length]);
  
  const isEmployeeClockedIn = (employeeId: string) => {
      return todaysGlobalEntries.some(entry => entry.employeeId === employeeId && entry.timeOut === null);
  }

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Time Clock Kiosk</CardTitle>
                    <CardDescription>Select an employee to clock them in or out for their shifts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <Skeleton className="h-28 w-full" />
                            <Skeleton className="h-28 w-full" />
                            <Skeleton className="h-28 w-full" />
                        </div>
                    ) : employees.length > 0 ? (
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {employees.map(emp => (
                                <Card 
                                    key={emp.id} 
                                    className={cn(
                                        "p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                                        selectedEmployeeId === emp.id ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted/50"
                                    )}
                                    onClick={() => setSelectedEmployeeId(emp.id)}
                                >
                                    <div className="relative mb-2">
                                        <Avatar className="h-16 w-16 text-xl">
                                            <AvatarFallback>{emp.firstName?.charAt(0) || 'E'}</AvatarFallback>
                                        </Avatar>
                                        <div className={cn(
                                            "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background",
                                            isEmployeeClockedIn(emp.id) ? "bg-green-500 status-indicator" : "bg-muted-foreground"
                                        )} />
                                    </div>
                                    <p className="font-semibold">{emp.firstName}</p>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No employees found. Please add an employee in the Manager Area.</p>
                    )}

                    <Separator />
                    
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="text-center">
                            <h2 className="text-5xl font-bold tracking-tighter">{format(currentTime, 'p')}</h2>
                            <p className="text-muted-foreground">{format(currentTime, 'eeee, MMMM d, yyyy')}</p>
                        </div>
                       
                        {selectedEmployee ? (
                             activeTimeEntry ? (
                                <div className="text-center p-4 bg-accent/20 border-accent border rounded-lg">
                                    <p className="font-semibold text-accent-foreground">{selectedEmployee.firstName} is clocked in.</p>
                                    {activeTimeEntry.timeIn && (
                                    <>
                                        <p className="text-sm text-muted-foreground">Shift started at: {format(activeTimeEntry.timeIn.toDate(), 'p')}</p>
                                        <p className="text-sm text-muted-foreground">Elapsed time: {getElapsedTime()}</p>
                                    </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <p className="font-semibold text-muted-foreground">{selectedEmployee.firstName} is clocked out.</p>
                                </div>
                            )
                        ) : <div className="h-20" /> }

                        <div className="grid grid-cols-2 gap-4">
                            <Button size="lg" onClick={handleTimeIn} disabled={!selectedEmployeeId || !!activeTimeEntry || isSubmitting}>
                                <LogIn className="mr-2 h-5 w-5" /> Time In
                            </Button>
                            <Button size="lg" variant="destructive" onClick={handleTimeOut} disabled={!selectedEmployeeId || !activeTimeEntry || isSubmitting}>
                                <LogOut className="mr-2 h-5 w-5" /> Time Out
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Today's Activity</CardTitle>
                    <CardDescription>A real-time overview of your team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="flex items-start gap-4">
                       <div className="bg-primary/10 text-primary p-3 rounded-full">
                           <Users className="h-6 w-6"/>
                       </div>
                       <div>
                           <p className="text-2xl font-bold">{todaysStats.clockedIn}</p>
                           <p className="text-sm text-muted-foreground">Employees Clocked In</p>
                       </div>
                   </div>
                    <div className="flex items-start gap-4">
                       <div className="bg-primary/10 text-primary p-3 rounded-full">
                           <Hourglass className="h-6 w-6"/>
                       </div>
                       <div>
                           <p className="text-2xl font-bold">{todaysStats.totalHours}</p>
                           <p className="text-sm text-muted-foreground">Total Hours Today</p>
                       </div>
                   </div>
                   <div className="flex items-start gap-4">
                       <div className="bg-primary/10 text-primary p-3 rounded-full">
                           <Briefcase className="h-6 w-6"/>
                       </div>
                       <div>
                           <p className="text-2xl font-bold">{todaysStats.totalEmployees}</p>
                           <p className="text-sm text-muted-foreground">Total Employees</p>
                       </div>
                   </div>
                </CardContent>
             </Card>
          </div>
       </div>

        <MissedClockOutDialog
            isOpen={isMissedClockOutDialogOpen}
            onClose={() => setIsMissedClockOutDialogOpen(false)}
            staleEntry={staleEntryToFix}
            onUpdate={() => {
                setStaleEntryToFix(null);
                // Optionally trigger a re-fetch or rely on snapshot listener
            }}
        />

    </div>
  );
}

    