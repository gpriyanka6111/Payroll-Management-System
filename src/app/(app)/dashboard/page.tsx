
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, CheckCircle, Users } from "lucide-react";
import { format, differenceInHours, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, Timestamp, getDocs, limit, orderBy, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [activeTimeEntry, setActiveTimeEntry] = React.useState<TimeEntry | null>(null);
  const [todaysGlobalEntries, setTodaysGlobalEntries] = React.useState<TimeEntry[]>([]);
  const [isTimeLogLoading, setIsTimeLogLoading] = React.useState(false);

  // Effect for the live clock
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Effect to fetch employees for the dropdown
  React.useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
    const q = query(employeesCollectionRef, orderBy('lastName', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const employeesData: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(employeesData);
        if (employeesData.length > 0 && !selectedEmployeeId) {
            // Pre-select the first employee if none is selected
            // setSelectedEmployeeId(employeesData[0].id);
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching employees:", error);
        toast({ title: "Error", description: "Could not fetch employees.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  

  // Effect to fetch today's activity for ALL employees, re-runs when activeTimeEntry changes
  React.useEffect(() => {
    if (!user || employees.length === 0) {
      setTodaysGlobalEntries([]);
      return;
    }

    const fetchAllTodaysEntries = async () => {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      let allEntries: TimeEntry[] = [];

      // Use Promise.all to fetch entries concurrently for better performance
      await Promise.all(employees.map(async (employee) => {
        try {
          const timeEntriesRef = collection(db, 'users', user.uid, 'employees', employee.id, 'timeEntries');
          const q = query(
            timeEntriesRef,
            where('timeIn', '>=', todayStart),
            where('timeIn', '<=', todayEnd),
            orderBy('timeIn', 'desc')
          );
          const snapshot = await getDocs(q);
          const employeeEntries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as TimeEntry));
          allEntries.push(...employeeEntries);
        } catch (error) {
          console.error(`Error fetching entries for ${employee.firstName}:`, error);
        }
      }));
      
      allEntries.sort((a, b) => b.timeIn.toDate().getTime() - a.timeIn.toDate().getTime());
      setTodaysGlobalEntries(allEntries);
    };
    
    fetchAllTodaysEntries();
    // This effect depends on employees list and activeTimeEntry.
    // When activeTimeEntry changes (a clock-in/out), this re-fetches the list.
  }, [user, employees, activeTimeEntry]);


  // Effect to fetch and listen to the selected employee's active entry
  React.useEffect(() => {
    if (!user || !selectedEmployeeId) {
      setActiveTimeEntry(null);
      return;
    }

    setIsTimeLogLoading(true);

    const timeEntriesRef = collection(db, 'users', user.uid, 'employees', selectedEmployeeId, 'timeEntries');
    const q = query(
        timeEntriesRef, 
        where('timeOut', '==', null),
        limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
            setActiveTimeEntry({ 
                id: doc.id, 
                ...doc.data(),
                employeeId: selectedEmployeeId,
                employeeName: selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Unknown'
            } as TimeEntry);
        } else {
            setActiveTimeEntry(null);
        }
        setIsTimeLogLoading(false);
    }, (error) => {
        console.error("Error fetching active time entry:", error);
        toast({ title: "Error", description: "Could not fetch employee status.", variant: "destructive" });
        setIsTimeLogLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedEmployeeId, toast, employees]);


  const handleTimeIn = async () => {
    if (!user || !selectedEmployeeId) return;
    setIsSubmitting(true);
    try {
      const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
      if (!selectedEmployee) return;

      const timeEntriesRef = collection(db, 'users', user.uid, 'employees', selectedEmployeeId, 'timeEntries');
      await addDoc(timeEntriesRef, {
        timeIn: serverTimestamp(),
        timeOut: null,
        userId: user.uid, // Add userId for potential future queries
        employeeId: selectedEmployeeId,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      });
      
      toast({
        title: "Clocked In!",
        description: `${selectedEmployee?.firstName} ${selectedEmployee?.lastName}'s shift has started at ${format(new Date(), 'p')}.`,
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
        description: `${selectedEmployee?.firstName} ${selectedEmployee?.lastName}'s shift has ended.`,
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
    const hours = differenceInHours(new Date(), activeTimeEntry.timeIn.toDate());
    const minutes = Math.floor((new Date().getTime() - activeTimeEntry.timeIn.toDate().getTime()) / 60000) % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatDuration = (start: Date | null, end: Date | null) => {
    if (!start || !end) return 'Active';
    const totalMinutes = differenceInMinutes(end, start);
    if (totalMinutes < 0) return '0h 0m';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Time Clock Kiosk</h1>
      <p className="text-muted-foreground">Select an employee to clock them in or out for their shifts.</p>
      
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-5xl font-bold tracking-tighter">{format(currentTime, 'p')}</CardTitle>
          <CardDescription>{format(currentTime, 'eeee, MMMM d, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-2">
                <label className="text-sm font-medium">Select Employee</label>
                 {isLoading ? <Skeleton className="h-10 w-full" /> : (
                    <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId || ''} disabled={isLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an employee..." />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
            </div>

          {selectedEmployeeId && (
            isTimeLogLoading ? (
                <Skeleton className="h-24 w-full" />
            ) : activeTimeEntry ? (
                <div className="text-center p-4 bg-accent/20 border-accent border rounded-lg">
                    <p className="font-semibold text-accent-foreground">Currently clocked in.</p>
                    {activeTimeEntry.timeIn && (
                       <>
                        <p className="text-sm text-muted-foreground">Shift started at: {format(activeTimeEntry.timeIn.toDate(), 'p')}</p>
                        <p className="text-sm text-muted-foreground">Elapsed time: {getElapsedTime()}</p>
                       </>
                    )}
                </div>
            ) : (
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-muted-foreground">Currently clocked out.</p>
                </div>
            )
          )}
          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" onClick={handleTimeIn} disabled={!selectedEmployeeId || !!activeTimeEntry || isSubmitting}>
              <LogIn className="mr-2 h-5 w-5" /> Time In
            </Button>
            <Button size="lg" variant="destructive" onClick={handleTimeOut} disabled={!selectedEmployeeId || !activeTimeEntry || isSubmitting}>
              <LogOut className="mr-2 h-5 w-5" /> Time Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/> Today's Activity (All Employees)</CardTitle>
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
                        <div className="text-sm font-semibold text-accent">ACTIVE</div>
                    ) : (
                        <div className="text-sm font-semibold text-muted-foreground">
                            {formatDuration(entry.timeIn?.toDate(), entry.timeOut?.toDate())}
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
