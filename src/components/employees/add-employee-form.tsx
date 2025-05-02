
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const employeeSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')), // Optional email
  payMethod: z.enum(['Hourly', 'Other'], { required_error: 'Pay method is required.' }),
  payRate: z.coerce.number().positive({ message: 'Pay rate must be a positive number.' }),
  standardHoursPerPayPeriod: z.coerce.number().min(0, { message: 'Standard hours cannot be negative.' }).optional(), // Optional, required for Hourly
  ptoBalance: z.coerce.number().min(0, { message: 'PTO balance cannot be negative.' }).default(0), // Initial PTO balance
});

// Add refinement to make standardHoursPerPayPeriod required if payMethod is Hourly
const refinedEmployeeSchema = employeeSchema.refine(
  (data) => {
    if (data.payMethod === 'Hourly') {
      return data.standardHoursPerPayPeriod !== undefined && data.standardHoursPerPayPeriod > 0;
    }
    return true;
  },
  {
    message: 'Standard hours per pay period are required for Hourly pay method.',
    path: ['standardHoursPerPayPeriod'], // Specify the path of the error
  }
);

type EmployeeFormValues = z.infer<typeof refinedEmployeeSchema>;

export function AddEmployeeForm() {
  const { toast } = useToast();
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(refinedEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      payMethod: undefined, // Force selection
      payRate: 0,
      standardHoursPerPayPeriod: 80, // Default, but might be cleared or required based on payMethod
      ptoBalance: 0,
    },
    mode: 'onChange', // Validate on change for better UX with refinement
  });

  const payMethod = form.watch('payMethod');

  // Effect to clear standard hours if payMethod is 'Other'
  React.useEffect(() => {
    if (payMethod === 'Other') {
      form.setValue('standardHoursPerPayPeriod', undefined, { shouldValidate: true });
      // Clear potential errors from previous state
      form.clearErrors('standardHoursPerPayPeriod');
    } else if (payMethod === 'Hourly' && form.getValues('standardHoursPerPayPeriod') === undefined) {
       // Set default if switching back to hourly and it's undefined
       form.setValue('standardHoursPerPayPeriod', 80, { shouldValidate: true });
    }
  }, [payMethod, form]);

  function onSubmit(values: EmployeeFormValues) {
    // Refinement in schema handles the validation for standardHours

    // Clear standardHours if payMethod is Other before submitting
    if (values.payMethod === 'Other') {
        values.standardHoursPerPayPeriod = undefined;
    }

    console.log('Employee data submitted:', values);
    toast({
      title: 'Employee Added (Simulated)',
      description: `${values.name} has been added to the system.`,
       variant: "default",
    });
    // Optionally reset form or redirect
    // form.reset();
    // router.push('/dashboard/employees');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., jane.doe@example.com" {...field} />
              </FormControl>
              <FormDescription>
                Used for sending payslips (if feature enabled).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
            control={form.control}
            name="payMethod"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Pay Method *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select pay method" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="payRate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Pay Rate ($) *</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder={payMethod === 'Hourly' ? "e.g., 25.50" : "e.g., 500"} {...field} />
                </FormControl>
                 <FormDescription>
                    {payMethod === 'Hourly' ? 'Enter the hourly wage.' : 'Enter the rate per period or other basis.'}
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

         <FormField
          control={form.control}
          name="standardHoursPerPayPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Standard Hours per Pay Period {payMethod === 'Hourly' ? '*' : '(Optional)'}</FormLabel>
              <FormControl>
                 {/* Ensure the field receives a valid value or empty string */}
                 <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g., 80"
                    {...field}
                    value={field.value ?? ''} // Handle undefined value for input
                    disabled={payMethod !== 'Hourly'}
                 />
              </FormControl>
               <FormDescription>
                Expected hours for a standard pay period (e.g., 80 for bi-weekly). Required for Hourly method.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
            control={form.control}
            name="ptoBalance"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Initial PTO Balance (hours)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.1" min="0" placeholder="e.g., 40" {...field} />
                </FormControl>
                 <FormDescription>
                    Current available PTO hours at the start.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
         />


        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
           <UserPlus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </form>
    </Form>
  );
}

