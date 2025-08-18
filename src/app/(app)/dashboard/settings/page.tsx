
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Building, Clock, UserCircle, ArrowLeft, Loader2, Shield, AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]$/;
const timeFormatMessage = "Use HH:MM format (e.g., 09:00 or 05:00).";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name cannot be empty."),
  payFrequency: z.enum(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']),
  standardBiWeeklyHours: z.coerce.number().positive({ message: "Standard hours must be a positive number." }),
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

type SettingsFormValues = z.infer<typeof settingsSchema>;

const pinSchema = z.object({
    currentPin: z.string().optional(),
    newPin: z.string().length(4, "PIN must be 4 digits.").regex(/^\d{4}$/, "PIN must only contain numbers."),
    confirmPin: z.string(),
}).refine(data => data.newPin === data.confirmPin, {
    message: "New PINs do not match.",
    path: ["confirmPin"],
});

type PinFormValues = z.infer<typeof pinSchema>;

const parseTime = (timeString: string | undefined, defaultTime: string, defaultAmPm: 'AM' | 'PM') => {
    if (!timeString) return { time: defaultTime, ampm: defaultAmPm };
    const parts = timeString.split(' ');
    if (parts.length === 2 && (parts[1] === 'AM' || parts[1] === 'PM')) {
        return { time: parts[0], ampm: parts[1] as 'AM' | 'PM' };
    }
    // Fallback for old 24h format
    const [h] = timeString.split(':').map(Number);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      const hour = h % 12 === 0 ? 12 : h % 12;
      const minute = timeString.split(':')[1] || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      return { time: `${String(hour).padStart(2, '0')}:${minute}`, ampm: ampm as 'AM' | 'PM' };
    }
    return { time: defaultTime, ampm: defaultAmPm };
};

function ChangePinDialog() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [error, setError] = React.useState('');
    const [isSavingPin, setIsSavingPin] = React.useState(false);
    const [hasPin, setHasPin] = React.useState(false);

    const pinForm = useForm<PinFormValues>({
        resolver: zodResolver(pinSchema),
        defaultValues: { currentPin: '', newPin: '', confirmPin: '' },
    });
    
    React.useEffect(() => {
        if (open && user) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists() && docSnap.data().securityPin) {
                    setHasPin(true);
                } else {
                    setHasPin(false);
                }
            });
        }
    }, [open, user]);

    const handlePinSubmit = async (values: PinFormValues) => {
        if (!user) return;
        setIsSavingPin(true);
        setError('');

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const currentPinOnDb = docSnap.data().securityPin;
                // Verify current PIN if one is set
                if (hasPin && currentPinOnDb !== values.currentPin) {
                    setError('The current PIN is incorrect.');
                    setIsSavingPin(false);
                    return;
                }

                // Update to the new PIN
                await updateDoc(userDocRef, { securityPin: values.newPin });
                toast({ title: 'Success', description: 'Your security PIN has been updated.' });
                pinForm.reset();
                setOpen(false);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSavingPin(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Change Security PIN</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change Security PIN</DialogTitle>
                    <DialogDescription>
                        Update your 4-digit PIN used for accessing sensitive information.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...pinForm}>
                    <form onSubmit={pinForm.handleSubmit(handlePinSubmit)} className="space-y-4 py-4">
                        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{error}</AlertTitle></Alert>}
                        {hasPin && (
                            <FormField
                                control={pinForm.control}
                                name="currentPin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current PIN</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••" maxLength={4} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={pinForm.control}
                            name="newPin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New PIN</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••" maxLength={4} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={pinForm.control}
                            name="confirmPin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm New PIN</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••" maxLength={4} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSavingPin}>
                                {isSavingPin && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save PIN
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
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

  React.useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const openWeekdays = parseTime(data.storeTimings?.openWeekdays, '09:00', 'AM');
          const closeWeekdays = parseTime(data.storeTimings?.closeWeekdays || data.storeTimings?.weekdays, '05:00', 'PM');
          const openSaturday = parseTime(data.storeTimings?.openSaturday, '10:00', 'AM');
          const closeSaturday = parseTime(data.storeTimings?.closeSaturday || data.storeTimings?.saturday, '03:00', 'PM');
          const openSunday = parseTime(data.storeTimings?.openSunday, '12:00', 'PM');
          const closeSunday = parseTime(data.storeTimings?.closeSunday || data.storeTimings?.sunday, '05:00', 'PM');

          form.reset({
            companyName: data.companyName || '',
            payFrequency: data.payFrequency || 'bi-weekly',
            standardBiWeeklyHours: data.standardBiWeeklyHours || 80,
            openingTimeWeekdays: openWeekdays.time,
            openingTimeWeekdaysAmPm: openWeekdays.ampm,
            closingTimeWeekdays: closeWeekdays.time,
            closingTimeWeekdaysAmPm: closeWeekdays.ampm,
            openingTimeSaturday: openSaturday.time,
            openingTimeSaturdayAmPm: openSaturday.ampm,
            closingTimeSaturday: closeSaturday.time,
            closingTimeSaturdayAmPm: closeSaturday.ampm,
            sundayClosed: data.storeTimings?.sundayClosed ?? true,
            openingTimeSunday: openSunday.time,
            openingTimeSundayAmPm: openSunday.ampm,
            closingTimeSunday: closeSunday.time,
            closingTimeSundayAmPm: closeSunday.ampm,
          });
        }
        setIsLoading(false);
      }).catch(error => {
        console.error("Error fetching user settings:", error);
        toast({
          title: "Error",
          description: "Could not fetch your settings.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
    }
  }, [user, form, toast]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const dataToSave = {
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
      };

      await setDoc(userDocRef, dataToSave, { merge: true });
      toast({
        title: "Settings Saved",
        description: "Your company settings have been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const PageSkeleton = () => (
     <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company profile, payroll defaults, and account settings.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {isLoading ? <PageSkeleton /> : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column for settings */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-muted-foreground"/> Company Profile</CardTitle>
                        <CardDescription>This information may appear on reports and payslips.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="companyName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Your Business Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <div className="space-y-2">
                                <Label htmlFor="companyAddress">Company Address</Label>
                                <Input id="companyAddress" placeholder="123 Main St, Anytown, USA 12345" disabled />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-muted-foreground"/> Payroll & Timeclock Defaults</CardTitle>
                        <CardDescription>Set default values for your payroll runs and timeclock behavior.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="payFrequency"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pay Frequency</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select a frequency" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                            <SelectItem value="semi-monthly">Semi-monthly (15th and end of month)</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
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
                                        <FormLabel>Standard Hours Per Period</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="e.g., 80" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <div>
                                <FormLabel>Store Hours</FormLabel>
                                <FormDescription className="mb-2">
                                    Used to auto-clock out employees who forget.
                                </FormDescription>
                                <div className="space-y-4 mt-4">
                                    {/* Weekdays */}
                                    <div className="p-4 border rounded-md">
                                        <Label className="font-semibold">Mon - Fri</Label>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Opening Time</Label>
                                                <div className="flex gap-2">
                                                    <FormField control={form.control} name="openingTimeWeekdays" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="09:00" {...field}/></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={form.control} name="openingTimeWeekdaysAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Closing Time</Label>
                                                <div className="flex gap-2">
                                                    <FormField control={form.control} name="closingTimeWeekdays" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="05:00" {...field}/></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={form.control} name="closingTimeWeekdaysAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Saturday */}
                                     <div className="p-4 border rounded-md">
                                        <Label className="font-semibold">Saturday</Label>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Opening Time</Label>
                                                 <div className="flex gap-2">
                                                     <FormField control={form.control} name="openingTimeSaturday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="10:00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                     <FormField control={form.control} name="openingTimeSaturdayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Closing Time</Label>
                                                 <div className="flex gap-2">
                                                     <FormField control={form.control} name="closingTimeSaturday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="03:00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                     <FormField control={form.control} name="closingTimeSaturdayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Sunday */}
                                     <div className="p-4 border rounded-md">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="font-semibold">Sunday</Label>
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
                                                <Label className="text-xs">Opening Time</Label>
                                                 <div className="flex gap-2">
                                                     <FormField control={form.control} name="openingTimeSunday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="12:00" {...field} disabled={sundayClosed} /></FormControl><FormMessage /></FormItem>)} />
                                                     <FormField control={form.control} name="openingTimeSundayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={sundayClosed}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Closing Time</Label>
                                                 <div className="flex gap-2">
                                                     <FormField control={form.control} name="closingTimeSunday" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="05:00" {...field} disabled={sundayClosed} /></FormControl><FormMessage /></FormItem>)} />
                                                     <FormField control={form.control} name="closingTimeSundayAmPm" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={sundayClosed}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select></FormItem>)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column for Account */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center"><UserCircle className="mr-2 h-5 w-5 text-muted-foreground"/> Account</CardTitle>
                        <CardDescription>Manage your login information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={user?.email || 'Loading...'} disabled />
                            </div>
                            <Button variant="outline" disabled className="w-full">Change Password</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-muted-foreground"/> Security</CardTitle>
                        <CardDescription>Protect sensitive areas with a PIN.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ChangePinDialog />
                        </CardContent>
                    </Card>
                </div>
            </div>
            )}
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving || isLoading}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
