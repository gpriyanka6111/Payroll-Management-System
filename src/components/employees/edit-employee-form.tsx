
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
import { Mail, Save, Phone, Shield, Upload, File as FileIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '@/contexts/auth-context';

const baseEmployeeSchema = z.object({
  id: z.string(),
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' }).regex(/^[a-zA-Z' -]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes." }),
  lastName: z.string().regex(/^[a-zA-Z' -]*$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes." }).optional(),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, { message: "SSN must be in XXX-XX-XXXX format." }).optional().or(z.literal('')),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  mobileNumber: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, { message: "Number must be in (XXX) XXX-XXXX format." }).optional().or(z.literal('')),
  vacationBalance: z.coerce.number().min(0, { message: 'Vacation balance cannot be negative.' }).default(0),
  holidayBalance: z.coerce.number().min(0, { message: 'Holiday balance cannot be negative.' }).default(0),
  sickDayBalance: z.coerce.number().min(0, { message: 'Sick day balance cannot be negative.' }).default(0),
  w4Form: z.any().optional(),
  w4FormUrl: z.string().optional(),
  comment: z.string().optional(),
});

const hourlyEmployeeSchema = baseEmployeeSchema.extend({
    payMethod: z.literal('Hourly'),
    payRateCheck: z.coerce.number().min(0, { message: 'Pay rate cannot be negative.' }),
    payRateOthers: z.coerce.number().min(0, { message: 'Pay rate cannot be negative' }).optional(),
    standardCheckHours: z.coerce.number().min(0, { message: 'Standard hours cannot be negative.' }),
    biWeeklySalary: z.coerce.number().optional(),
});

const salariedEmployeeSchema = baseEmployeeSchema.extend({
    payMethod: z.literal('Salaried'),
    biWeeklySalary: z.coerce.number().min(0, { message: 'Bi-weekly salary cannot be negative.' }),
    payRateCheck: z.coerce.number().optional(),
    payRateOthers: z.coerce.number().optional(),
    standardCheckHours: z.coerce.number().optional(),
});

const employeeSchema = z.discriminatedUnion("payMethod", [
    hourlyEmployeeSchema,
    salariedEmployeeSchema,
]);

type EmployeeFormValues = z.infer<typeof employeeSchema>;


interface EditEmployeeFormProps {
    employee: Employee;
    onSave: (values: Employee) => void;
    onCancel: () => void;
}

export function EditEmployeeForm({ employee, onSave, onCancel }: EditEmployeeFormProps) {
  const { user } = useAuth();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      ...employee,
      email: employee.email || '',
      ssn: employee.ssn || '',
      mobileNumber: employee.mobileNumber || '',
      payRateOthers: employee.payRateOthers || 0,
      standardCheckHours: employee.standardCheckHours || 0,
      biWeeklySalary: employee.biWeeklySalary || 0,
      vacationBalance: employee.vacationBalance || 0,
      holidayBalance: employee.holidayBalance || 0,
      sickDayBalance: employee.sickDayBalance || 0,
      comment: employee.comment || '',
    },
    mode: 'onChange',
  });

  const payMethod = form.watch('payMethod');

  async function onSubmit(values: EmployeeFormValues) {
    if (!user) {
        // This should not happen if the user is viewing the form
        console.error("User not authenticated");
        return;
    }

    const { w4Form, ...employeeData } = values;
    let w4FormUrl = employee.w4FormUrl || '';

    if (w4Form && w4Form.length > 0) {
        const file = w4Form[0];
        const storage = getStorage();
        const storageRef = ref(storage, `users/${user.uid}/employees/${employee.id}/${file.name}`);
        await uploadBytes(storageRef, file);
        w4FormUrl = await getDownloadURL(storageRef);
    }

    onSave({ ...employeeData, w4FormUrl });
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

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numbers = rawValue.substring(0, 10);
    let formatted = '';
    if (numbers.length > 0) {
      formatted = `(${numbers.substring(0, 3)}`;
    }
    if (numbers.length >= 4) {
      formatted += `) ${numbers.substring(3, 6)}`;
    }
    if (numbers.length >= 7) {
      formatted += `-${numbers.substring(6, 10)}`;
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
                  <FormLabel>Last Name</FormLabel>
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
                            <Input 
                                type="tel" 
                                placeholder="(XXX) XXX-XXXX" 
                                {...field} 
                                onChange={(e) => handleMobileNumberChange(e, field.onChange)}
                                maxLength={14}
                                value={field.value ?? ''} 
                                className="pl-10" />
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
                    <SelectItem value='Hourly'>Hourly</SelectItem>
                    <SelectItem value='Salaried'>Salaried</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        
        {payMethod === 'Hourly' && (
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormField control={form.control} name="payRateCheck" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Hourly Rate Check ($) *</FormLabel>
                        <FormControl><Input type="number" step="0.01" min="0" placeholder="e.g., 25.50" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>)}
                />
                <FormField control={form.control} name="payRateOthers" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Hourly Rate Others ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" min="0" placeholder="e.g., 15.00" {...field} value={field.value ?? 0} /></FormControl>
                        <FormMessage />
                    </FormItem>)}
                />
                 <FormField control={form.control} name="standardCheckHours" render={({ field }) => (
                     <FormItem>
                        <FormLabel>Standard Check Hours *</FormLabel>
                        <FormControl><Input type="number" step="0.1" min="0" placeholder="e.g., 40" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>)}
                />
             </div>
        )}

        {payMethod === 'Salaried' && (
            <FormField control={form.control} name="biWeeklySalary" render={({ field }) => (
                <FormItem>
                    <FormLabel>Bi-weekly Salary ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="e.g., 2000.00" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>)}
            />
        )}


        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FormField
                control={form.control}
                name="vacationBalance"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Vacation (hours)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="e.g., 40" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="holidayBalance"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Holiday (hours)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="e.g., 8" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="sickDayBalance"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sick Day (hours)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="e.g., 24" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="w4Form"
            render={({ field }) => (
                <FormItem>
                <FormLabel>W-4 Form (PDF)</FormLabel>
                {employee.w4FormUrl && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                        <FileIcon className="h-4 w-4" />
                        <a href={employee.w4FormUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View Current W-4
                        </a>
                    </div>
                )}
                <FormControl>
                    <div className="relative">
                        <Upload className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => field.onChange(e.target.files)}
                            className="pl-10" />
                    </div>
                </FormControl>
                <FormDescription>
                    Upload a new W-4 form to replace the existing one.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />
        
         <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Comment</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Enter any internal comments about the employee..."
                    className="resize-y"
                    {...field}
                    />
                </FormControl>
                 <FormDescription>
                    This comment is for internal use and will be visible during payroll runs.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />
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
