
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format, isValid } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, deleteDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type CustomHoliday = {
    id: string;
    name: string;
    date: Date;
};

export default function HolidaysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [federalHolidays, setFederalHolidays] = React.useState<Holiday[]>([]);
  const [observedHolidays, setObservedHolidays] = React.useState<Set<string>>(new Set());
  const [customHolidays, setCustomHolidays] = React.useState<CustomHoliday[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [newHolidayName, setNewHolidayName] = React.useState('');
  const [newHolidayDate, setNewHolidayDate] = React.useState<Date | undefined>();

  React.useEffect(() => {
    setFederalHolidays(getHolidaysForYear(year));
  }, [year]);

  React.useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    
    let federalLoaded = false;
    let customLoaded = false;
    
    const checkLoadingComplete = () => {
        if (federalLoaded && customLoaded) {
            setIsLoading(false);
        }
    };
    
    setIsLoading(true);

    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setObservedHolidays(new Set(doc.data().observedFederalHolidays || []));
        }
        federalLoaded = true;
        checkLoadingComplete();
    }, (error) => {
      console.error("Error fetching observed holidays:", error);
      toast({ title: 'Error', description: 'Failed to fetch federal holiday settings.', variant: 'destructive' });
      federalLoaded = true;
      checkLoadingComplete();
    });

    const customHolidaysRef = collection(db, 'users', user.uid, 'customHolidays');
    const unsubCustom = onSnapshot(customHolidaysRef, (snapshot) => {
        const customData: CustomHoliday[] = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name,
                date: (data.date as Timestamp).toDate()
            };
        });
        setCustomHolidays(customData);
        customLoaded = true;
        checkLoadingComplete();
    }, (error) => {
      console.error("Error fetching custom holidays:", error);
      toast({ title: 'Error', description: 'Failed to fetch custom holidays.', variant: 'destructive' });
      customLoaded = true;
      checkLoadingComplete();
    });

    return () => {
        unsubUser();
        unsubCustom();
    };

  }, [user, toast]);

  const handlePreviousYear = () => setYear(prevYear => prevYear - 1);
  const handleNextYear = () => setYear(prevYear => prevYear + 1);

  const handleToggleFederalHoliday = async (holidayName: string, isObserved: boolean) => {
    if (!user) return;
    setIsSaving(true);
    const userDocRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(userDocRef, {
            observedFederalHolidays: isObserved ? arrayRemove(holidayName) : arrayUnion(holidayName)
        });
        toast({ title: 'Setting updated', description: `${holidayName} has been ${isObserved ? 'unobserved' : 'observed'}.` });
    } catch (e) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to update holiday setting.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddCustomHoliday = async () => {
    if (!user || !newHolidayName.trim() || !newHolidayDate) {
        toast({ title: 'Invalid Input', description: 'Please provide a valid name and date.', variant: 'destructive' });
        return;
    };
    if (!isValid(newHolidayDate)) {
        toast({ title: 'Invalid Date', description: 'The selected date is not valid.', variant: 'destructive' });
        return;
    }
    setIsSaving(true);
    try {
        const customHolidaysRef = collection(db, 'users', user.uid, 'customHolidays');
        await addDoc(customHolidaysRef, {
            name: newHolidayName.trim(),
            date: newHolidayDate,
        });
        setNewHolidayName('');
        setNewHolidayDate(undefined);
        toast({ title: 'Custom holiday added!' });
    } catch(e) {
        console.error("Error adding custom holiday:", e);
        toast({ title: 'Error', description: 'Failed to add custom holiday.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteCustomHoliday = async (holidayId: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'customHolidays', holidayId);
    try {
        await deleteDoc(docRef);
        toast({ title: 'Custom holiday removed', variant: 'destructive' });
    } catch (e) {
         console.error(e);
        toast({ title: 'Error', description: 'Failed to remove custom holiday.', variant: 'destructive' });
    }
  };
  
  const yearlyCustomHolidays = customHolidays.filter(h => h.date.getFullYear() === year);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold">Holiday Schedule</h1>
            <p className="text-muted-foreground">Select which holidays your company observes and add your own.</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Star className="mr-2 h-5 w-5" />
                    Federal Holidays
                </CardTitle>
                <CardDescription>Select the standard US holidays your company observes.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2"><div className="h-8 bg-muted rounded-md"/><div className="h-8 bg-muted rounded-md"/></div>
                ) : (
                    <ul className="space-y-3">
                       {federalHolidays.map((holiday, index) => {
                           const isObserved = observedHolidays.has(holiday.name);
                           return (
                            <li key={index} className="flex items-center space-x-3 p-2 rounded-md transition-colors hover:bg-muted/50">
                                <Checkbox 
                                    id={`holiday-${index}`} 
                                    checked={isObserved}
                                    onCheckedChange={() => handleToggleFederalHoliday(holiday.name, isObserved)}
                                    disabled={isSaving}
                                />
                                <label htmlFor={`holiday-${index}`} className="flex-1 flex justify-between items-center cursor-pointer">
                                    <span className={cn("font-medium", isObserved && "text-primary")}>{holiday.name}</span>
                                    <span className="text-sm text-muted-foreground">{format(holiday.date, 'EEEE, MMM d')}</span>
                                </label>
                            </li>
                           )
                       })}
                    </ul>
                )}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Custom Holidays</CardTitle>
                <CardDescription>Add your own company holidays for this year.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex gap-2 mb-4">
                    <Input 
                        placeholder="Holiday Name" 
                        value={newHolidayName} 
                        onChange={e => setNewHolidayName(e.target.value)} 
                        className="flex-1"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={'outline'} className={cn("w-[200px] justify-start text-left font-normal", !newHolidayDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newHolidayDate ? format(newHolidayDate, 'LLL dd, y') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={newHolidayDate} onSelect={setNewHolidayDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleAddCustomHoliday} disabled={!newHolidayName || !newHolidayDate || isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                    </Button>
                </div>
                <ul className="space-y-2">
                    <AnimatePresence>
                    {yearlyCustomHolidays.length > 0 ? yearlyCustomHolidays.map(holiday => (
                         <motion.li 
                            key={holiday.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                         >
                            <div>
                                <p className="font-medium">{holiday.name}</p>
                                <p className="text-sm text-muted-foreground">{format(holiday.date, 'EEEE, MMMM d, yyyy')}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteCustomHoliday(holiday.id)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                         </motion.li>
                    )) : (
                        !isLoading && <p className="text-center text-sm text-muted-foreground py-6">No custom holidays for {year}.</p>
                    )}
                    </AnimatePresence>
                </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    