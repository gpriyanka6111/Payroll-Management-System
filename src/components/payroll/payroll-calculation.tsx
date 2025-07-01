
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
import { Calculator, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Textarea } from '../ui/textarea';
import type { Employee } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';

const COMPANY_STANDARD_BIWEEKLY_HOURS = 100;

// Define Zod schema for a single employee's payroll input
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


// Define Zod schema for the overall form
const payrollFormSchema = z.object({
  employees: z.array(employeePayrollInputSchema),
});


type PayrollFormValues = z.infer<typeof payrollFormSchema>;

// Define structure for calculated payroll results.
export type PayrollResult = {
  employeeId: string;
  name: string;
  // Input values to display in results
  totalHoursWorked: number;
  checkHours: number;
  otherHours: number;
  ptoUsed: number;
  payRateCheck: number;
  payRateOthers: number;
  otherAdjustment: number;
  // Calculated values
  grossCheckAmount: number;
  grossOtherAmount: number;
  netPay: number;
  newPtoBalance: number;
};

interface PayrollCalculationProps {
    from: Date;
    to: Date;
}

const inputMetrics = [
    { key: 'totalHoursWorked', label: 'Total Hours Worked', props: { step: "0.1", min: "0" } },
    { key: 'checkHours', label: 'Check Hours', props: { step: "0.1", min: "0" } },
    { key: 'otherHours', label: 'Other Hours', props: { readOnly: true, className: "bg-muted/50" } },
    { key: 'ptoUsed', label: 'PTO Used', props: { step: "0.1", min: "0" } },
] as const;


export function PayrollCalculation({ from, to }: PayrollCalculationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [payrollResults, setPayrollResults] = React.useState<PayrollResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);

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

   const { setValue, watch, control, reset } = form;

    const watchedEmployees = watch("employees");

   React.useEffect(() => {
    if (!user) return;

    const fetchEmployees = async () => {
      setIsLoading(true);
      const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
      const q = query(employeesCollectionRef, orderBy('lastName', 'asc'));
      const querySnapshot = await getDocs(q);
      const employeesData: Employee[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));

      // Map fetched data to the shape required by the form
      const formValues = employeesData.map(emp => ({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          payRateCheck: emp.payRateCheck,
          payRateOthers: emp.payRateOthers ?? 0,
          ptoBalance: emp.ptoBalance,
          totalHoursWorked: emp.standardCheckHours ?? 0,
          checkHours: emp.standardCheckHours ?? 0,
          otherHours: 0,
          ptoUsed: 0,
          comment: emp.comment || '',
      }));
      
      reset({ employees: formValues });
      setIsLoading(false);
    };

    fetchEmployees();
  }, [user, reset]);


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
      const initialPtoBalance = safeGetNumber(emp.ptoBalance);

      const regularPay = payRateCheck * checkHours;
      const ptoPay = payRateCheck * ptoUsed;
      const grossCheckAmount = regularPay + ptoPay;

      const otherPay = payRateOthers * otherHours;
      const grossOtherAmount = otherPay + otherAdjustment;

      // Net pay is now just the gross check amount as taxes are removed.
      const netPay = grossCheckAmount; 
      const newPtoBalance = initialPtoBalance - ptoUsed;


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
    console.log('Payroll data submitted:', values);
    const results = calculatePayroll(values);
    setPayrollResults(results);
    setShowResults(true);
    toast({
      title: 'Payroll Calculated',
      description: 'Comments updated for this session. Review results below.',
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

  function handleApprovePayroll() {
    const currentInputs = form.getValues().employees;

    // Save data for the report page to sessionStorage
    sessionStorage.setItem('payrollResultsData', JSON.stringify(payrollResults));
    sessionStorage.setItem('payrollPeriodData', JSON.stringify({ from, to }));
    sessionStorage.setItem('payrollInputData', JSON.stringify(currentInputs));

    // Save this run to the permanent history in localStorage
    try {
        const totalAmount = payrollResults.reduce((sum, r) => sum + r.grossCheckAmount + r.grossOtherAmount, 0);
        
        const newHistoryItem = {
            id: `pay${Date.now()}`, // Simple unique ID
            fromDate: format(from, 'yyyy-MM-dd'),
            toDate: format(to, 'yyyy-MM-dd'),
            totalAmount: totalAmount,
            status: 'Completed'
        };

        const existingHistoryJSON = localStorage.getItem('payrollHistory');
        const existingHistory = existingHistoryJSON ? JSON.parse(existingHistoryJSON) : [];
        
        const updatedHistory = [newHistoryItem, ...existingHistory];

        localStorage.setItem('payrollHistory', JSON.stringify(updatedHistory));

    } catch (error) {
        console.error("Failed to save payroll history to localStorage", error);
        toast({
            title: "Error Saving History",
            description: "Could not save this payroll run to your history.",
            variant: "destructive",
        });
    }
    
    toast({
      title: "Payroll Approved",
      description: "Payroll history saved. Redirecting to the printable report page.",
    });

    setTimeout(() => {
        router.push('/dashboard/payroll/report');
    }, 500);
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
         <CardHeader>
          <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> 2. Calculate Payroll</CardTitle>
          <CardDescription>Enter hours and review comments for each employee for the current pay period.</CardDescription>
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
                          <TableHead key={field.id} className="text-center">{field.name}</TableHead>
                       ))}
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                    {inputMetrics.map((metric) => (
                       <TableRow key={metric.key}>
                           <TableCell className="font-medium">{metric.label}</TableCell>
                            {fields.map((field, index) => (
                               <TableCell key={field.id} className="text-right p-2">
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
                                                className="h-8 w-28 text-right mx-auto"
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
                            <TableCell key={field.id} className="text-center text-sm text-muted-foreground tabular-nums">
                                ({formatHours(watchedEmployees[index]?.ptoBalance)})
                            </TableCell>
                        ))}
                     </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">Comments</TableCell>
                         {fields.map((field, index) => (
                            <TableCell key={field.id} className="text-center">
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

              <Button type="submit" disabled={fields.length === 0 || form.formState.isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Calculator className="mr-2 h-4 w-4" /> Calculate Payroll
              </Button>
            </form>
          </Form>
         </CardContent>
       </Card>

       {showResults && (() => {
          const totals = {
              grossCheckAmount: payrollResults.reduce((sum, r) => sum + r.grossCheckAmount, 0),
              grossOtherAmount: payrollResults.reduce((sum, r) => sum + r.grossOtherAmount, 0),
              netPay: payrollResults.reduce((sum, r) => sum + r.netPay, 0),
              otherAdjustment: payrollResults.reduce((sum, r) => sum + r.otherAdjustment, 0),
          };

          const metrics: Array<{
              label: string;
              getValue: (result: PayrollResult) => string | number;
              getTotal?: () => string | number;
              isBold?: boolean;
              isDestructive?: boolean;
              type?: 'separator';
          }> = [
              { label: "Total Hours", getValue: (result) => formatHours(result.totalHoursWorked) },
              { label: "Check Hours", getValue: (result) => formatHours(result.checkHours) },
              { label: "Other Hours", getValue: (result) => formatHours(result.otherHours) },
              { label: "PTO Time", getValue: (result) => `(${formatHours(result.ptoUsed)})` },
              { type: 'separator', label: '', getValue: () => '' },
              { label: "Rate/Check", getValue: (result) => formatCurrency(result.payRateCheck) + "/hr" },
              { label: "Rate/Others", getValue: (result) => formatCurrency(result.payRateOthers) + "/hr" },
              { label: "Others-ADJ $", getValue: (result) => result.otherAdjustment },
              { type: 'separator', label: '', getValue: () => '' },
              {
                  label: "Gross Check Amount",
                  getValue: (result) => formatCurrency(result.grossCheckAmount),
                  getTotal: () => formatCurrency(totals.grossCheckAmount),
                  isBold: true,
              },
              {
                  label: "Gross Other Amount",
                  getValue: (result) => formatCurrency(result.grossOtherAmount),
                  getTotal: () => formatCurrency(totals.grossOtherAmount),
                  isBold: true,
              },
              { type: 'separator', label: '', getValue: () => '' },
              {
                  label: "New PTO Balance",
                   getValue: (result) => `(${formatHours(result.newPtoBalance)})`
              },
          ];

           return (
               <Card className="mt-6">
                   <CardHeader>
                        <CardTitle>Review Payroll Results</CardTitle>
                        <CardDescription>
                            Pay Period: {format(from, 'LLL dd, y')} - {format(to, 'LLL dd, y')}
                        </CardDescription>
                   </CardHeader>
                   <CardContent>
                       <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <AlertTitle className="text-primary">Calculation Complete</AlertTitle>
                          <AlertDescription>
                            Review the payroll details below. Click "Approve and View Report" to finalize.
                          </AlertDescription>
                       </Alert>
                      <div className="overflow-x-auto">
                       <Table>
                          <TableHeader>
                              <TableRow>
                                 <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                 {payrollResults.map((result) => (
                                     <TableHead key={result.employeeId} className="text-right">{result.name}</TableHead>
                                 ))}
                                 <TableHead className="text-right font-bold">Totals</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {metrics.map((metric, index) => {
                                  if (metric.type === 'separator') {
                                      return (
                                          <TableRow key={`sep-${index}`} className="bg-muted/20 hover:bg-muted/20">
                                              <TableCell colSpan={payrollResults.length + 2} className="h-2 p-0"></TableCell>
                                          </TableRow>
                                      );
                                  }
                                  return (
                                      <TableRow key={metric.label}>
                                         <TableCell className={cn("font-medium", metric.isBold && "font-bold")}>{metric.label}</TableCell>
                                         {payrollResults.map((result) => (
                                            <TableCell
                                                key={result.employeeId}
                                                className={cn(
                                                "text-right tabular-nums",
                                                { "font-semibold": metric.isBold, "text-destructive": metric.isDestructive },
                                                metric.label === "Others-ADJ $" && "p-2"
                                                )}
                                            >
                                                {metric.label === "Others-ADJ $" ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={result.otherAdjustment}
                                                    onChange={(e) => handleResultAdjustmentChange(result.employeeId, e.target.value)}
                                                    className="h-8 w-28 text-right"
                                                />
                                                ) : (
                                                    metric.getValue(result)
                                                )}
                                            </TableCell>
                                         ))}
                                         <TableCell className={cn("text-right font-bold tabular-nums", {
                                              "text-destructive": metric.isDestructive,
                                         })}>
                                             {metric.getTotal ? metric.getTotal() : ''}
                                         </TableCell>
                                      </TableRow>
                                  );
                              })}
                          </TableBody>
                       </Table>
                       </div>

                      <Separator className="my-6" />
                      <h3 className="text-xl font-semibold mb-4">Payroll Summary</h3>
                       <div className="overflow-x-auto border rounded-lg">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>GP</TableHead>
                                      <TableHead>EMPLOYEE</TableHead>

                                      <TableHead>DED:</TableHead>
                                      <TableHead>NET</TableHead>
                                      <TableHead>Others</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  <TableRow>
                                      <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.grossCheckAmount)}</TableCell>
                                      <TableCell><Input placeholder="Enter value..." /></TableCell>
                                      <TableCell><Input placeholder="Enter value..." /></TableCell>
                                      <TableCell><Input placeholder="Enter value..." /></TableCell>
                                      <TableCell className="font-semibold tabular-nums">{formatCurrency(totals.grossOtherAmount)}</TableCell>
                                  </TableRow>
                              </TableBody>
                          </Table>
                      </div>

                       <div className="mt-6 flex justify-end space-x-2">
                           <Button onClick={handleApprovePayroll} disabled={!showResults}>Approve and View Report</Button>
                       </div>
                  </CardContent>
               </Card>
           )
       })()}
     </>
  );
}
