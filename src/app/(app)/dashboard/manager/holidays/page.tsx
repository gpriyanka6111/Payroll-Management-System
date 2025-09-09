
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, ChevronLeft, ChevronRight, PlusCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { getHolidaysForYear, Holiday } from '@/lib/holidays';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


function AddHolidayDialog({ onHolidayAdded }: { onHolidayAdded: () => void }) {
    const [open, setOpen] = React.useState(false);
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [name, setName] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        // In a real application, you would save this to a database.
        // For now, we'll just simulate it and show a toast.
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
            title: "Holiday Added (Simulated)",
            description: `${name} on ${date ? format(date, 'PPP') : ''} has been added. This feature is for demonstration.`,
        });

        setIsSaving(false);
        setOpen(false);
        setName('');
        setDate(new Date());
        // onHolidayAdded(); // This would refetch the list if it were dynamic
    };

    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Custom Holiday</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new company holiday.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="holiday-name">Holiday Name</Label>
                        <Input id="holiday-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Company Anniversary" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="holiday-date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="holiday-date"
                                    variant={'outline'}
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
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
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !date || !name}>
                         {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Save Holiday"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function HolidaysPage() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);

  const fetchHolidays = React.useCallback(() => {
    setHolidays(getHolidaysForYear(year));
  }, [year]);

  React.useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

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
            <h1 className="text-3xl font-bold">Company Holidays</h1>
            <p className="text-muted-foreground">A list of recognized US holidays for {year}.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousYear}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-24 text-center">{year}</span>
            <Button variant="outline" size="icon" onClick={handleNextYear}>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <AddHolidayDialog onHolidayAdded={fetchHolidays} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2 h-5 w-5" />
            {year} Holiday Schedule
          </CardTitle>
          <CardDescription>
            These are the standard US federal holidays. In the future, you'll be able to customize this list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Date</TableHead>
                <TableHead>Holiday</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{format(holiday.date, 'MM/dd/yyyy (EEEE)')}</TableCell>
                  <TableCell>{holiday.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
