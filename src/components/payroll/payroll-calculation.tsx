
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
};

// Placeholder employee data (replace with actual data fetching)
// Assuming this data comes from your employee management source
const initialEmployeesData = [
  { employeeId: 'emp001', name: 'Alice Smith', payMethod: 'Hourly' as const, payRate: 25.50, ptoBalance: 40.0, standardHoursPerPayPeriod: 80 },
  { employeeId: 'emp002', name: 'Bob Johnson', payMethod: 'Other' as const, payRate: 2200.00, ptoBalance: 80.0 }, // Changed to Other
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
          // Hours worked: Default to 0 for Hourly, maybe standard for Other if applicable? Let's default to 0 for Other too for now.
          hoursWorked: emp.payMethod === 'Hourly' ? 0 : 0,
          ptoUsed: 0,
        })),
    },
     mode: "onChange", // Validate on change
  });

   const { fields } = useFieldArray({
    control: form.control,
    name: "employees",
  });

  function calculatePayroll(values: PayrollFormValues): PayrollResult[] {
    return values.employees.map((emp) => {
      let regularPay = 0;
      let ptoPay = 0;
      let effectiveHourlyRate = emp.payRate; // Start with the assumption it might be hourly

      if (emp.payMethod === 'Hourly') {
        regularPay = emp.payRate * emp.hoursWorked;
        // PTO pay uses the hourly rate
      } else { // 'Other' pay method
        // For 'Other', regular pay might just be the payRate provided (assuming it's per period)
        regularPay = emp.payRate;
        // For PTO pay with 'Other', we need an effective hourly rate if PTO is paid hourly.
        // If standardHoursPerPayPeriod exists, use it. Otherwise, this needs clarification.
        // Defaulting to 0 PTO pay for 'Other' if standard hours unknown.
        if (emp.standardHoursPerPayPeriod && emp.standardHoursPerPayPeriod > 0) {
             effectiveHourlyRate = emp.payRate / emp.standardHoursPerPayPeriod;
        } else {
            // Policy decision needed: How is PTO paid for 'Other'? Maybe based on avg hours?
            // For now, assume no effective rate can be calculated for PTO if standard hours missing.
            effectiveHourlyRate = 0; // Cannot calculate PTO pay accurately
        }
      }

      // Calculate PTO pay based on the effective hourly rate (which is the actual rate for Hourly)
       if (effectiveHourlyRate > 0) {
         ptoPay = effectiveHourlyRate * emp.ptoUsed;
       }


      const grossPay = regularPay + ptoPay;
      const taxes = grossPay * TAX_RATE; // Using fixed rate for now
      const netPay = grossPay - taxes;

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        regularPay,
        ptoPay,
        grossPay,
        taxes,
        netPay,
      };
    });
  }

  function onSubmit(values: PayrollFormValues) {
     // Manual check for PTO balance before proceeding
    let ptoError = false;
    values.employees.forEach((emp, index) => {
      if (emp.ptoUsed > (emp.ptoBalance ?? 0)) {
        form.setError(`employees.${index}.ptoUsed`, {
          type: 'manual',
          message: 'Cannot use more PTO than available.',
        });
        ptoError = true;
      }
       // Validate hours worked for 'Hourly' method
        if (emp.payMethod === 'Hourly' && emp.hoursWorked === 0 && emp.ptoUsed === 0) {
             // Maybe warn or just allow 0 pay calculation
            console.warn(`Employee ${emp.name} has 0 hours worked and 0 PTO used.`);
        }
    });

    if (ptoError) {
       toast({
        title: 'Validation Error',
        description: 'Please correct the PTO hours used.',
        variant: 'destructive',
        action: <AlertTriangle className="text-white" />
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
      action: <CheckCircle className="text-white"/>
    });
  }

   const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
   const formatHours = (hours: number | undefined) => {
    if (hours === undefined) return 'N/A';
    return `${hours.toFixed(1)} hrs`;
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
                                          className="h-8"
                                          // Disabled only if payMethod is Other AND maybe standard hours are used instead?
                                          // Let's keep it editable for now, but clear calculation logic depends on 'Other' definition
                                          // disabled={field.payMethod === 'Other'}
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
         {showResults && (
             <div className="mt-8">
                 <Separator className="my-4" />
                <h3 className="text-xl font-semibold mb-4">Payroll Results</h3>
                 <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">Calculation Complete</AlertTitle>
                    <AlertDescription>
                      Below are the calculated pays and taxes (at a fixed {TAX_RATE * 100}% rate). Review carefully before approving. PTO pay for 'Other' method might be 0 if standard hours weren't available.
                    </AlertDescription>
                 </Alert>
                <div className="overflow-x-auto">
                 <Table>
                    <TableHeader>
                        <TableRow>
                           <TableHead>Employee</TableHead>
                           <TableHead className="text-right">Regular Pay</TableHead>
                           <TableHead className="text-right">PTO Pay</TableHead>
                           <TableHead className="text-right">Gross Pay</TableHead>
                           <TableHead className="text-right">Taxes ({TAX_RATE * 100}%)</TableHead>
                           <TableHead className="text-right">Net Pay</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payrollResults.map((result) => (
                           <TableRow key={result.employeeId}>
                               <TableCell className="font-medium">{result.name}</TableCell>
                               <TableCell className="text-right">{formatCurrency(result.regularPay)}</TableCell>
                               <TableCell className="text-right">{formatCurrency(result.ptoPay)}</TableCell>
                               <TableCell className="text-right">{formatCurrency(result.grossPay)}</TableCell>
                               <TableCell className="text-right text-destructive">-{formatCurrency(result.taxes)}</TableCell>
                               <TableCell className="text-right font-semibold">{formatCurrency(result.netPay)}</TableCell>
                           </TableRow>
                        ))}
                         {/* Totals Row */}
                         <TableRow className="font-bold bg-muted hover:bg-muted">
                              <TableCell>Totals</TableCell>
                              <TableCell className="text-right">
                                  {formatCurrency(payrollResults.reduce((sum, r) => sum + r.regularPay, 0))}
                              </TableCell>
                              <TableCell className="text-right">
                                  {formatCurrency(payrollResults.reduce((sum, r) => sum + r.ptoPay, 0))}
                              </TableCell>
                              <TableCell className="text-right">
                                  {formatCurrency(payrollResults.reduce((sum, r) => sum + r.grossPay, 0))}
                              </TableCell>
                              <TableCell className="text-right text-destructive">
                                  -{formatCurrency(payrollResults.reduce((sum, r) => sum + r.taxes, 0))}
                              </TableCell>
                              <TableCell className="text-right">
                                  {formatCurrency(payrollResults.reduce((sum, r) => sum + r.netPay, 0))}
                              </TableCell>
                         </TableRow>
                    </TableBody>
                 </Table>
                 </div>
                 {/* Add buttons for next steps like "Approve Payroll" or "Export" */}
                 <div className="mt-6 flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowResults(false)}>Discard Results</Button>
                      <Button disabled>Approve Payroll (Not Implemented)</Button>
                 </div>
            </div>
         )}
       </CardContent>
     </Card>
  );
}
