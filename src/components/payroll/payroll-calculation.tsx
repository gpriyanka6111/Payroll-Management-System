
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
  payType: z.enum(['Hourly', 'Salary']),
  payRate: z.number(), // Hourly rate or Salary per period
  hoursWorked: z.coerce.number().min(0, { message: 'Hours must be non-negative.' }).default(0),
  ptoUsed: z.coerce.number().min(0, { message: 'PTO hours must be non-negative.' }).default(0),
  // Include fields needed for display but not direct input in this specific form part
  ptoBalance: z.number().optional(), // For display and validation
});

// Define Zod schema for the overall form
const payrollFormSchema = z.object({
  employees: z.array(employeePayrollInputSchema),
}).refine(
  (data) => data.employees.every((emp) => emp.ptoUsed <= (emp.ptoBalance ?? 0)),
  {
    message: "PTO used cannot exceed available balance.",
    // You might need a more specific path or a way to target individual fields
    // For now, applying a general error or handling validation display differently.
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
  { employeeId: 'emp001', name: 'Alice Smith', payType: 'Hourly' as const, payRate: 25.50, ptoBalance: 40.0, standardHoursPerPayPeriod: 80 },
  { employeeId: 'emp002', name: 'Bob Johnson', payType: 'Salary' as const, payRate: 2200.00, ptoBalance: 80.0 },
  { employeeId: 'emp004', name: 'Diana Prince', payType: 'Hourly' as const, payRate: 28.75, ptoBalance: 25.5, standardHoursPerPayPeriod: 80 },
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
          hoursWorked: emp.payType === 'Hourly' ? 0 : (emp.standardHoursPerPayPeriod ?? 80), // Default hours for salary based on standard
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

      if (emp.payType === 'Hourly') {
        regularPay = emp.payRate * emp.hoursWorked;
        ptoPay = emp.payRate * emp.ptoUsed;
      } else { // Salary
        // Assuming salary payRate is per pay period
        regularPay = emp.payRate; // Salary is fixed for the period
        // PTO for salaried employees might be handled differently (e.g., just track time off)
        // For calculation simplicity here, we'll assume PTO payout uses an equivalent hourly rate if needed,
        // or simply doesn't add extra pay but reduces work expectation (logic depends on company policy).
        // Let's assume for now salary covers the period regardless of PTO, but track PTO used.
        // No direct 'ptoPay' addition for salary in this basic model.
        // OR calculate an effective hourly rate for PTO payout if policy dictates:
        // const effectiveHourlyRate = emp.payRate / (emp.standardHoursPerPayPeriod || 80); // Needs standard hours
        // ptoPay = effectiveHourlyRate * emp.ptoUsed;
      }

      const grossPay = regularPay + ptoPay;
      const taxes = grossPay * TAX_RATE;
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
                    <TableHead>Pay Type</TableHead>
                    <TableHead className="w-[150px]">Hours Worked</TableHead>
                    <TableHead className="w-[150px]">PTO Used (hrs)</TableHead>
                    <TableHead>Available PTO</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                  {fields.map((field, index) => (
                     <TableRow key={field.id}>
                         <TableCell className="font-medium">{field.name}</TableCell>
                         <TableCell>{field.payType}</TableCell>
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
                                          disabled={field.payType === 'Salary'} // Disable for salary
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
                      Below are the calculated pays and taxes (at a fixed {TAX_RATE * 100}% rate). Review carefully before approving.
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
