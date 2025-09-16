
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, HolidayAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HolidaysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [assignments, setAssignments] = React.useState<HolidayAssignment>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchHolidayData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch employees
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const q = query(employeesCollectionRef, orderBy('firstName', 'asc'));
      const employeesSnapshot = await getDocs(q);
      const employeesData: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(employeesData);

      // Get holidays for the year
      setHolidays(getHolidaysForYear(year));

      // Fetch holiday assignments
      const assignmentsDocRef = doc(db, 'users', user.uid, 'holidayAssignments', String(year));
      const assignmentsSnap = await getDoc(assignmentsDocRef);
      if (assignmentsSnap.exists()) {
        setAssignments(assignmentsSnap.data());
      } else {
        setAssignments({});
      }

    } catch (error) {
      console.error("Error fetching holiday data:", error);
      toast({ title: "Error", description: "Could not fetch holiday data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, year, toast]);

  React.useEffect(() => {
    fetchHolidayData();
  }, [fetchHolidayData]);
  
  const handleHoursChange = (employeeId: string, holidayDate: Date, hours: string) => {
    const holidayKey = format(holidayDate, 'yyyy-MM-dd');
    const newAssignments = { ...assignments };

    if (!newAssignments[employeeId]) {
      newAssignments[employeeId] = {};
    }
    
    const numericHours = parseFloat(hours);
    if (!isNaN(numericHours) && numericHours >= 0) {
       newAssignments[employeeId][holidayKey] = numericHours;
    } else if (hours === '') {
       delete newAssignments[employeeId][holidayKey];
    }
    
    setAssignments(newAssignments);

    // Debounce the save operation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveAssignments(newAssignments);
    }, 1000); // Save after 1 second of inactivity
  };
  
  const saveAssignments = async (dataToSave: HolidayAssignment) => {
    if (!user) return;
    try {
        const assignmentsDocRef = doc(db, 'users', user.uid, 'holidayAssignments', String(year));
        await setDoc(assignmentsDocRef, dataToSave, { merge: true });
        toast({
            title: "Saved",
            description: "Holiday assignments have been saved.",
        });
    } catch (error) {
        console.error("Error saving assignments:", error);
        toast({ title: "Error", description: "Could not save holiday assignments.", variant: "destructive" });
    }
  };


  const handlePreviousYear = () => {
    setYear(prevYear => prevYear - 1);
  };

  const handleNextYear = () => {
    setYear(prevYear => prevYear + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Holiday Hour Assignments</h1>
            <p className="text-muted-foreground">Assign specific paid holiday hours for each employee.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousYear}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-24 text-center">{year}</span>
            <Button variant="outline" size="icon" onClick={handleNextYear}>
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
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
          ) : employees.length > 0 ? (
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
           ) : (
            <p className="text-center text-muted-foreground py-10">
              No employees found. Please add an employee to assign holiday hours.
            </p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

    