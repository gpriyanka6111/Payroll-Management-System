'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, CheckCircle, Users, Briefcase, Hourglass } from "lucide-react";
import { format, differenceInHours, differenceInMinutes, startOfDay, endOfDay, isBefore, startOfToday, getDay, parse } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, Timestamp, getDocs, limit, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';


interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
    employeeId: string;
    employeeName: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [activeTimeEntry, setActiveTimeEntry] = React.useState<TimeEntry | null>(null);
  const [todaysGlobalEntries, setTodaysGlobalEntries] = React.useState<TimeEntry[]>([]);
  
  // Effect for the live clock
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Master effect to fetch employees and all time-related data
  React.useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    
    setIsLoading(true);
    
    // 1. Fetch employees
    const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
    const qEmployees = query(employeesCollectionRef, orderBy('firstName', 'asc'));
    
    const unsubscribeEmployees = onSnapshot(qEmployees, (snapshot) => {
        const employeesData: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(employeesData);
        
        // Auto-select the first employee if none is selected
        if (!selectedEmployeeId && employeesData.length > 0) {
            setSelectedEmployeeId(employeesData[0].id);
        }
        
        // 2. Fetch today's global time entries for all employees (for status indicators)
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        let allEntries: TimeEntry[] = [];
        
        if (employeesData.length > 0) {
            const unsubscribers = employeesData.map(employee => {
                const timeEntriesRef = collection(db, 'users', user.uid, 'employees', employee.id, 'timeEntries');
                const qEntries = query(
                    timeEntriesRef,
                    where('timeIn', '>=', todayStart),
                    where('timeIn', '<=', todayEnd),
                    orderBy('timeIn', 'desc')
                );
                return onSnapshot(qEntries, (entrySnapshot) => {
                    const employeeEntries = entrySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
                    
                    // Atomically update entries for the current employee
                    allEntries = [
                        ...allEntries.filter(e => e.employeeId !== employee.id),
                        ...employeeEntries
                    ];
                    
                    setTodaysGlobalEntries([...allEntries.sort((a,b) => b.timeIn.toMillis() - a.timeIn.toMillis())]);
                });
            });
            // Cleanup listeners for global entries
            // This return is inside the employee snapshot callback
            return () => unsubscribers.forEach(unsub => unsub());
        } else {
             setTodaysGlobalEntries([]);
        }

        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching employees:", error);
        toast({ title: "Error", description: "Could not fetch employees.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribeEmployees();
  }, [user, toast]);

  // Effect to manage the selected employee and their specific active entry
  React.useEffect(() => {
    if (!selectedEmployeeId || !user) {
        setSelectedEmployee(null);
        setActiveTimeEntry(null);
        return;
    };
    
    const currentEmployee = employees.find(e => e.id === selectedEmployeeId);
    setSelectedEmployee(currentEmployee || null);

    const timeEntriesRef = collection(db, 'users', user.uid, 'employees', selectedEmployeeId, 'timeEntries');
    const q = query(
        timeEntriesRef, 
        where('timeOut', '==', null),
        limit(1)
    );

    const unsubscribeActive = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setActiveTimeEntry({ 
                id: doc.id, 
                ...doc.data(),
                employeeId: selectedEmployeeId,
                employeeName: currentEmployee?.firstName || 'Unknown'
            } as TimeEntry);
        } else {
            setActiveTimeEntry(null);
        }
    }, (error) => {
        console.error("Error fetching active time entry:", error);
        toast({ title: "Error", description: "Could not fetch employee status.", variant: "destructive" });
    });

    return () => unsubscribeActive();
  }, [selectedEmployeeId, user, employees, toast]);


  const getAutoClockOutTime = async (clockInDate: Date): Promise<{ timeOutValue: Date, toastDescription: string }> => {
    if (!user) throw new Error("User not authenticated.");

    const userSettingsRef = doc(db, 'users', user.uid);
    const userSettingsSnap = await getDoc(userSettingsRef);
    
    let closingTime = '05:00 PM'; // Default fallback
    if (userSettingsSnap.exists()) {
        const settings = userSettingsSnap.data();
        const dayOfWeek = getDay(clockInDate); // Sunday = 0, Monday = 1...

        if (settings.storeTimings) {
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Mon-Fri
                closingTime = settings.storeTimings.closeWeekdays || '05:00 PM';
            } else if (dayOfWeek === 6) { // Saturday
                closingTime = settings.storeTimings.closeSaturday || '05:00 PM';
            } else { // Sunday (dayOfWeek === 0)
                if (settings.storeTimings.sundayClosed) {
                     closingTime = settings.storeTimings.closeWeekdays || '05:00 PM'; // Fallback to weekday close if Sunday is marked closed
                } else {
                     closingTime = settings.storeTimings.closeSunday || '05:00 PM';
                }
            }
        }
    }

    const clockOutDate = parse(closingTime, 'hh:mm a', clockInDate);
    const employeeName = activeTimeEntry?.employeeName || 'Employee';
    const toastDescription = `${employeeName} was automatically clocked out for a previous shift at ${format(clockOutDate, 'p')}. Please clock in again.`;

    return { timeOutValue: clockOutDate, toastDescription };
  }

  const handleTimeIn = async () => {
    if (!user || !selectedEmployeeId) return;
    setIsSubmitting(true);
    
    try {
      // Check if there is a stale clock-in from a previous day
      if (activeTimeEntry && activeTimeEntry.timeIn && isBefore(activeTimeEntry.timeIn.toDate(), startOfToday())) {
          const { timeOutValue, toastDescription } = await getAutoClockOutTime(activeTimeEntry.timeIn.toDate());
          const staleEntryDocRef = doc(db, 'users', user.uid, 'employees', activeTimeEntry.employeeId, 'timeEntries', activeTimeEntry.id);
          await updateDoc(staleEntryDocRef, { timeOut: timeOutValue });
          
          toast({
              title: "Previous Shift Closed",
              description: toastDescription,
              variant: "destructive"
          });
          // Stop execution here. The user needs to click "Time In" again.
          setIsSubmitting(false);
          return; 
      }

      if (!selectedEmployee) return;

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
    if (!user || !selectedEmployeeId || !activeTimeEntry || !activeTimeEntry.timeIn) return;
    setIsSubmitting(true);

    try {
        const entryDocRef = doc(db, 'users', user.uid, 'employees', selectedEmployeeId, 'timeEntries', activeTimeEntry.id);
        const now = new Date();
        
        const { timeOutValue: storeClosingTime } = await getAutoClockOutTime(activeTimeEntry.timeIn.toDate());
        
        let finalTimeOutValue: Date | Timestamp;
        let toastDescription: string;

        if (isBefore(activeTimeEntry.timeIn.toDate(), startOfToday())) {
            finalTimeOutValue = storeClosingTime;
            toastDescription = `${activeTimeEntry.employeeName} was automatically clocked out for a previous shift at ${format(storeClosingTime, 'p')}.`;
        } else if (now > storeClosingTime) {
            finalTimeOutValue = storeClosingTime;
            toastDescription = `${activeTimeEntry.employeeName}'s shift ended at the store's closing time of ${format(storeClosingTime, 'p')}.`;
        } else {
            finalTimeOutValue = now;
            toastDescription = `${activeTimeEntry.employeeName}'s shift has ended at ${format(now, 'p')}.`;
        }

        await updateDoc(entryDocRef, {
            timeOut: finalTimeOutValue,
        });

        toast({
            title: "Clocked Out!",
            description: toastDescription,
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

  const formatDuration = (start: Date | null, end: Date | null) => {
    if (!start) return '...';
    if (!end) return 'Active';
    const totalMinutes = differenceInMinutes(end, start);
    if (totalMinutes < 0) return '0h 0m';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const todaysStats = React.useMemo(() => {
    const clockedInCount = new Set(todaysGlobalEntries.filter(entry => entry.timeOut === null).map(e => e.employeeId)).size;
    const totalHoursToday = todaysGlobalEntries.reduce((total, entry) => {
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
                                            <AvatarFallback>{emp.firstName.charAt(0)}</AvatarFallback>
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
                            <Button size="lg" onClick={handleTimeIn} disabled={!selectedEmployeeId || (!!activeTimeEntry && activeTimeEntry.timeIn && !isBefore(activeTimeEntry.timeIn.toDate(), startOfToday())) || isSubmitting}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/> Today's Log</CardTitle>
          <CardDescription>A log of all clock-in and clock-out events for today.</CardDescription>
        </CardHeader>
        <CardContent>
          {todaysGlobalEntries.length > 0 ? (
            <ul className="space-y-3">
              {todaysGlobalEntries.map(entry => (
                <li key={entry.id} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">{entry.employeeName}</p>
                            <p className="text-sm text-muted-foreground">
                                In: <span className="font-semibold">{entry.timeIn ? format(entry.timeIn.toDate(), 'p') : '...'}</span>
                                {entry.timeOut && ` — Out: `}
                                {entry.timeOut && <span className="font-semibold">{format(entry.timeOut.toDate(), 'p')}</span>}
                            </p>
                        </div>
                    </div>
                    {entry.timeOut === null ? (
                        <div className="text-sm font-semibold text-green-600">ACTIVE</div>
                    ) : (
                        <div className="text-sm font-semibold text-muted-foreground">
                            {formatDuration(entry.timeIn?.toDate() ?? null, entry.timeOut?.toDate() ?? null)}
                        </div>
                    )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4">No activity recorded yet today for any employee.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
