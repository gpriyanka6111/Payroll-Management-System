
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

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
import { getYearlyPayPeriods } from '@/lib/pay-period';

function RunPayrollPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const payrollId = searchParams.get('id');

  const [from, setFrom] = React.useState<Date | undefined>();
  const [to, setTo] = React.useState<Date | undefined>();
  const [payDate, setPayDate] = React.useState<Date | undefined>();
  const [initialData, setInitialData] = React.useState<Payroll | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetchingRanges, setIsFetchingRanges] = React.useState(true);
  const [disabledDateRanges, setDisabledDateRanges] = React.useState<{ from: Date; to: Date }[]>([]);
  const [lastPayrollDate, setLastPayrollDate] = React.useState<string | null>(null);

  const isEditMode = !!payrollId;

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

        // Get the most recent payroll for display and setting the next period
        if (!allPayrollsSnapshot.empty) {
            const lastPayroll = allPayrollsSnapshot.docs[0].data();
            const [fromY, fromM, fromD] = lastPayroll.fromDate.split('-').map(Number);
            const [toY, toM, toD] = lastPayroll.toDate.split('-').map(Number);
            const fromDate = new Date(fromY, fromM - 1, fromD);
            const toDate = new Date(toY, toM - 1, toD);
            setLastPayrollDate(`${format(fromDate, 'LLL dd, y')} - ${format(toDate, 'LLL dd, y')}`);

            if (!isEditMode) {
                // Find the next official pay period from the calendar
                const lastEndDate = toDate;
                const payPeriodsForYear = getYearlyPayPeriods(lastEndDate.getFullYear());
                const nextPeriod = payPeriodsForYear.find(p => p.start > lastEndDate);

                if (nextPeriod) {
                    setFrom(nextPeriod.start);
                    setTo(nextPeriod.end);
                    setPayDate(nextPeriod.payDate);
                } else {
                    // Handle case where next period is in the next year
                    const nextYearPeriods = getYearlyPayPeriods(lastEndDate.getFullYear() + 1);
                    if (nextYearPeriods.length > 0) {
                         setFrom(nextYearPeriods[0].start);
                         setTo(nextYearPeriods[0].end);
                         setPayDate(nextYearPeriods[0].payDate);
                    }
                }
            }
        } else if (!isEditMode) {
            // First payroll run, find the period for today
            const today = new Date();
            const payPeriodsForYear = getYearlyPayPeriods(today.getFullYear());
            const currentPeriod = payPeriodsForYear.find(p => today >= p.start && today <= p.end) || payPeriodsForYear.find(p => today < p.start);
            if (currentPeriod) {
                 setFrom(currentPeriod.start);
                 setTo(currentPeriod.end);
                 setPayDate(currentPeriod.payDate);
            }
        }

      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setIsFetchingRanges(false);
      }
    };

    fetchPayrollData();
  }, [user, isEditMode]);


  React.useEffect(() => {
    if (payrollId && user) {
      setIsLoading(true);
      const payrollDocRef = doc(db, 'users', user.uid, 'payrolls', payrollId);
      getDoc(payrollDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Payroll;
            setInitialData(data);
            const [fromY, fromM, fromD] = data.fromDate.split('-').map(Number);
            const [toY, toM, toD] = data.toDate.split('-').map(Number);
            setFrom(new Date(fromY, fromM - 1, fromD));
            setTo(new Date(toY, toM - 1, toD));
            
            const payPeriodsForYear = getYearlyPayPeriods(new Date(fromY, fromM - 1, fromD).getFullYear());
            const currentPeriod = payPeriodsForYear.find(p => p.start.getTime() === new Date(fromY, fromM - 1, fromD).getTime());
            if (currentPeriod) {
                setPayDate(currentPeriod.payDate);
            }
          } else {
            // Handle case where payroll is not found, e.g., redirect or show error
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
    // When editing, no dates should be considered "disabled" by past payrolls.
    // The date pickers themselves will be locked.
    if (isEditMode) return false;

    for (const range of disabledDateRanges) {
      // Check if the date falls within one of the existing payroll periods
      if (date >= range.from && date <= range.to) {
        return true;
      }
    }
    return false;
  };

  const isPageLoading = isLoading || isFetchingRanges;

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
                    {isEditMode
                    ? 'The pay period for this run is locked.'
                    : 'Choose the date range for this payroll run. Previously used dates are disabled.'}
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-end gap-4">
                        <div className="grid gap-2">
                        <Label htmlFor="from-date">From</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="from-date"
                                variant={'outline'}
                                className={cn(
                                'w-[240px] justify-start text-left font-normal',
                                !from && 'text-muted-foreground'
                                )}
                                disabled={isEditMode}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {from ? format(from, 'LLL dd, y') : <span>Pick a start date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={from}
                                onSelect={setFrom}
                                disabled={(date) => (to && date > to) || date > new Date() || isEditMode || isDateDisabled(date)}
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
                                'w-[240px] justify-start text-left font-normal',
                                !to && 'text-muted-foreground'
                                )}
                                disabled={isEditMode}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {to ? format(to, 'LLL dd, y') : <span>Pick an end date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={to}
                                onSelect={setTo}
                                disabled={(date) => !from || date < from || date > new Date() || isEditMode || isDateDisabled(date)}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        </div>
                    </div>
                    {payDate && (
                         <div className="border-l-4 border-primary pl-4">
                            <p className="text-sm font-medium text-muted-foreground">Pay Date</p>
                            <p className="text-lg font-semibold text-primary">{format(payDate, 'LLL dd, yyyy')}</p>
                         </div>
                    )}
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
