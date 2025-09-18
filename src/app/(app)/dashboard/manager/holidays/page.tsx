
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { collection, doc, onSnapshot, query, setDoc, getDoc, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, HolidayAssignment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';


interface CompanyHoliday extends Holiday {
    id: string;
}

function HolidayDialog({ open, onOpenChange, onSave, holidayToEdit }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: () => void, holidayToEdit: CompanyHoliday | null }) {
    const { user } = useAuth();
    const [name, setName] = React.useState('');
    const [date, setDate] = React.useState<Date | undefined>();
    const [year, setYear] = React.useState(new Date().getFullYear());

    React.useEffect(() => {
        if (holidayToEdit) {
            setName(holidayToEdit.name);
            setDate(holidayToEdit.date);
            setYear(holidayToEdit.date.getFullYear());
        } else {
            setName('');
            setDate(undefined);
            setYear(new Date().getFullYear());
        }
    }, [holidayToEdit]);

    const handleSave = async () => {
        if (!user || !name || !date) return;
        const holidayData = { name, date: format(date, 'yyyy-MM-dd') };
        
        try {
            const holidaysColRef = collection(db, 'users', user.uid, 'holidays', String(year), 'companyHolidays');
            if (holidayToEdit) {
                const holidayDocRef = doc(holidaysColRef, holidayToEdit.id);
                await updateDoc(holidayDocRef, holidayData);
            } else {
                await addDoc(holidaysColRef, { ...holidayData, createdAt: serverTimestamp() });
            }
            onSave();
        } catch (error) {
            console.error("Error saving holiday: ", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{holidayToEdit ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
                    <DialogDescription>
                        {holidayToEdit ? 'Update the details for this holiday.' : 'Add a new custom holiday for your company.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="holiday-name">Holiday Name</Label>
                        <Input id="holiday-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="holiday-date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Holiday</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function HolidaysPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [holidays, setHolidays] = React.useState<CompanyHoliday[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [assignments, setAssignments] = React.useState<HolidayAssignment>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = React.useState(false);
  const [holidayToEdit, setHolidayToEdit] = React.useState<CompanyHoliday | null>(null);

   React.useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    const loadData = async () => {
        setIsLoading(true);

        // Define all document and collection references
        const holidaysDocRef = doc(db, 'users', user.uid, 'holidays', String(year));
        const companyHolidaysColRef = collection(holidaysDocRef, 'companyHolidays');
        const assignmentsDocRef = doc(db, 'users', user.uid, 'holidayAssignments', String(year));
        const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');

        // 1. Check for and seed default holidays if they don't exist for the year
        try {
            const holidaysSnap = await getDoc(holidaysDocRef);
            if (!holidaysSnap.exists()) {
                const defaultHolidays = getHolidaysForYear(year);
                const batch = db.batch();
                defaultHolidays.forEach(h => {
                    const newDocRef = doc(companyHolidaysColRef); // Auto-generate ID
                    batch.set(newDocRef, { name: h.name, date: format(h.date, 'yyyy-MM-dd'), createdAt: serverTimestamp() });
                });
                await batch.commit();
            }
        } catch (error) {
            console.error("Error seeding holidays:", error);
            toast({ title: "Initialization Error", description: "Could not set up default holidays.", variant: "destructive" });
        }
        
        // 2. Ensure assignment document exists
        try {
            const assignmentsSnap = await getDoc(assignmentsDocRef);
            if (!assignmentsSnap.exists()) {
                await setDoc(assignmentsDocRef, {});
            }
        } catch (error) {
             console.error("Error ensuring assignment document exists:", error);
             toast({ title: "Initialization Error", description: "Could not set up the holiday assignment page.", variant: "destructive" });
        }
        
        // 3. Set up all real-time listeners
        const employeeUnsubscribe = onSnapshot(query(employeesCollectionRef), (snapshot) => {
            const employeesData: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
            employeesData.sort((a, b) => a.firstName.localeCompare(b.firstName));
            setEmployees(employeesData);
            setIsLoading(false); // Consider loaded after employees arrive
        }, (error) => {
            console.error("Error fetching employees:", error);
            toast({ title: "Error", description: "Could not fetch employee data.", variant: "destructive" });
        });
        
        const assignmentUnsubscribe = onSnapshot(assignmentsDocRef, (docSnap) => {
            setAssignments(docSnap.exists() ? docSnap.data() : {});
        }, (error) => {
            console.error("Error fetching holiday assignments:", error);
            toast({ title: "Error", description: "Could not fetch holiday assignments.", variant: "destructive" });
        });
        
        const holidayUnsubscribe = onSnapshot(query(companyHolidaysColRef, doc(companyHolidaysColRef).parent ? orderBy('date', 'asc') : undefined), (snapshot) => {
            const holidaysData: CompanyHoliday[] = snapshot.docs.map(doc => {
                 const data = doc.data();
                 const [y, m, d] = data.date.split('-').map(Number);
                 return { id: doc.id, name: data.name, date: new Date(y, m - 1, d) };
            });
            setHolidays(holidaysData);
        }, (error) => {
             console.error("Error fetching holidays:", error);
             toast({ title: "Error", description: "Could not fetch holiday list.", variant: "destructive" });
        });

        // Return cleanup function for all listeners
        return () => {
            employeeUnsubscribe();
            assignmentUnsubscribe();
            holidayUnsubscribe();
        };
    };

    const cleanupPromise = loadData();

    return () => {
        cleanupPromise.then(cleanup => {
            if (cleanup) cleanup();
        });
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
}, [user, year, toast, authLoading]);
  
  
  const handleHoursChange = (employeeId: string, holidayDate: Date, hours: string) => {
    const holidayKey = format(holidayDate, 'yyyy-MM-dd');
    const newAssignments = JSON.parse(JSON.stringify(assignments));

    if (!newAssignments[employeeId]) newAssignments[employeeId] = {};
    
    const numericHours = parseFloat(hours);
    if (!isNaN(numericHours) && numericHours >= 0) {
       newAssignments[employeeId][holidayKey] = numericHours;
    } else if (hours === '') {
       if (newAssignments[employeeId]) {
         delete newAssignments[employeeId][holidayKey];
         if (Object.keys(newAssignments[employeeId]).length === 0) {
           delete newAssignments[employeeId];
         }
       }
    }
    
    setAssignments(newAssignments);

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      saveAssignments(newAssignments);
    }, 1000);
  };
  
  const saveAssignments = async (dataToSave: HolidayAssignment) => {
    if (!user) return;
    try {
        const assignmentsDocRef = doc(db, 'users', user.uid, 'holidayAssignments', String(year));
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

  const handleAddHoliday = () => {
    setHolidayToEdit(null);
    setIsHolidayDialogOpen(true);
  };

  const handleEditHoliday = (holiday: CompanyHoliday) => {
    setHolidayToEdit(holiday);
    setIsHolidayDialogOpen(true);
  }

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!user) return;
    const holidayDocRef = doc(db, 'users', user.uid, 'holidays', String(year), 'companyHolidays', holidayId);
    await deleteDoc(holidayDocRef);
    toast({ title: "Holiday Deleted", variant: "destructive" });
  }

  const handleHolidaySave = () => {
    setIsHolidayDialogOpen(false);
    setHolidayToEdit(null);
    // Data will refetch automatically via onSnapshot
  }

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
              <TableRow key={holiday.id}>
                <TableCell className="font-medium sticky left-0 bg-card z-10 group">
                    <div className="flex items-center justify-between">
                        <div>
                            {holiday.name}
                            <div className="text-xs text-muted-foreground">{format(holiday.date, 'MM/dd (EEEE)')}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditHoliday(holiday)}><Edit className="h-3 w-3"/></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteHoliday(holiday.id)}><Trash2 className="h-3 w-3"/></Button>
                        </div>
                    </div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            <Button onClick={handleAddHoliday}>
                <Plus className="mr-2 h-4 w-4"/> Add Holiday
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
            Enter paid hours for each employee. Leave blank or set to 0 for unpaid. Default US holidays are pre-filled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      <HolidayDialog 
        open={isHolidayDialogOpen}
        onOpenChange={setIsHolidayDialogOpen}
        onSave={handleHolidaySave}
        holidayToEdit={holidayToEdit}
      />
    </div>
  );
}
