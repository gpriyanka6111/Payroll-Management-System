
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
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { employees as placeholderEmployees } from '@/lib/placeholder-data';

// Placeholder fixed tax rate for MVP
const TAX_RATE = 0.15; // 15%

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
  otherAdjustment: z.coerce.number().default(0), // New field for adjustments
}).refine(data => data.checkHours <= data.totalHoursWorked, {
    message: "Check hours cannot exceed total hours.",
    path: ["checkHours"],
}).refine(
  (data) => data.ptoUsed <= (data.ptoBalance ?? 0),
  {
    message: "PTO used cannot exceed available balance.",
    path: ["ptoUsed"], 
  }
);


// Define Zod schema for the overall form
const payrollFormSchema = z.object({
  employees: z.array(employeePayrollInputSchema),
});


type PayrollFormValues = z.infer<typeof payrollFormSchema>;

// Define structure for calculated payroll results.
type PayrollResult = {
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
  taxes: number;
  netPay: number;
  totalGrossPay: number;
  newPtoBalance: number;
};


// The form expects a specific data shape, so we map our placeholder data to it.
const initialEmployeesData = placeholderEmployees.map(emp => ({
  employeeId: emp.id,
  name: `${emp.firstName} ${emp.lastName}`,
  payRateCheck: emp.payRateCheck,
  payRateOthers: emp.payRateOthers,
  ptoBalance: emp.ptoBalance,
  checkHours: emp.standardCheckHours,
}));


export function PayrollCalculation() {
  const { toast } = useToast();
  const [payrollResults, setPayrollResults] = React.useState<PayrollResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employees: initialEmployeesData.map(emp => ({
          employeeId: emp.employeeId,
          name: emp.name,
          payRateCheck: emp.payRateCheck,
          payRateOthers: emp.payRateOthers ?? 0,
          ptoBalance: emp.ptoBalance,
          totalHoursWorked: emp.checkHours ?? 0,
          checkHours: emp.checkHours ?? 0,
          otherHours: 0,
          ptoUsed: 0,
          otherAdjustment: 0,
        })),
    },
     mode: "onChange",
  });

   const { fields } = useFieldArray({
    control: form.control,
    name: "employees",
   });

   const watchedEmployees = form.watch("employees");
   const { setValue, getValues } = form;

   const handleHoursChange = React.useCallback((index: number) => {
      const employee = getValues(`employees.${index}`);
      const totalHours = Number(employee.totalHoursWorked) || 0;
      const checkHours = Number(employee.checkHours) || 0;
      const calculatedOtherHours = Math.max(0, totalHours - checkHours);
      
      setValue(`employees.${index}.otherHours`, calculatedOtherHours, {
        shouldValidate: true,
        shouldDirty: true,
      });
   }, [getValues, setValue]);

   // Helper function to safely convert value to number for calculations
   const safeGetNumber = (value: unknown): number => {
     const num = Number(value);
     return isNaN(num) ? 0 : num;
   };
   
  function calculatePayroll(values: PayrollFormValues): PayrollResult[] {
    return values.employees.map((emp) => {
      // Recalculate values to ensure accuracy
      const totalHoursWorked = safeGetNumber(emp.totalHoursWorked);
      const checkHours = safeGetNumber(emp.checkHours);
      const otherHours = Math.max(0, totalHoursWorked - checkHours);
      const ptoUsed = safeGetNumber(emp.ptoUsed);
      const payRateCheck = safeGetNumber(emp.payRateCheck);
      const payRateOthers = safeGetNumber(emp.payRateOthers) ?? 0;
      const otherAdjustment = safeGetNumber(emp.otherAdjustment);
      const initialPtoBalance = safeGetNumber(emp.ptoBalance);
      
      const regularPay = payRateCheck * checkHours;
      const ptoPay = payRateCheck * ptoUsed;

      const grossCheckAmount = regularPay + ptoPay;
      const taxes = grossCheckAmount * TAX_RATE;
      const netPay = grossCheckAmount - taxes;
      
      const otherPay = payRateOthers * otherHours;
      const grossOtherAmount = otherPay + otherAdjustment;
      
      const totalGrossPay = grossCheckAmount + grossOtherAmount;
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
        taxes,
        netPay,
        totalGrossPay,
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
      description: 'Review the results below.',
      variant: 'default',
      action: <CheckCircle className="h-4 w-4 text-white"/>
    });
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
          return 'N/A';
      }
      return `${numHours.toFixed(1)} hrs`;
  };

  return (
     <Card>
       <CardHeader>
        <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> 2. Calculate Payroll</CardTitle>
        <CardDescription>Enter hours for each employee for the current pay period.</CardDescription>
      </CardHeader>
       <CardContent>
         <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="overflow-x-auto">
             <Table>
                 <TableHeader>
                   <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="w-[150px]">Total Hours Worked</TableHead>
                    <TableHead className="w-[150px]">Check Hours</TableHead>
                    <TableHead className="w-[150px]">Other Hours</TableHead>
                    <TableHead className="w-[150px]">PTO Used (hrs)</TableHead>
                    <TableHead className="w-[150px]">Other Adj ($)</TableHead>
                    <TableHead>Available PTO</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                  {fields.map((field, index) => (
                     <TableRow key={field.id}>
                         <TableCell className="font-medium">{field.name}</TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.totalHoursWorked`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  <FormLabel className="sr-only">Total Hours Worked for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input type="number" step="0.1" min="0" placeholder="e.g., 40" {...inputField} onChange={(e) => { inputField.onChange(e); handleHoursChange(index); }} className="h-8" />
                                  </FormControl>
                                   <FormMessage className="text-xs mt-1" />
                                </FormItem>
                              )}
                            />
                         </TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.checkHours`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  <FormLabel className="sr-only">Check Hours for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input type="number" step="0.1" min="0" placeholder="e.g., 35" {...inputField} onChange={(e) => { inputField.onChange(e); handleHoursChange(index); }} className="h-8" />
                                  </FormControl>
                                   <FormMessage className="text-xs mt-1" />
                                </FormItem>
                              )}
                            />
                         </TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.otherHours`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  <FormLabel className="sr-only">Other Hours for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input type="number" {...inputField} className="h-8 bg-muted/50" disabled/>
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
                                      <Input type="number" step="0.1" min="0" placeholder="e.g., 8" {...inputField} className="h-8" />
                                  </FormControl>
                                   <FormMessage className="text-xs mt-1" />
                                </FormItem>
                              )}
                            />
                         </TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.otherAdjustment`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  <FormLabel className="sr-only">Other Adjustment for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input type="number" step="0.01" placeholder="e.g., 50" {...inputField} className="h-8" />
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
                           <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                               No active employees found for this payroll run.
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
                        Please check the form for errors. PTO used cannot exceed available balance.
                      </AlertDescription>
                  </Alert>
              )}

            <Button type="submit" disabled={fields.length === 0 || form.formState.isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Calculator className="mr-2 h-4 w-4" /> Calculate Payroll
            </Button>
          </form>
        </Form>

         {showResults && (() => {
            const totals = {
                grossCheckAmount: payrollResults.reduce((sum, r) => sum + r.grossCheckAmount, 0),
                grossOtherAmount: payrollResults.reduce((sum, r) => sum + r.grossOtherAmount, 0),
                taxes: payrollResults.reduce((sum, r) => sum + r.taxes, 0),
                netPay: payrollResults.reduce((sum, r) => sum + r.netPay, 0),
                totalGrossPay: payrollResults.reduce((sum, r) => sum + r.totalGrossPay, 0),
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
                { label: "PTO Time", getValue: (result) => formatHours(result.ptoUsed) },
                { type: 'separator', label: '', getValue: () => '' },
                { label: "Rate/Check", getValue: (result) => formatCurrency(result.payRateCheck) + "/hr" },
                { label: "Rate/Others", getValue: (result) => formatCurrency(result.payRateOthers) + "/hr" },
                { label: "Others-ADJ $", getValue: (result) => formatCurrency(result.otherAdjustment), getTotal: () => formatCurrency(totals.otherAdjustment) },
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
                    label: "Total Gross Pay",
                    getValue: (result) => formatCurrency(result.totalGrossPay),
                    getTotal: () => formatCurrency(totals.totalGrossPay),
                    isBold: true
                },
                {
                    label: "New PTO Balance",
                     getValue: (result) => `${formatHours(result.newPtoBalance)}`
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
