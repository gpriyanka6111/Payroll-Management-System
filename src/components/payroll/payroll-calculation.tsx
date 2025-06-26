
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Calculator, AlertTriangle, CheckCircle, Trash2, CalendarDays } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Placeholder fixed tax rate for MVP
const TAX_RATE = 0.15; // 15%

// Define Zod schema for a single employee's payroll input
const employeePayrollInputSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
  payMethod: z.enum(['Hourly', 'Other']), // Changed from payType
  payRate: z.number(), // Rate per hour or other basis
  hoursWorked: z.coerce.number().min(0, { message: 'Hours must be non-negative.' }).default(0),
  ptoUsed: z.coerce.number().min(0, { message: 'PTO hours must be non-negative.' }).default(0),
  // Include fields needed for display but not direct input in this specific form part
  ptoBalance: z.number().optional(), // For display and validation
  standardHoursPerPayPeriod: z.number().optional(), // Relevant for Hourly
  payRateOthers: z.coerce.number().min(0).optional(), // Optional, for 'Other' pay method cash rate. Added this from employee form schema
});

// Define Zod schema for the overall form
const payrollFormSchema = z.object({
  employees: z.array(employeePayrollInputSchema),
}).refine(
  (data) => data.employees.every((emp) => emp.ptoUsed <= (emp.ptoBalance ?? 0)),
  {
    message: "PTO used cannot exceed available balance.",
    path: ["employees"], // General path, consider refining
  }
);


type PayrollFormValues = z.infer<typeof payrollFormSchema>;

// Define structure for calculated payroll results
type PayrollResult = {
  employeeId: string;
  name: string;
  regularPay: number;
  ptoPay: number;
  grossPay: number;
  taxes: number;
  netPay: number;
  otherPay: number; // Added to store 'Other' payment amount
};

// Placeholder employee data (replace with actual data fetching)
// Assuming this data comes from your employee management source
const initialEmployeesData = [
  { employeeId: 'emp001', name: 'Alice Smith', payMethod: 'Hourly' as const, payRate: 25.50, ptoBalance: 40.0, standardHoursPerPayPeriod: 80 },
  // Bob uses 'Other', payRate is check amount, payRateOthers is cash amount
  { employeeId: 'emp002', name: 'Bob Johnson', payMethod: 'Other' as const, payRate: 2200.00, payRateOthers: 500.00, ptoBalance: 80.0, standardHoursPerPayPeriod: 80 },
  { employeeId: 'emp004', name: 'Diana Prince', payMethod: 'Hourly' as const, payRate: 28.75, ptoBalance: 25.5, standardHoursPerPayPeriod: 80 },
];


export function PayrollCalculation() {
  const { toast } = useToast();
  const [payrollResults, setPayrollResults] = React.useState<PayrollResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employees: initialEmployeesData.map(emp => ({
          ...emp,
          hoursWorked: emp.payMethod === 'Hourly' ? 0 : 0, // Default to 0, user enters actuals
          ptoUsed: 0,
          payRateOthers: emp.payRateOthers ?? 0, // Initialize from data or 0
        })),
    },
     mode: "onChange", // Validate on change
  });

   const { fields } = useFieldArray({
    control: form.control,
    name: "employees",
   });

   // Helper function to safely convert value to number for calculations
   const safeGetNumber = (value: unknown): number => {
     const num = Number(value);
     return isNaN(num) ? 0 : num;
   };


  function calculatePayroll(values: PayrollFormValues): PayrollResult[] {
    return values.employees.map((emp) => {
      let regularPay = 0; // Pay from check/hourly rate
      let ptoPay = 0;
      let otherPay = 0; // Pay from 'Other' sources like cash
      let effectiveHourlyRate = emp.payRate; // Start with the assumption it might be hourly

       // Use safeGetNumber for potentially string inputs from form state
       const hoursWorked = safeGetNumber(emp.hoursWorked);
       const ptoUsed = safeGetNumber(emp.ptoUsed);
       const payRate = safeGetNumber(emp.payRate);
       const payRateOthers = safeGetNumber(emp.payRateOthers);
       const standardHours = safeGetNumber(emp.standardHoursPerPayPeriod);


      if (emp.payMethod === 'Hourly') {
        regularPay = payRate * hoursWorked;
        // PTO pay uses the hourly rate
      } else { // 'Other' pay method
        // Regular pay is the fixed amount per check
        regularPay = payRate;
        // Other pay is the cash amount
        otherPay = payRateOthers;

        // Calculate effective hourly rate for PTO if possible
        if (standardHours > 0) {
             effectiveHourlyRate = payRate / standardHours; // Effective rate based on check amount
             // Note: Policy decision needed if PTO should also consider cash portion. Currently it doesn't.
        } else {
            // Policy decision needed: How is PTO paid for 'Other'? Maybe based on avg hours?
            // For now, assume no effective rate can be calculated for PTO if standard hours missing.
            effectiveHourlyRate = 0; // Cannot calculate PTO pay accurately
        }
      }

      // Calculate PTO pay based on the effective hourly rate (which is the actual rate for Hourly)
       if (effectiveHourlyRate > 0) {
         ptoPay = effectiveHourlyRate * ptoUsed;
       }


      // Gross pay includes regular pay (check/hourly), PTO pay, and other pay (cash)
      const grossPay = regularPay + ptoPay + otherPay;
      const taxes = (regularPay + ptoPay) * TAX_RATE; // Tax only the check/PTO portion for simplicity (policy needed)
      const netPay = regularPay + ptoPay - taxes; // Net check amount

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        regularPay, // Check/Hourly pay before tax/pto
        ptoPay,
        grossPay, // Total earnings (Check + PTO + Other)
        taxes, // Taxes on Check/PTO portion
        netPay, // Net amount for the Check
        otherPay, // Cash/Other amount paid separately
      };
    });
  }

  function onSubmit(values: PayrollFormValues) {
     // Manual check for PTO balance before proceeding
    let ptoError = false;
    values.employees.forEach((emp, index) => {
       const ptoUsed = safeGetNumber(emp.ptoUsed);
       const ptoBalance = safeGetNumber(emp.ptoBalance);
      if (ptoUsed > ptoBalance) {
        form.setError(`employees.${index}.ptoUsed`, {
          type: 'manual',
          message: 'Cannot use more PTO than available.',
        });
        ptoError = true;
      }
       // Validate hours worked for 'Hourly' method
       const hoursWorked = safeGetNumber(emp.hoursWorked);
        if (emp.payMethod === 'Hourly' && hoursWorked === 0 && ptoUsed === 0) {
             // Maybe warn or just allow 0 pay calculation
            console.warn(`Employee ${emp.name} has 0 hours worked and 0 PTO used.`);
        }
    });

    if (ptoError) {
       toast({
        title: 'Validation Error',
        description: 'Please correct the PTO hours used.',
        variant: 'destructive',
        action: <AlertTriangle className="h-4 w-4 text-white" />
      });
      return; // Stop submission
    }

    console.log('Payroll data submitted:', values);
    const results = calculatePayroll(values);
    setPayrollResults(results);
    setShowResults(true);
    toast({
      title: 'Payroll Calculated',
      description: 'Review the results below.',
      variant: 'default',
      action: <CheckCircle className="h-4 w-4 text-white"/>
    });
  }

   const formatCurrency = (amount: number) => {
       // Check if amount is a valid number
       if (typeof amount !== 'number' || isNaN(amount)) {
          return '$ ---.--'; // Or some placeholder for invalid numbers
       }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatHours = (hours: unknown): string => {
      const numHours = Number(hours);
      if (hours === undefined || hours === null || isNaN(numHours)) {
          return 'N/A';
      }
      return `${numHours.toFixed(1)} hrs`;
  };

  return (
     <Card>
       <CardHeader>
        <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> Calculate Payroll</CardTitle>
        <CardDescription>Enter hours worked and PTO used for each employee for the current pay period.</CardDescription>
      </CardHeader>
       <CardContent>
         <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {/* Employee Hours Input Table */}
            <div className="overflow-x-auto">
             <Table>
                 <TableHeader>
                   <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Pay Method</TableHead>
                    <TableHead className="w-[150px]">Hours Worked</TableHead>
                    <TableHead className="w-[150px]">PTO Used (hrs)</TableHead>
                    <TableHead>Available PTO</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                  {fields.map((field, index) => (
                     <TableRow key={field.id}>
                         <TableCell className="font-medium">{field.name}</TableCell>
                         <TableCell>{field.payMethod}</TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.hoursWorked`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  <FormLabel className="sr-only">Hours Worked for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          placeholder="e.g., 40"
                                          {...inputField}
                                           value={inputField.value ?? ''} // Handle undefined/null for input display
                                          className="h-8"
                                       />
                                  </FormControl>
                                   <FormMessage className="text-xs mt-1" />
                                </FormItem>
                              )}
                            />
                         </TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.ptoUsed`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  <FormLabel className="sr-only">PTO Hours Used for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          placeholder="e.g., 8"
                                          {...inputField}
                                           value={inputField.value ?? ''} // Handle undefined/null
                                          className="h-8"
                                       />
                                  </FormControl>
                                   <FormMessage className="text-xs mt-1" />
                                </FormItem>
                              )}
                            />
                         </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                              {formatHours(field.ptoBalance)}
                          </TableCell>
                    </TableRow>
                  ))}
                   {fields.length === 0 && (
                       <TableRow>
                           <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                               No active employees found for this payroll run. Add employees first.
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
                        {form.formState.errors.employees.message || "Please check the form for errors, especially PTO used."}
                      </AlertDescription>
                  </Alert>
              )}


            <Button type="submit" disabled={fields.length === 0 || form.formState.isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Calculator className="mr-2 h-4 w-4" /> Calculate Payroll
            </Button>
          </form>
        </Form>

         {/* Payroll Results Section */}
         {showResults && (() => {
            const currentEmployees = form.getValues().employees;
            const employeeDataMap = new Map(currentEmployees.map(e => [e.employeeId, e]));

            const totals = {
                regularPay: payrollResults.reduce((sum, r) => sum + r.regularPay, 0),
                ptoPay: payrollResults.reduce((sum, r) => sum + r.ptoPay, 0),
                otherPay: payrollResults.reduce((sum, r) => sum + r.otherPay, 0),
                grossPay: payrollResults.reduce((sum, r) => sum + r.grossPay, 0),
                taxes: payrollResults.reduce((sum, r) => sum + r.taxes, 0),
                netPay: payrollResults.reduce((sum, r) => sum + r.netPay, 0),
            };

            const metrics: Array<{
                label: string;
                getValue: (result: PayrollResult) => string | number;
                getTotal?: () => string | number;
                isBold?: boolean;
                isDestructive?: boolean;
                type?: 'separator';
            }> = [
                {
                    label: "Check Hours",
                    getValue: (result) => formatHours(employeeDataMap.get(result.employeeId)?.hoursWorked)
                },
                {
                    label: "PTO Time",
                    getValue: (result) => formatHours(employeeDataMap.get(result.employeeId)?.ptoUsed)
                },
                {
                    label: "Rate/Check",
                    getValue: (result) => {
                        const emp = employeeDataMap.get(result.employeeId);
                        if (!emp) return 'N/A';
                        return emp.payMethod === 'Hourly'
                            ? `${formatCurrency(emp.payRate)}/hr`
                            : formatCurrency(emp.payRate)
                    }
                },
                {
                    label: "Rate/Others",
                     getValue: (result) => {
                        const emp = employeeDataMap.get(result.employeeId);
                        if (!emp || emp.payMethod !== 'Other') return 'N/A';
                        return formatCurrency(emp.payRateOthers ?? 0)
                    }
                },
                 { type: 'separator', label: '', getValue: () => '' },
                {
                    label: "Check/Hourly Pay",
                    getValue: (result) => formatCurrency(result.regularPay),
                    getTotal: () => formatCurrency(totals.regularPay)
                },
                {
                    label: "PTO Paid",
                    getValue: (result) => formatCurrency(result.ptoPay),
                    getTotal: () => formatCurrency(totals.ptoPay)
                },
                {
                    label: "Gross Check Amount",
                    getValue: (result) => formatCurrency(result.regularPay + result.ptoPay),
                    getTotal: () => formatCurrency(totals.regularPay + totals.ptoPay),
                    isBold: true,
                },
                { type: 'separator', label: '', getValue: () => '' },
                {
                    label: "Other Amount",
                    getValue: (result) => formatCurrency(result.otherPay),
                    getTotal: () => formatCurrency(totals.otherPay)
                },
                {
                    label: "Gross Pay (Total)",
                    getValue: (result) => formatCurrency(result.grossPay),
                    getTotal: () => formatCurrency(totals.grossPay),
                    isBold: true
                },
                {
                    label: `Taxes (${TAX_RATE * 100}%)`,
                    getValue: (result) => `-${formatCurrency(result.taxes)}`,
                    getTotal: () => `-${formatCurrency(totals.taxes)}`,
                    isDestructive: true
                },
                {
                    label: "Net Check Pay",
                    getValue: (result) => formatCurrency(result.netPay),
                    getTotal: () => formatCurrency(totals.netPay),
                    isBold: true,
                },
                { type: 'separator', label: '', getValue: () => '' },
                {
                    label: "PTO Balance",
                     getValue: (result) => formatHours(employeeDataMap.get(result.employeeId)?.ptoBalance)
                },
            ];

             return (
                 <div className="mt-8">
                     <Separator className="my-4" />
                    <h3 className="text-xl font-semibold mb-4">Payroll Results</h3>
                     <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-primary">Calculation Complete</AlertTitle>
                        <AlertDescription>
                         Review the payroll details below. Employees are shown as columns for easy comparison.
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
                                           <TableCell key={result.employeeId} className={cn("text-right tabular-nums", {
                                               "font-semibold": metric.isBold,
                                               "text-destructive": metric.isDestructive,
                                           })}>
                                               {metric.getValue(result)}
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
                     <div className="mt-6 flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowResults(false)}>Discard Results</Button>
                          <Button disabled>Approve Payroll (Not Implemented)</Button>
                     </div>
                </div>
             )
         })()}
       </CardContent>
     </Card>
  );
}

    