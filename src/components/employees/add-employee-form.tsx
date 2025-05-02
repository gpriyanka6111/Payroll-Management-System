
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
  payType: z.enum(['Hourly', 'Salary'], { required_error: 'Pay type is required.' }),
  payRate: z.coerce.number().positive({ message: 'Pay rate must be a positive number.' }),
  standardHoursPerPayPeriod: z.coerce.number().positive({ message: 'Standard hours must be positive.' }).optional(), // Optional, maybe only for hourly?
  ptoAccrualRate: z.coerce.number().min(0, { message: 'PTO accrual rate cannot be negative.' }).default(0),
  ptoBalance: z.coerce.number().min(0, { message: 'PTO balance cannot be negative.' }).default(0),
  // Removed status for now
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export function AddEmployeeForm() {
  const { toast } = useToast();
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      email: '',
      payType: undefined, // Force selection
      payRate: 0,
      standardHoursPerPayPeriod: 80, // Default for bi-weekly?
      ptoAccrualRate: 0,
      ptoBalance: 0,
    },
  });

  const payType = form.watch('payType');

  function onSubmit(values: EmployeeFormValues) {
    // TODO: Implement actual employee saving logic (e.g., API call)
    // Ensure standardHours is set if payType is Hourly
    if (values.payType === 'Hourly' && !values.standardHoursPerPayPeriod) {
        form.setError("standardHoursPerPayPeriod", { type: "manual", message: "Standard hours are required for Hourly pay type." });
        return;
    }
    // Clear standardHours if Salary (or handle based on specific logic)
    // if (values.payType === 'Salary') {
    //     values.standardHoursPerPayPeriod = undefined;
    // }

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
            name="payType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Pay Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select pay type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Salary">Salary</SelectItem>
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
                <FormLabel>
                    {payType === 'Hourly' ? 'Hourly Rate ($)' : 'Salary per Pay Period ($)'} *
                </FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder={payType === 'Hourly' ? "e.g., 25.50" : "e.g., 2000"} {...field} />
                </FormControl>
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
              <FormLabel>Standard Hours per Pay Period {payType === 'Hourly' ? '*' : '(Optional)'}</FormLabel>
              <FormControl>
                 <Input type="number" step="0.1" min="0" placeholder="e.g., 80" {...field} disabled={payType === 'Salary'}/>
              </FormControl>
               <FormDescription>
                Expected hours for a standard pay period (e.g., 80 for bi-weekly). Required for Hourly.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
            control={form.control}
            name="ptoAccrualRate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>PTO Accrual Rate (hours)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="e.g., 3.07" {...field} />
                </FormControl>
                 <FormDescription>
                    Hours earned per pay period or per hour worked (define standard).
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
        </div>


        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
           <UserPlus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </form>
    </Form>
  );
}

