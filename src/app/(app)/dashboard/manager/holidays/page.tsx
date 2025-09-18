
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { collection, doc, getDoc, onSnapshot, query, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, HolidayAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HolidaysPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [assignments, setAssignments] = React.useState<HolidayAssignment>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      // 1. Get static holidays for the year
      setHolidays(getHolidaysForYear(year));

      const assignmentsDocRef = doc(db, 'users', user.uid, 'holidayAssignments', String(year));
      
      // 2. Ensure the holiday assignment document for the year exists before setting up listeners
      try {
        const docSnap = await getDoc(assignmentsDocRef);
        if (!docSnap.exists()) {
          // Document doesn't exist, create it. This is a critical step.
          await setDoc(assignmentsDocRef, {});
        }
      } catch (error) {
        console.error("Error ensuring assignment document exists:", error);
        toast({ title: "Initialization Error", description: "Could not set up the holiday page.", variant: "destructive" });
        setIsLoading(false);
        return; // Stop if we can't create the essential document
      }

      // 3. Now that we know the document exists, set up the listeners
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const employeesQuery = query(employeesCollectionRef);
      const employeeUnsubscribe = onSnapshot(employeesQuery, (snapshot) => {
        const employeesData: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        employeesData.sort((a, b) => a.firstName.localeCompare(b.firstName));
        setEmployees(employeesData);
      }, (error) => {
        console.error("Error fetching employees:", error);
        toast({ title: "Error", description: "Could not fetch employee data.", variant: "destructive" });
      });

      const assignmentUnsubscribe = onSnapshot(assignmentsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setAssignments(docSnap.data());
        } else {
          setAssignments({});
        }
        setIsLoading(false); // Data is ready
      }, (error) => {
        console.error("Error fetching holiday assignments:", error);
        toast({ title: "Error", description: "Could not fetch holiday assignments.", variant: "destructive" });
        setIsLoading(false);
      });

      // Return a cleanup function to unsubscribe from all listeners
      return () => {
        employeeUnsubscribe();
        assignmentUnsubscribe();
      };
    };

    const cleanupPromise = loadData();

    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) {
          cleanup();
        }
      });
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [user, year, toast, authLoading]);
  
  const handleHoursChange = (employeeId: string, holidayDate: Date, hours: string) => {
    const holidayKey = format(holidayDate, 'yyyy-MM-dd');
    
    // Create a deep copy to ensure state updates correctly
    const newAssignments = JSON.parse(JSON.stringify(assignments));

    if (!newAssignments[employeeId]) {
      newAssignments[employeeId] = {};
    }
    
    const numericHours = parseFloat(hours);
    if (!isNaN(numericHours) && numericHours >= 0) {
       newAssignments[employeeId][holidayKey] = numericHours;
    } else if (hours === '') {
       // Safely delete the property
       if (newAssignments[employeeId]) {
         delete newAssignments[employeeId][holidayKey];
         if (Object.keys(newAssignments[employeeId]).length === 0) {
           delete newAssignments[employeeId];
         }
       }
    }
    
    setAssignments(newAssignments);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveAssignments(newAssignments);
    }, 1000);
  };
  
  const saveAssignments = async (dataToSave: HolidayAssignment) => {
    if (!user) return;
    try {
        const assignmentsDocRef = doc(db, 'users', user.uid, 'holidayAssignments', String(year));
        // Using setDoc with merge will create the document if it doesn't exist,
        // or update it if it does. This is safer than a plain setDoc.
        await setDoc(assignmentsDocRef, dataToSave, { merge: true }); 
        toast({
            title: "Saved",
            description: "Holiday assignments have been updated.",
        });
    } catch (error) {
        console.error("Error saving assignments:", error);
        toast({ title: "Save Error", description: "Could not save assignments.", variant: "destructive" });
    }
  };

  const handlePreviousYear = () => setYear(prevYear => prevYear - 1);
  const handleNextYear = () => setYear(prevYear => prevYear + 1);

  const renderContent = () => {
    if (isLoading || authLoading) {
      return (
        <div className="space-y-2">
           <Skeleton className="h-12 w-full" />
           <Skeleton className="h-12 w-full" />
           <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (employees.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-10">
          No employees found. Please add an employee to assign holiday hours.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px] font-semibold sticky left-0 bg-card z-10">Holiday</TableHead>
              {employees.map(emp => (
                <TableHead key={emp.id} className="text-center min-w-[120px]">{emp.firstName}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.name}>
                <TableCell className="font-medium sticky left-0 bg-card z-10">
                  {holiday.name}
                  <div className="text-xs text-muted-foreground">{format(holiday.date, 'MM/dd (EEEE)')}</div>
                </TableCell>
                {employees.map(emp => {
                  const holidayKey = format(holiday.date, 'yyyy-MM-dd');
                  const assignedHours = assignments[emp.id]?.[holidayKey] ?? '';
                  return (
                     <TableCell key={emp.id} className="text-center">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="0"
                          className="w-20 text-center mx-auto"
                          value={assignedHours}
                          onChange={(e) => handleHoursChange(emp.id, holiday.date, e.target.value)}
                        />
                     </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Holiday Hour Assignments</h1>
            <p className="text-muted-foreground">Assign specific paid holiday hours for each employee.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousYear} disabled={isLoading || authLoading}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-24 text-center">{year}</span>
            <Button variant="outline" size="icon" onClick={handleNextYear} disabled={isLoading || authLoading}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2 h-5 w-5" />
            {year} Holiday Schedule
          </CardTitle>
          <CardDescription>
            Enter the number of paid hours each employee receives for a holiday. Leave blank or set to 0 for unpaid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
