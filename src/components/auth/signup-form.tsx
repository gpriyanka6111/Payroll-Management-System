
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' }),
  confirmPassword: z.string(),
  payFrequency: z.string().default('bi-weekly'),
  standardBiWeeklyHours: z.coerce.number().positive({ message: "Standard hours must be positive." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { toast } = useToast();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      payFrequency: 'bi-weekly',
      standardBiWeeklyHours: 80,
    },
  });

  function onSubmit(values: SignupFormValues) {
    // TODO: Implement actual signup logic (e.g., API call)
    console.log('Signup submitted:', values);
    toast({
      title: 'Signup Attempted',
      description: 'Signup functionality is not yet implemented.',
    });
    // On successful signup, potentially redirect to login or dashboard
    // router.push('/login');
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">Sign Up</CardTitle>
        <CardDescription className="text-center">
          Create your PayrollPal account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                  control={form.control}
                  name="payFrequency"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Pay Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a frequency" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="standardBiWeeklyHours"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Standard Bi-Weekly Hours</FormLabel>
                      <FormControl>
                          <Input type="number" placeholder="e.g., 80" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
            </div>


            <Button type="submit" className="w-full">
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
