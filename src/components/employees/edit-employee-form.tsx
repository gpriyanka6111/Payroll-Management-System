
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Mail, Save, Phone, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmployeePlaceholder } from '@/lib/placeholder-data';

const Hourly = "Hourly" as const;

const employeeSchema = z.object({
  id: z.string(),
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters.' }),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, { message: "SSN must be in XXX-XX-XXXX format." }).optional().or(z.literal('')),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  mobileNumber: z.string().regex(/^\d{10,15}$/, { message: 'Enter a valid mobile number (10-15 digits).' }).optional().or(z.literal('')),
  payMethod: z.literal(Hourly).default(Hourly),
  payRateCheck: z.coerce.number().positive({ message: 'Pay rate must be a positive number.' }),
  payRateOthers: z.coerce.number().min(0, { message: 'Pay rate cannot be negative' }).optional(),
  standardCheckHours: z.coerce.number().min(0, { message: 'Standard hours cannot be negative.' }).optional(),
  ptoBalance: z.coerce.number().min(0, { message: 'PTO balance cannot be negative.' }).default(0),
});

const refinedEmployeeSchema = employeeSchema.refine(
  (data) =>
     data.payMethod === Hourly
        ? data.standardCheckHours !== undefined && data.standardCheckHours > 0
        : true,
  {
    message: 'Standard check hours per pay period are required for Hourly pay method.',
    path: ['standardCheckHours'],
  }
);

type EmployeeFormValues = z.infer<typeof refinedEmployeeSchema>;

interface EditEmployeeFormProps {
    employee: EmployeePlaceholder;
    onSave: (values: EmployeeFormValues) => void;
    onCancel: () => void;
}

export function EditEmployeeForm({ employee, onSave, onCancel }: EditEmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(refinedEmployeeSchema),
    defaultValues: {
      ...employee,
      email: employee.email || '',
      ssn: employee.ssn || '',
      mobileNumber: employee.mobileNumber || '',
      payRateOthers: employee.payRateOthers || 0,
      standardCheckHours: employee.standardCheckHours || 40,
    },
    mode: 'onChange',
  });

  const payMethod = form.watch('payMethod');

  function onSubmit(values: EmployeeFormValues) {
    onSave(values);
  }

  const handleSsnChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const rawValue = e.target.value.replace(/-/g, '');
    const numbers = rawValue.replace(/\D/g, '');
    let formatted = '';
    if (numbers.length > 0) {
      formatted += numbers.substring(0, 3);
    }
    if (numbers.length >= 4) {
      formatted += '-' + numbers.substring(3, 5);
    }
    if (numbers.length >= 6) {
      formatted += '-' + numbers.substring(5, 9);
    }
    fieldOnChange(formatted);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                      <Input placeholder="e.g., Jane" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                      <Input placeholder="e.g., Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
           <FormField
                control={form.control}
                name="ssn"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>SSN (Optional)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                type="text" 
                                placeholder="***-**-XXXX" 
                                {...field} 
                                onChange={(e) => handleSsnChange(e, field.onChange)}
                                maxLength={11}
                                value={field.value ?? ''} 
                                className="pl-10" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mobile Number (Optional)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input type="tel" placeholder="e.g., 1234567890" {...field} value={field.value ?? ''} className="pl-10" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="email" placeholder="e.g., jane.doe@example.com" {...field} value={field.value ?? ''} className="pl-10" />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />


        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                    <SelectItem value={Hourly} >Hourly</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="payRateCheck"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hourly Rate Check ($) *</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="e.g., 25.50" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="payRateOthers"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hourly Rate Others ($)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="e.g., 15.00" {...field} value={field.value ?? 0} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
         </div>


         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
            control={form.control}
            name="standardCheckHours"
            render={({ field }) => {
                    const isHourly = payMethod === Hourly;
                    return (
                    <FormItem>
                        <FormLabel>Standard Check Hours / Pay Period {isHourly ? '*' : ''}</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.1" min="0" placeholder="e.g., 40" {...field} value={field.value ?? ''} disabled={!isHourly} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
            )}}
            />
             <FormField
                control={form.control}
                name="ptoBalance"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>PTO Balance (hours)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="e.g., 40" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
         </div>
         <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
         </div>
      </form>
    </Form>
  );
}
