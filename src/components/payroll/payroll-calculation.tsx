
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calculator, AlertTriangle, CheckCircle, MessageSquare, Loader2, Save, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Textarea } from '../ui/textarea';
import type { Employee, Payroll } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, writeBatch, getDoc, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';

const COMPANY_STANDARD_BIWEEKLY_HOURS = 100;

const employeePayrollInputSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
  payRateCheck: z.number(),
  payRateOthers: z.coerce.number().min(0).optional(),
  totalHoursWorked: z.coerce.number().min(0, { message: 'Hours must be non-negative.' }).default(0),
  checkHours: z.coerce.number().min(0, { message: 'Hours must be non-negative.' }).default(0),
  otherHours: z.coerce.number().min(0).default(0),
  ptoUsed: z.coerce.number().min(0, { message: 'PTO hours must be non-negative.' }).default(0),
  ptoBalance: z.number().optional(),
  comment: z.string().optional(),
}).refine(data => data.checkHours <= data.totalHoursWorked, {
    message: "Check hours cannot exceed total hours.",
    path: ["checkHours"],
}).refine(
  (data) => data.ptoUsed <= (data.ptoBalance ?? 0),
  {
    message: "PTO used cannot exceed available balance.",
    path: ["ptoUsed"],
  }
).refine(
  (data) => data.totalHoursWorked <= COMPANY_STANDARD_BIWEEKLY_HOURS,
  {
    message: `Hours cannot exceed company standard of ${COMPANY_STANDARD_BIWEEKLY_HOURS}.`,
    path: ["totalHoursWorked"],
  }
);

export type EmployeePayrollInput = z.infer<typeof employeePayrollInputSchema>;


const payrollFormSchema = z.object({
  employees: z.array(employeePayrollInputSchema),
});


type PayrollFormValues = z.infer<typeof payrollFormSchema>;

export type PayrollResult = {
  employeeId: string;
  name: string;
  totalHoursWorked: number;
  checkHours: number;
  otherHours: number;
  ptoUsed: number;
  payRateCheck: number;
  payRateOthers: number;
  otherAdjustment: number;
  grossCheckAmount: number;
  grossOtherAmount: number;
  netPay: number;
  newPtoBalance: number;
};

interface PayrollCalculationProps {
    from: Date;
    to: Date;
    payrollId: string | null;
    initialPayrollData: Payroll | null;
}

const inputMetrics = [
    { key: 'totalHoursWorked', label: 'Total Hours Worked', props: { step: "0.1", min: "0" } },
    { key: 'checkHours', label: 'Check Hours', props: { step: "0.1", min: "0" } },
    { key: 'otherHours', label: 'Other Hours', props: { readOnly: true, className: "bg-muted/50" } },
    { key: 'ptoUsed', label: 'PTO Used', props: { step: "0.1", min: "0" } },
] as const;


export function PayrollCalculation({ from, to, payrollId, initialPayrollData }: PayrollCalculationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetchingHours, setIsFetchingHours] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const [payrollResults, setPayrollResults] = React.useState<PayrollResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);
  const [companyName, setCompanyName] = React.useState("My Small Business");

  const [summaryEmployee, setSummaryEmployee] = React.useState('');
  const [summaryDeductions, setSummaryDeductions] = React.useState('');
  const [summaryNetPay, setSummaryNetPay] = React.useState('');


  const isEditMode = !!payrollId;

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employees: [],
    },
     mode: "onChange",
  });

   const { fields } = useFieldArray({
    control: form.control,
    name: "employees",
   });

   const { setValue, watch, control, reset, getValues } = form;

    const watchedEmployees = watch("employees");

   const fetchHoursFromTimeEntries = React.useCallback(async (employeesToFetch: EmployeePayrollInput[]) => {
       if (!user || !employeesToFetch || employeesToFetch.length === 0) return;
        setIsFetchingHours(true);
        toast({ title: "Fetching Hours", description: "Calculating worked hours from time entries..." });
       
        const toDateWithTime = new Date(to);
        toDateWithTime.setHours(23, 59, 59, 999);

       try {
        for (let i = 0; i < employeesToFetch.length; i++) {
            const employee = employeesToFetch[i];
            const timeEntriesRef = collection(db, 'users', user.uid, 'employees', employee.employeeId, 'timeEntries');
            const q = query(
                timeEntriesRef,
                where('timeIn', '>=', from),
                where('timeIn', '<=', toDateWithTime)
            );
            const snapshot = await getDocs(q);
            const totalMinutes = snapshot.docs.reduce((acc, doc) => {
                const data = doc.data();
                if (data.timeOut) {
                    const diff = differenceInMinutes(data.timeOut.toDate(), data.timeIn.toDate());
                    return acc + (diff > 0 ? diff : 0);
                }
                return acc;
            }, 0);
            
            const totalHours = totalMinutes / 60;
            setValue(`employees.${i}.totalHoursWorked`, parseFloat(totalHours.toFixed(2)), { shouldValidate: true, shouldDirty: true });
            setValue(`employees.${i}.checkHours`, parseFloat(totalHours.toFixed(2)), { shouldValidate: true, shouldDirty: true });
        }
         toast({ title: "Hours Fetched", description: "Total hours have been updated.", variant: 'default' });
       } catch (error) {
           console.error("Error fetching hours:", error);
           toast({ title: "Error", description: "Could not fetch hours from time entries.", variant: 'destructive' });
       } finally {
            setIsFetchingHours(false);
       }
   }, [user, from, to, setValue, toast]);

   React.useEffect(() => {
    if (!user) return;

    const fetchAndSetData = async () => {
      setIsLoading(true);

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setCompanyName(userSnap.data().companyName || "My Small Business");
        }

        const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
        const q = query(employeesCollectionRef, orderBy('lastName', 'asc'));
        const querySnapshot = await getDocs(q);
        const employeesData: Employee[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Employee));

        let formValues: EmployeePayrollInput[];

        if (isEditMode && initialPayrollData) {
          formValues = initialPayrollData.inputs.map(initialInput => {
              const currentEmployee = employeesData.find(e => e.id === initialInput.employeeId);
              return {
                  ...initialInput,
                  ptoBalance: currentEmployee ? currentEmployee.ptoBalance : initialInput.ptoBalance,
                  comment: currentEmployee ? currentEmployee.comment : initialInput.comment,
              };
          });
          
          setSummaryEmployee(initialPayrollData.summaryEmployee || '');
          setSummaryDeductions(initialPayrollData.summaryDeductions || '');
          setSummaryNetPay(initialPayrollData.summaryNetPay || '');

          const employeesInPayroll = new Set(initialPayrollData.inputs.map(i => i.employeeId));
          const newEmployees = employeesData.filter(e => !employeesInPayroll.has(e.id));
          newEmployees.forEach(emp => {
              formValues.push({
                  employeeId: emp.id,
                  name: `${emp.firstName} ${emp.lastName}`,
                  payRateCheck: emp.payRateCheck,
                  payRateOthers: emp.payRateOthers ?? 0,
                  ptoBalance: emp.ptoBalance,
                  totalHoursWorked: 0,
                  checkHours: 0,
                  otherHours: 0,
                  ptoUsed: 0,
                  comment: emp.comment || '',
              });
          });
          reset({ employees: formValues });

        } else {
          formValues = employeesData.map(emp => ({
              employeeId: emp.id,
              name: `${emp.firstName} ${emp.lastName}`,
              payRateCheck: emp.payRateCheck,
              payRateOthers: emp.payRateOthers ?? 0,
              ptoBalance: emp.ptoBalance,
              totalHoursWorked: 0,
              checkHours: 0,
              otherHours: 0,
              ptoUsed: 0,
              comment: emp.comment || '',
          }));
          reset({ employees: formValues });
          if (formValues.length > 0) {
              await fetchHoursFromTimeEntries(formValues);
          }
        }
      } catch (error) {
        console.error("Error fetching payroll data:", error);
        toast({ title: "Error", description: "Failed to load initial payroll data.", variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndSetData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, payrollId, initialPayrollData, from, to]);


    React.useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name && (name.endsWith('.totalHoursWorked') || name.endsWith('.checkHours'))) {
                const match = name.match(/^employees\.(\d+)\./);
                if (match) {
                    const index = parseInt(match[1], 10);
                    const employee = value.employees?.[index];
                    if (employee) {
                        const totalHours = Number(employee.totalHoursWorked) || 0;
                        const checkHours = Number(employee.checkHours) || 0;
                        const calculatedOtherHours = Math.max(0, totalHours - checkHours);
                        
                        setValue(`employees.${index}.otherHours`, calculatedOtherHours, {
                            shouldValidate: true,
                        });
                    }
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, setValue]);


   const safeGetNumber = (value: unknown): number => {
     const num = Number(value);
     return isNaN(num) ? 0 : num;
   };

  function calculatePayroll(values: PayrollFormValues): PayrollResult[] {
    return values.employees.map((emp) => {
      const totalHoursWorked = safeGetNumber(emp.totalHoursWorked);
      const checkHours = safeGetNumber(emp.checkHours);
      const otherHours = safeGetNumber(emp.otherHours);
      const ptoUsed = safeGetNumber(emp.ptoUsed);
      const payRateCheck = safeGetNumber(emp.payRateCheck);
      const payRateOthers = safeGetNumber(emp.payRateOthers) ?? 0;
      const otherAdjustment = 0; // No adjustment from input form
      
      const initialPtoBalanceFromDb = safeGetNumber(emp.ptoBalance);
      
      let newPtoBalance;

      if (isEditMode && initialPayrollData) {
        const originalInput = initialPayrollData.inputs.find(i => i.employeeId === emp.employeeId);
        const originalPtoUsed = originalInput ? safeGetNumber(originalInput.ptoUsed) : 0;
        const effectiveInitialBalance = initialPtoBalanceFromDb + originalPtoUsed;
        newPtoBalance = effectiveInitialBalance - ptoUsed;
      } else {
        newPtoBalance = initialPtoBalanceFromDb - ptoUsed;
      }

      const regularPay = payRateCheck * checkHours;
      const ptoPay = payRateCheck * ptoUsed;
      const grossCheckAmount = regularPay + ptoPay;

      const otherPay = payRateOthers * otherHours;
      const grossOtherAmount = otherPay + otherAdjustment;

      const netPay = grossCheckAmount; 

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        totalHoursWorked,
        checkHours,
        otherHours,
        ptoUsed,
        payRateCheck,
        payRateOthers,
        otherAdjustment,
        grossCheckAmount,
        grossOtherAmount,
        netPay,
        newPtoBalance,
      };
    });
  }


  function onSubmit(values: PayrollFormValues) {
    const results = calculatePayroll(values);
    setPayrollResults(results);
    setShowResults(true);
    toast({
      title: 'Payroll Calculated',
      description: 'Review the results below. Finalize by approving.',
      variant: 'default',
      action: <CheckCircle className="h-4 w-4 text-white"/>
    });
  }

  const handleResultAdjustmentChange = (employeeId: string, value: string) => {
    const newAdjustment = parseFloat(value);

    setPayrollResults(prevResults => 
        prevResults.map(result => {
            if (result.employeeId === employeeId) {
                const adjustment = isNaN(newAdjustment) ? 0 : newAdjustment;
                const otherPay = result.payRateOthers * result.otherHours;
                const newGrossOtherAmount = otherPay + adjustment;
                return {
                    ...result,
                    otherAdjustment: adjustment,
                    grossOtherAmount: newGrossOtherAmount,
                };
            }
            return result;
        })
    );
  };

  async function handleApprovePayroll() {
    if (!user) {
        toast({ title: "Not Authenticated", variant: "destructive" });
        return;
    }
    setIsApproving(true);
    const currentInputs = form.getValues().employees;

    try {
        const totalAmount = payrollResults.reduce((sum, r) => sum + r.grossCheckAmount + r.grossOtherAmount, 0);
        
        const payrollDocData = {
            fromDate: format(from, 'yyyy-MM-dd'),
            toDate: format(to, 'yyyy-MM-dd'),
            totalAmount: totalAmount,
            status: 'Completed',
            results: payrollResults,
            inputs: currentInputs,
            summaryEmployee: summaryEmployee,
            summaryDeductions: summaryDeductions,
            summaryNetPay: summaryNetPay,
        };

        let finalPayrollId = payrollId;

        // 1. Save or Update the payroll run document
        if (isEditMode && payrollId) {
             const payrollDocRef = doc(db, 'users', user.uid, 'payrolls', payrollId);
             await updateDoc(payrollDocRef, payrollDocData);
        } else {
            const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
            const newDocRef = await addDoc(payrollsCollectionRef, payrollDocData);
            finalPayrollId = newDocRef.id;
        }

        // 2. Update employee PTO balances in a batch
        const batch = writeBatch(db);
        payrollResults.forEach(result => {
            const employeeDocRef = doc(db, 'users', user.uid, 'employees', result.employeeId);
            batch.update(employeeDocRef, { ptoBalance: result.newPtoBalance });
        });
        await batch.commit();

        // 3. Save to sessionStorage for immediate report viewing
        sessionStorage.setItem('payrollResultsData', JSON.stringify(payrollResults));
        sessionStorage.setItem('payrollPeriodData', JSON.stringify({ from, to }));
        sessionStorage.setItem('payrollInputData', JSON.stringify(currentInputs));
        sessionStorage.setItem('companyName', companyName);
        const summaryData = {
            employee: summaryEmployee,
            deductions: summaryDeductions,
            netPay: summaryNetPay,
        };
        sessionStorage.setItem('payrollSummaryData', JSON.stringify(summaryData));
        
        toast({
            title: `Payroll ${isEditMode ? 'Updated' : 'Approved'}`,
            description: "Payroll history saved and PTO balances updated. Redirecting to report...",
        });

        router.push(`/dashboard/payroll/report?id=${finalPayrollId}`);

    } catch (error) {
        console.error("Failed to approve payroll:", error);
        toast({
            title: `Error ${isEditMode ? 'Updating' : 'Approving'} Payroll`,
            description: "Could not save this payroll run. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsApproving(false);
    }
  }

  const formatCurrency = (amount: number) => {
       if (typeof amount !== 'number' || isNaN(amount)) {
          return '$ ---.--';
       }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatHours = (hours: unknown): string => {
      const numHours = Number(hours);
      if (hours === undefined || hours === null || isNaN(numHours)) {
          return '0.00';
      }
      return numHours.toFixed(2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> 2. Calculate Payroll</CardTitle>
          <CardDescription>Loading employee data...</CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
     <>
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> 2. Calculate Payroll</CardTitle>
                <CardDescription>Enter hours and review comments for each employee for the current pay period.</CardDescription>
            </div>
            {!isEditMode && (
                <Button variant="outline" onClick={() => fetchHoursFromTimeEntries(getValues().employees)} disabled={isFetchingHours}>
                   {isFetchingHours ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Fetch Hours
                </Button>
            )}
        </CardHeader>
         <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="overflow-x-auto">
               <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                       {fields.map((field) => (
                          <TableHead key={field.id} className="text-left">{field.name}</TableHead>
                       ))}
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                    {inputMetrics.map((metric) => (
                       <TableRow key={metric.key}>
                           <TableCell className="font-medium">{metric.label}</TableCell>
                            {fields.map((field, index) => (
                               <TableCell key={field.id} className="text-left p-2">
                                 <FormField
                                    control={form.control}
                                    name={`employees.${index}.${metric.key}`}
                                    render={({ field: inputField }) => (
                                      <FormItem>
                                        <FormLabel className="sr-only">{metric.label} for {field.name}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                {...inputField} 
                                                {...metric.props} 
                                                className="h-8 w-28 text-left"
                                            />
                                        </FormControl>
                                         <FormMessage className="text-xs mt-1" />
                                      </FormItem>
                                    )}
                                  />
                               </TableCell>
                            ))}
                      </TableRow>
                    ))}
                     <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell className="font-medium">Available PTO</TableCell>
                        {fields.map((field, index) => (
                            <TableCell key={field.id} className="text-left pl-4 text-sm text-muted-foreground tabular-nums">
                                ({formatHours(watchedEmployees[index]?.ptoBalance)})
                            </TableCell>
                        ))}
                     </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">Comments</TableCell>
                         {fields.map((field, index) => (
                            <TableCell key={field.id} className="text-left">
                               <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            View/Edit
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                       <FormField
                                            control={control}
                                            name={`employees.${index}.comment`}
                                            render={({ field: commentField }) => (
                                                <FormItem className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">Comment</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Internal note for {field.name}.
                                                        </p>
                                                    </div>
                                                    <FormControl>
                                                      <Textarea {...commentField} value={commentField.value ?? ''} />
                                                    </FormControl>
                                                     <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </TableCell>
                         ))}
                     </TableRow>
                     {fields.length === 0 && (
                         <TableRow>
                             <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                 No active employees found. Please add an employee first.
                             </TableCell>
                         </TableRow>
                     )}
                   </TableBody>
               </Table>
               </div>
                {form.formState.errors.employees && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Please check the form for errors. Total or PTO hours may be invalid.
                        </AlertDescription>
                    </Alert>
                )}
               <div className="flex justify-end pt-4">
                 <Button type="submit">Calculate Payroll</Button>
               </div>
            </form>
           </Form>
         </CardContent>
       </Card>

       {showResults && (
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-accent"/> 3. Review & Approve</CardTitle>
             <CardDescription>Review the calculated results. Make adjustments if needed, then approve to finalize.</CardDescription>
           </CardHeader>
           <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                            {payrollResults.map((result) => (
                                <TableHead key={result.employeeId} className="text-left">{result.name}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow><TableCell colSpan={payrollResults.length + 1} className="p-2 bg-muted/20 font-semibold text-muted-foreground">Hours</TableCell></TableRow>
                        <TableRow><TableCell>Total Hours Worked</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">{formatHours(r.totalHoursWorked)}</TableCell>)}</TableRow>
                        <TableRow><TableCell>Check Hours</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">{formatHours(r.checkHours)}</TableCell>)}</TableRow>
                        <TableRow><TableCell>Other Hours</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">{formatHours(r.otherHours)}</TableCell>)}</TableRow>
                        <TableRow><TableCell>PTO Used</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">{formatHours(r.ptoUsed)}</TableCell>)}</TableRow>

                        <TableRow><TableCell colSpan={payrollResults.length + 1} className="p-2 bg-muted/20 font-semibold text-muted-foreground">Pay</TableCell></TableRow>
                        <TableRow><TableCell>Rate/Check</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">{formatCurrency(r.payRateCheck)}</TableCell>)}</TableRow>
                        <TableRow><TableCell>Rate/Others</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">{formatCurrency(r.payRateOthers)}</TableCell>)}</TableRow>
                        <TableRow><TableCell>Others-ADJ $</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left"><Input type="number" step="0.01" className="h-8 w-28" value={r.otherAdjustment} onChange={(e) => handleResultAdjustmentChange(r.employeeId, e.target.value)} /></TableCell>)}</TableRow>
                        <TableRow><TableCell className="font-semibold">Gross Check Amount</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="font-semibold text-left tabular-nums">{formatCurrency(r.grossCheckAmount)}</TableCell>)}</TableRow>
                        <TableRow><TableCell className="font-semibold">Gross Other Amount</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="font-semibold text-left tabular-nums">{formatCurrency(r.grossOtherAmount)}</TableCell>)}</TableRow>
                        <TableRow><TableCell className="font-semibold">Net Pay</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="font-semibold text-left tabular-nums">{formatCurrency(r.netPay)}</TableCell>)}</TableRow>
                        
                        <TableRow><TableCell colSpan={payrollResults.length + 1} className="p-2 bg-muted/20 font-semibold text-muted-foreground">PTO Balance</TableCell></TableRow>
                        <TableRow><TableCell>New PTO Balance</TableCell>{payrollResults.map(r => <TableCell key={r.employeeId} className="text-left tabular-nums">({formatHours(r.newPtoBalance)})</TableCell>)}</TableRow>
                    </TableBody>
                </Table>
            </div>
             
             <Separator className="my-6" />

             <div className="space-y-4">
                <h3 className="text-lg font-medium">Payroll Summary</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <FormItem>
                       <FormLabel>GP: <span className="font-bold">{formatCurrency(payrollResults.reduce((s, r) => s + r.grossCheckAmount, 0))}</span></FormLabel>
                    </FormItem>
                    <FormItem>
                       <FormLabel>Employee</FormLabel>
                       <FormControl><Input value={summaryEmployee} onChange={(e) => setSummaryEmployee(e.target.value)} /></FormControl>
                    </FormItem>
                     <FormItem>
                       <FormLabel>DED:</FormLabel>
                       <FormControl><Input value={summaryDeductions} onChange={(e) => setSummaryDeductions(e.target.value)} /></FormControl>
                    </FormItem>
                     <FormItem>
                       <FormLabel>NET</FormLabel>
                       <FormControl><Input value={summaryNetPay} onChange={(e) => setSummaryNetPay(e.target.value)} /></FormControl>
                    </FormItem>
                </div>
             </div>


             <div className="flex justify-end pt-6">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleApprovePayroll} disabled={isApproving}>
                    {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    {isApproving ? 'Saving...' : (isEditMode ? 'Update & Finalize' : 'Approve & Finalize')}
                </Button>
             </div>
           </CardContent>
         </Card>
       )}
     </>
   );
}
