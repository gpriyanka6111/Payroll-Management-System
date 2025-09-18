
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parse, isValid, getYear } from 'date-fns';

import { PayrollCalculation } from '@/components/payroll/payroll-calculation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Calendar as CalendarIcon, Loader2, History } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { Payroll } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getYearlyPayPeriods, PayPeriod, getCurrentPayPeriod } from '@/lib/pay-period';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function RunPayrollPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const payrollId = searchParams.get('id');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const [from, setFrom] = React.useState<Date | undefined>();
  const [to, setTo] = React.useState<Date | undefined>();
  const [payDate, setPayDate] = React.useState<Date | undefined>();
  const [initialData, setInitialData] = React.useState<Payroll | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetchingRanges, setIsFetchingRanges] = React.useState(true);
  const [disabledDateRanges, setDisabledDateRanges] = React.useState<{ from: Date; to: Date }[]>([]);
  const [lastPayrollDate, setLastPayrollDate] = React.useState<string | null>(null);
  const [payPeriods, setPayPeriods] = React.useState<PayPeriod[]>([]);
  const [selectedPeriodValue, setSelectedPeriodValue] = React.useState('');


  const isEditMode = !!payrollId;
  const isPreselectedMode = !!fromParam && !!toParam;
  
  React.useEffect(() => {
    const today = new Date();
    const currentYear = getYear(today);
    const periods = getYearlyPayPeriods(currentYear);
    setPayPeriods(periods);
  }, []);

  const handlePeriodChange = (value: string) => {
    setSelectedPeriodValue(value);
    const [fromStr, toStr] = value.split('_');
    const fromDate = parse(fromStr, 'yyyy-MM-dd', new Date());
    const toDate = parse(toStr, 'yyyy-MM-dd', new Date());

    if (isValid(fromDate) && isValid(toDate)) {
        setFrom(fromDate);
        setTo(toDate);
        // Find the pay date for this pre-selected period
        const currentPeriod = payPeriods.find(p => p.start.getTime() === fromDate.getTime());
        if (currentPeriod) {
            setPayDate(currentPeriod.payDate);
        }
    }
  };


  // Handle URL parameters for pre-selected dates
  React.useEffect(() => {
      if (isPreselectedMode && fromParam && toParam) {
          try {
              const fromDate = parse(fromParam, 'yyyy-MM-dd', new Date());
              const toDate = parse(toParam, 'yyyy-MM-dd', new Date());
              setFrom(fromDate);
              setTo(toDate);
              // Find the pay date for this pre-selected period
              const payPeriodsForYear = getYearlyPayPeriods(fromDate.getFullYear());
              const currentPeriod = payPeriodsForYear.find(p => p.start.getTime() === fromDate.getTime());
              if (currentPeriod) {
                  setPayDate(currentPeriod.payDate);
              }
              const value = `${format(fromDate, 'yyyy-MM-dd')}_${format(toDate, 'yyyy-MM-dd')}`;
              setSelectedPeriodValue(value);

          } catch (error) {
              console.error("Error parsing dates from URL", error);
          }
      }
  }, [fromParam, toParam, isPreselectedMode, payPeriods]);

  // Fetch existing payroll ranges to disable dates and get the last payroll date
  React.useEffect(() => {
    if (!user) {
        setIsFetchingRanges(false);
        return;
    };

    const fetchPayrollData = async () => {
      setIsFetchingRanges(true);
      try {
        const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
        
        // Fetch all ranges for disabling dates
        const allPayrollsQuery = query(payrollsCollectionRef, orderBy('toDate', 'desc'));
        const allPayrollsSnapshot = await getDocs(allPayrollsQuery);
        
        const ranges = allPayrollsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const [fromY, fromM, fromD] = data.fromDate.split('-').map(Number);
            const [toY, toM, toD] = data.toDate.split('-').map(Number);
            return {
              from: new Date(fromY, fromM - 1, fromD),
              to: new Date(toY, toM - 1, toD),
            };
          });
        setDisabledDateRanges(ranges);

        // Get the most recent payroll for display
        if (!allPayrollsSnapshot.empty) {
            const lastPayroll = allPayrollsSnapshot.docs[0].data();
            const [fromY, fromM, fromD] = lastPayroll.fromDate.split('-').map(Number);
            const [toY, toM, toD] = lastPayroll.toDate.split('-').map(Number);
            const fromDate = new Date(fromY, fromM - 1, fromD);
            const toDate = new Date(toY, toM - 1, toD);
            setLastPayrollDate(`${format(fromDate, 'LLL dd, y')} - ${format(toDate, 'LLL dd, y')}`);
        }
        
         // Set default period if not editing or pre-selected
        if (!isEditMode && !isPreselectedMode) {
            const today = new Date();
            const currentPeriod = getCurrentPayPeriod(today);
             if (currentPeriod) {
                 const initialValue = `${format(currentPeriod.start, 'yyyy-MM-dd')}_${format(currentPeriod.end, 'yyyy-MM-dd')}`;
                 setSelectedPeriodValue(initialValue);
                 handlePeriodChange(initialValue);
             }
        }


      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setIsFetchingRanges(false);
      }
    };
    
    // Only run this if we don't have dates from URL or edit mode
    if (!isPreselectedMode && !isEditMode) {
      fetchPayrollData();
    } else {
        setIsFetchingRanges(false);
    }
  }, [user, isEditMode, isPreselectedMode]);


  React.useEffect(() => {
    if (payrollId && user) {
      setIsLoading(true);
      const payrollDocRef = doc(db, 'users', user.uid, 'payrolls', payrollId);
      getDoc(payrollDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Payroll;
            setInitialData(data);
            const fromDate = parse(data.fromDate, 'yyyy-MM-dd', new Date());
            const toDate = parse(data.toDate, 'yyyy-MM-dd', new Date());
            setFrom(fromDate);
            setTo(toDate);
            if (data.payDate) {
                setPayDate(parse(data.payDate, 'yyyy-MM-dd', new Date()));
            } else {
                const payPeriodsForYear = getYearlyPayPeriods(fromDate.getFullYear());
                const currentPeriod = payPeriodsForYear.find(p => p.start.getTime() === fromDate.getTime());
                if (currentPeriod) setPayDate(currentPeriod.payDate);
            }
          } else {
            console.error('No such payroll document!');
          }
        })
        .catch((error) => {
          console.error('Error fetching payroll:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }, [payrollId, user]);

  const isDateDisabled = (date: Date) => {
    // When editing or pre-selected, no dates should be considered "disabled" by past payrolls.
    if (isEditMode || isPreselectedMode) return false;

    for (const range of disabledDateRanges) {
      // Check if the date falls within one of the existing payroll periods
      if (date >= range.from && date <= range.to) {
        return true;
      }
    }
    return false;
  };

  const isPageLoading = isLoading || isFetchingRanges;
  const arePickersDisabled = isEditMode || isPreselectedMode;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Payroll' : 'Run New Payroll'}</h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? `Editing payroll for period: ${initialData && from && to ? format(from, 'LLL dd, y') + ' - ' + format(to, 'LLL dd, y') : '...'}`
              : 'Calculate employee payroll for a specific period.'}
          </p>
        </div>
        {!isEditMode && lastPayrollDate && (
             <div className="text-right">
                <p className="text-sm font-medium flex items-center text-muted-foreground">
                  <History className="mr-2 h-4 w-4"/> Last Payroll Run
                </p>
                <p className="text-sm font-semibold">{lastPayrollDate}</p>
             </div>
        )}
      </div>

      {isPageLoading ? (
        <Card>
            <CardHeader>
                <CardTitle>Loading Payroll Data...</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
      ) : (
        <>
            {/* Pay Period Selector */}
            <Card>
                <CardHeader>
                <CardTitle>1. Pay Period</CardTitle>
                <CardDescription>
                    {arePickersDisabled
                    ? 'The pay period for this run is locked.'
                    : 'Choose a pay period from the dropdown, or select a custom date range below.'}
                </CardDescription>
                </CardHeader>
                <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="lg:col-span-2">
                        <Label>Select Official Pay Period</Label>
                        <Select value={selectedPeriodValue} onValueChange={handlePeriodChange} disabled={arePickersDisabled}>
                           <SelectTrigger>
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
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="grid gap-2">
                        <Label htmlFor="from-date">From</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="from-date"
                                variant={'outline'}
                                className={cn(
                                'w-full justify-start text-left font-normal',
                                !from && 'text-muted-foreground'
                                )}
                                disabled={arePickersDisabled}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {from ? format(from, 'LLL dd, y') : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={from}
                                onSelect={setFrom}
                                disabled={(date) => (to && date > to) || arePickersDisabled || isDateDisabled(date)}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        </div>

                        <div className="grid gap-2">
                        <Label htmlFor="to-date">To</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="to-date"
                                variant={'outline'}
                                className={cn(
                                'w-full justify-start text-left font-normal',
                                !to && 'text-muted-foreground'
                                )}
                                disabled={arePickersDisabled}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {to ? format(to, 'LLL dd, y') : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={to}
                                onSelect={setTo}
                                disabled={(date) => !from || date < from || arePickersDisabled || isDateDisabled(date)}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="pay-date">Pay Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="pay-date"
                                variant={'outline'}
                                className={cn(
                                'w-full justify-start text-left font-normal text-primary border-primary/50',
                                !payDate && 'text-muted-foreground'
                                )}
                                 disabled={isEditMode}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {payDate ? format(payDate, 'LLL dd, y') : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={payDate}
                                onSelect={setPayDate}
                                disabled={isEditMode}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                </CardContent>
            </Card>

            {/* Payroll Calculation Component */}
            {from && to ? (
                <PayrollCalculation
                    key={payrollId || `${format(from, 'yyyy-MM-dd')}-${format(to, 'yyyy-MM-dd')}`}
                    from={from}
                    to={to}
                    payrollId={payrollId}
                    initialPayrollData={initialData}
                />
            ) : (
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5 text-muted-foreground" /> 2. Calculate Payroll
                    </CardTitle>
                    <CardDescription>Enter hours for each employee for the selected pay period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-10">Please select a pay period above to begin.</p>
                </CardContent>
                </Card>
            )}
        </>
      )}
    </div>
  );
}

export default function RunPayrollPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <RunPayrollPageContent />
    </React.Suspense>
  );
}

