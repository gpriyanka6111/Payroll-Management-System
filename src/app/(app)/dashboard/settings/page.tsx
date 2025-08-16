
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Building, Clock, UserCircle, ArrowLeft, Loader2, Shield } from "lucide-react";
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from '@/components/ui/skeleton';

// Zod schema for form validation
const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name cannot be empty."),
  payFrequency: z.enum(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']),
  standardBiWeeklyHours: z.coerce.number().positive({ message: "Standard hours must be a positive number." }),
  storeClosingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM (24-hour).").optional(),
  securityPin: z.string().length(4, "PIN must be 4 digits.").regex(/^\d{4}$/, "PIN must only contain numbers.").optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

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
      storeClosingTime: '17:00', // Default to 5 PM
      securityPin: '',
    },
  });

  React.useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Reset form with fetched data
          form.reset({
            companyName: data.companyName || '',
            payFrequency: data.payFrequency || 'bi-weekly',
            standardBiWeeklyHours: data.standardBiWeeklyHours || 80,
            storeClosingTime: data.storeClosingTime || '17:00',
            securityPin: data.securityPin || '',
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
      // Use setDoc with merge: true to create the document if it doesn't exist, or update it if it does.
      await setDoc(userDocRef, values, { merge: true });
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
                        <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-muted-foreground"/> Payroll Defaults</CardTitle>
                        <CardDescription>Set default values for your payroll runs.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                            <FormField
                                control={form.control}
                                name="storeClosingTime"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store Closing Time</FormLabel>
                                    <FormControl>
                                    <Input type="text" placeholder="HH:MM (e.g., 17:00)" {...field} />
                                    </FormControl>
                                     <FormDescription>
                                        Used to auto-clock out employees who forget. Use 24-hour format.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
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
                             <FormField
                                control={form.control}
                                name="securityPin"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>4-Digit Security PIN</FormLabel>
                                    <FormControl>
                                    <Input type="password" placeholder="••••" maxLength={4} {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormDescription>
                                        Leave blank to disable PIN protection.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
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
