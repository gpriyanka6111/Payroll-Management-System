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
import { Calculator, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Placeholder fixed tax rate for MVP
const TAX_RATE = 0.15; // 15%

// Define Zod schema for a single employee's payroll input
const employeePayrollSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
  hourlyRate: z.number(),
  hoursWorked: z.coerce.number().min(0, { message: 'Hours must be non-negative.' }).default(0),
});

// Define Zod schema for the overall form
const payrollFormSchema = z.object({
  employees: z.array(employeePayrollSchema),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

// Define structure for calculated payroll results
type PayrollResult = {
  employeeId: string;
  name: string;
  grossPay: number;
  taxes: number;
  netPay: number;
};

// Placeholder employee data (replace with actual data fetching)
const initialEmployees = [
  { employeeId: 'emp001', name: 'Alice Smith', hourlyRate: 25.50 },
  { employeeId: 'emp002', name: 'Bob Johnson', hourlyRate: 22.00 },
  { employeeId: 'emp004', name: 'Diana Prince', hourlyRate: 28.75 },
];


export function PayrollCalculation() {
  const { toast } = useToast();
  const [payrollResults, setPayrollResults] = React.useState<PayrollResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employees: initialEmployees.map(emp => ({ ...emp, hoursWorked: 0 })), // Initialize hoursWorked
    },
     mode: "onChange", // Validate on change
  });

   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "employees",
  });

  function calculatePayroll(values: PayrollFormValues): PayrollResult[] {
    return values.employees.map((emp) => {
      const grossPay = emp.hourlyRate * emp.hoursWorked;
      const taxes = grossPay * TAX_RATE;
      const netPay = grossPay - taxes;
      return {
        employeeId: emp.employeeId,
        name: emp.name,
        grossPay,
        taxes,
        netPay,
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
      variant: 'default', // Use accent color for success
      action: <CheckCircle className="text-white"/>
    });
  }

   const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
     <Card>
       <CardHeader>
        <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-muted-foreground"/> Calculate Payroll</CardTitle>
        <CardDescription>Enter hours worked for each employee for the current pay period.</CardDescription>
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
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead className="w-[150px]">Hours Worked</TableHead>
                    {/* Optional: Add action like remove */}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                  {fields.map((field, index) => (
                     <TableRow key={field.id}>
                         <TableCell className="font-medium">{field.name}</TableCell>
                         <TableCell>{formatCurrency(field.hourlyRate)}</TableCell>
                         <TableCell>
                           <FormField
                              control={form.control}
                              name={`employees.${index}.hoursWorked`}
                              render={({ field: inputField }) => (
                                <FormItem className="w-full">
                                  {/* Hide label visually but keep for accessibility */}
                                  <FormLabel className="sr-only">Hours Worked for {field.name}</FormLabel>
                                  <FormControl>
                                      <Input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          placeholder="e.g., 40"
                                          {...inputField}
                                          className="h-8" // Smaller input
                                       />
                                  </FormControl>
                                   <FormMessage className="text-xs mt-1" />
                                </FormItem>
                              )}
                            />
                         </TableCell>
                          {/* Example: Remove button
                          <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </TableCell> */}
                    </TableRow>
                  ))}
                   {fields.length === 0 && (
                       <TableRow>
                           <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                               No active employees found for this payroll run. Add employees first.
                           </TableCell>
                       </TableRow>
                   )}
                 </TableBody>
             </Table>
             </div>

            <Button type="submit" disabled={fields.length === 0} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
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
                      Below are the calculated gross pay, taxes (at a fixed {TAX_RATE * 100}% rate), and net pay for each employee.
                    </AlertDescription>
                 </Alert>
                <div className="overflow-x-auto">
                 <Table>
                    <TableHeader>
                        <TableRow>
                           <TableHead>Employee</TableHead>
                           <TableHead className="text-right">Gross Pay</TableHead>
                           <TableHead className="text-right">Taxes ({TAX_RATE * 100}%)</TableHead>
                           <TableHead className="text-right">Net Pay</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payrollResults.map((result) => (
                           <TableRow key={result.employeeId}>
                               <TableCell className="font-medium">{result.name}</TableCell>
                               <TableCell className="text-right">{formatCurrency(result.grossPay)}</TableCell>
                               <TableCell className="text-right text-destructive">-{formatCurrency(result.taxes)}</TableCell>
                               <TableCell className="text-right font-semibold">{formatCurrency(result.netPay)}</TableCell>
                           </TableRow>
                        ))}
                         {/* Totals Row */}
                         <TableRow className="font-bold bg-muted hover:bg-muted">
                              <TableCell>Totals</TableCell>
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
                      <Button variant="outline">Discard Results</Button>
                      <Button>Approve Payroll (Not Implemented)</Button>
                 </div>
            </div>
         )}
       </CardContent>
     </Card>
  );
}
