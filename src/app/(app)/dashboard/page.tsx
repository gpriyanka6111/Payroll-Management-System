
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, CheckCircle } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, Timestamp, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface TimeEntry {
    id: string;
    timeIn: Timestamp;
    timeOut: Timestamp | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [activeTimeEntry, setActiveTimeEntry] = React.useState<TimeEntry | null>(null);
  const [todaysEntries, setTodaysEntries] = React.useState<TimeEntry[]>([]);

  const employeeId = user?.uid; // For now, we assume the user's UID is their employee ID

  // Effect for the live clock
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Effect to fetch and listen to time entries for today
  React.useEffect(() => {
    if (!employeeId) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const timeEntriesRef = collection(db, 'users', employeeId, 'timeEntries');
    const q = query(
        timeEntriesRef, 
        where('timeIn', '>=', todayStart),
        orderBy('timeIn', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const entries: TimeEntry[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TimeEntry));

        setTodaysEntries(entries);
        const activeEntry = entries.find(e => e.timeOut === null) || null;
        setActiveTimeEntry(activeEntry);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching time entries:", error);
        toast({ title: "Error", description: "Could not fetch time clock data.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [employeeId, toast]);


  const handleTimeIn = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      const timeEntriesRef = collection(db, 'users', employeeId, 'timeEntries');
      await addDoc(timeEntriesRef, {
        timeIn: serverTimestamp(),
        timeOut: null,
      });
      toast({
        title: "Clocked In!",
        description: `Your shift has started at ${format(new Date(), 'p')}.`,
      });
    } catch (error) {
      console.error("Error clocking in:", error);
      toast({ title: "Error", description: "Failed to clock in.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeOut = async () => {
    if (!employeeId || !activeTimeEntry) return;
    setIsSubmitting(true);
    try {
      const entryDocRef = doc(db, 'users', employeeId, 'timeEntries', activeTimeEntry.id);
      await updateDoc(entryDocRef, {
        timeOut: serverTimestamp(),
      });
      toast({
        title: "Clocked Out!",
        description: `Your shift has ended. Have a great day!`,
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
    if (!activeTimeEntry) return '0h 0m';
    const hours = differenceInHours(new Date(), activeTimeEntry.timeIn.toDate());
    const minutes = Math.floor((new Date().getTime() - activeTimeEntry.timeIn.toDate().getTime()) / 60000) % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome! Please clock in and out for your shifts.</p>
      
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-5xl font-bold tracking-tighter">{format(currentTime, 'p')}</CardTitle>
          <CardDescription>{format(currentTime, 'eeee, MMMM d, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : activeTimeEntry ? (
            <div className="text-center p-4 bg-accent/20 border-accent border rounded-lg">
                <p className="font-semibold text-accent-foreground">You are currently clocked in.</p>
                <p className="text-sm text-muted-foreground">Shift started at: {format(activeTimeEntry.timeIn.toDate(), 'p')}</p>
                 <p className="text-sm text-muted-foreground">Elapsed time: {getElapsedTime()}</p>
            </div>
          ) : (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="font-semibold text-muted-foreground">You are currently clocked out.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" onClick={handleTimeIn} disabled={!!activeTimeEntry || isSubmitting || isLoading}>
              <LogIn className="mr-2 h-5 w-5" /> Time In
            </Button>
            <Button size="lg" variant="destructive" onClick={handleTimeOut} disabled={!activeTimeEntry || isSubmitting || isLoading}>
              <LogOut className="mr-2 h-5 w-5" /> Time Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
          <CardDescription>A log of your clock-in and clock-out events for today.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
          ) : todaysEntries.length > 0 ? (
            <ul className="space-y-3">
              {todaysEntries.map(entry => (
                <li key={entry.id} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Shift Entry</p>
                            <p className="text-sm text-muted-foreground">
                                In: <span className="font-semibold">{format(entry.timeIn.toDate(), 'p')}</span>
                                {entry.timeOut && ` — Out: `}
                                {entry.timeOut && <span className="font-semibold">{format(entry.timeOut.toDate(), 'p')}</span>}
                            </p>
                        </div>
                    </div>
                    {entry.timeOut === null ? (
                        <div className="text-sm font-semibold text-accent">ACTIVE</div>
                    ) : (
                        <div className="text-sm font-semibold text-muted-foreground">
                            {format(
                                entry.timeOut.toDate().getTime() - entry.timeIn.toDate().getTime() - (1000*60*60*9), // this is a hacky way to format duration, better library would be ideal
                                'H \'hr\' m \'min\''
                            )}
                        </div>
                    )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4">No activity recorded yet today.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
