
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Building, Clock, UserCircle, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column for settings */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-muted-foreground"/> Company Profile</CardTitle>
                <CardDescription>This information may appear on reports and payslips.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input id="companyName" placeholder="Your Business Name" defaultValue="My Small Business" />
                    </div>
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
                    <div className="space-y-2">
                        <Label htmlFor="payFrequency">Pay Frequency</Label>
                        <Select defaultValue="bi-weekly" disabled>
                            <SelectTrigger id="payFrequency">
                                <SelectValue placeholder="Select a frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                <SelectItem value="semi-monthly">Semi-monthly (15th and end of month)</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
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
                        <Input id="email" type="email" defaultValue="user@example.com" disabled />
                    </div>
                    <Button variant="outline" disabled className="w-full">Change Password</Button>
                </CardContent>
            </Card>
        </div>
      </div>

       <div className="flex justify-end pt-4">
            <Button disabled>Save Changes (Not Implemented)</Button>
        </div>
    </div>
  );
}
