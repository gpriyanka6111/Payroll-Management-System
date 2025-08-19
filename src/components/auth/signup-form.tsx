
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
import { UserPlus, AlertTriangle } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';

const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/;
const timeFormatMessage = "Use HH:MM format (e.g., 09:00 or 05:00).";

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' }),
  confirmPassword: z.string(),
  companyName: z.string().min(1, { message: "Company name is required." }),
  payFrequency: z.string().default('bi-weekly'),
  standardBiWeeklyHours: z.coerce.number().positive({ message: "Standard hours must be positive." }),
  openingTimeWeekdays: z.string().regex(timeRegex, { message: timeFormatMessage }),
  openingTimeWeekdaysAmPm: z.enum(['AM', 'PM']),
  closingTimeWeekdays: z.string().regex(timeRegex, { message: timeFormatMessage }),
  closingTimeWeekdaysAmPm: z.enum(['AM', 'PM']),
  openingTimeSaturday: z.string().regex(timeRegex, { message: timeFormatMessage }),
  openingTimeSaturdayAmPm: z.enum(['AM', 'PM']),
  closingTimeSaturday: z.string().regex(timeRegex, { message: timeFormatMessage }),
  closingTimeSaturdayAmPm: z.enum(['AM', 'PM']),
  sundayClosed: z.boolean(),
  openingTimeSunday: z.string().optional(),
  openingTimeSundayAmPm: z.enum(['AM', 'PM']).optional(),
  closingTimeSunday: z.string().optional(),
  closingTimeSundayAmPm: z.enum(['AM', 'PM']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
    if (!data.sundayClosed) {
        if (!data.openingTimeSunday || !timeRegex.test(data.openingTimeSunday)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: timeFormatMessage, path: ['openingTimeSunday'] });
        }
        if (!data.closingTimeSunday || !timeRegex.test(data.closingTimeSunday)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: timeFormatMessage, path: ['closingTimeSunday'] });
        }
    }
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      payFrequency: 'bi-weekly',
      standardBiWeeklyHours: 80,
      openingTimeWeekdays: '09:00',
      openingTimeWeekdaysAmPm: 'AM',
      closingTimeWeekdays: '05:00',
      closingTimeWeekdaysAmPm: 'PM',
      openingTimeSaturday: '10:00',
      openingTimeSaturdayAmPm: 'AM',
      closingTimeSaturday: '03:00',
      closingTimeSaturdayAmPm: 'PM',
      sundayClosed: true,
      openingTimeSunday: '12:00',
      openingTimeSundayAmPm: 'PM',
      closingTimeSunday: '05:00',
      closingTimeSundayAmPm: 'PM',
    },
  });

  const sundayClosed = form.watch('sundayClosed');

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    setError(null);

    if (!auth || !db) {
        setError("Firebase is not configured correctly. Please contact support.");
        setIsLoading(false);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            companyName: values.companyName,
            payFrequency: values.payFrequency,
            standardBiWeeklyHours: values.standardBiWeeklyHours,
            storeTimings: {
                openWeekdays: `${values.openingTimeWeekdays} ${values.openingTimeWeekdaysAmPm}`,
                closeWeekdays: `${values.closingTimeWeekdays} ${values.closingTimeWeekdaysAmPm}`,
                openSaturday: `${values.openingTimeSaturday} ${values.openingTimeSaturdayAmPm}`,
                closeSaturday: `${values.closingTimeSaturday} ${values.closingTimeSaturdayAmPm}`,
                sundayClosed: values.sundayClosed,
                openSunday: values.sundayClosed ? null : `${values.openingTimeSunday} ${values.openingTimeSundayAmPm}`,
                closeSunday: values.sundayClosed ? null : `${values.closingTimeSunday} ${values.closingTimeSundayAmPm}`,
            },
            role: 'manager',
            createdAt: new Date(),
        });
        
        toast({
            title: 'Account Created Successfully!',
            description: 'Redirecting you to the dashboard.',
        });

        router.push('/dashboard');
    } catch (err: any) {
        let errorMessage = "An unknown error occurred.";
        if (err.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use.";
        } else {
            errorMessage = "Failed to create an account. Please try again.";
        }
        console.error("Signup Error:", err);
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">Sign Up</CardTitle>
        <CardDescription className="text-center">
          Create your WorkRoll account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Signup Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Company LLC" {...field} disabled={isLoading} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} disabled={isLoading} />
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
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
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
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            <div className="space-y-4">
                 <div>
                    <h3 className="text-sm font-medium">Payroll Defaults</h3>
                    <p className="text-sm text-muted-foreground">Set default values for your payroll runs.</p>
                 </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                    control={form.control}
                    name="payFrequency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pay Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                            <FormControl>
                            <SelectTrigger disabled={isLoading}>
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
                            <Input type="number" placeholder="e.g., 80" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-medium">Store Hours</h3>
                    <p className="text-sm text-muted-foreground">Used to auto-clock out employees who forget.</p>
                </div>

                <div className="space-y-4">
                    {/* Weekdays */}
                    <div className="p-4 border rounded-md">
                        <FormLabel className="font-semibold">Mon - Fri</FormLabel>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                                <FormLabel className="text-xs">Opening Time</FormLabel>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="openingTimeWeekdays" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="09:00" {...field} disabled={isLoading}/></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="openingTimeWeekdaysAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger disabled={isLoading}><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabel className="text-xs">Closing Time</FormLabel>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="closingTimeWeekdays" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="05:00" {...field} disabled={isLoading}/></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="closingTimeWeekdaysAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger disabled={isLoading}><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Saturday */}
                    <div className="p-4 border rounded-md">
                        <FormLabel className="font-semibold">Saturday</FormLabel>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                                <FormLabel className="text-xs">Opening Time</FormLabel>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="openingTimeSaturday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="10:00" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="openingTimeSaturdayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger disabled={isLoading}><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabel className="text-xs">Closing Time</FormLabel>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="closingTimeSaturday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="03:00" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="closingTimeSaturdayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger disabled={isLoading}><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Sunday */}
                    <div className="p-4 border rounded-md">
                         <div className="flex items-center justify-between mb-2">
                            <FormLabel className="font-semibold">Sunday</FormLabel>
                            <FormField
                                control={form.control}
                                name="sundayClosed"
                                render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} id="sundayClosed"/>
                                    </FormControl>
                                    <FormLabel htmlFor="sundayClosed" className="text-sm font-normal">Closed</FormLabel>
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                                <FormLabel className="text-xs">Opening Time</FormLabel>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="openingTimeSunday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="12:00" {...field} disabled={isLoading || sundayClosed} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="openingTimeSundayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={isLoading || sundayClosed}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabel className="text-xs">Closing Time</FormLabel>
                                <div className="flex gap-2">
                                    <FormField control={form.control} name="closingTimeSunday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="05:00" {...field} disabled={isLoading || sundayClosed} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="closingTimeSundayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={isLoading || sundayClosed}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing up...' : <><UserPlus className="mr-2 h-4 w-4" /> Sign Up</>}
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
