import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react"; // Rename import

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Manage your account and application settings.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><SettingsIcon className="mr-2 h-5 w-5 text-muted-foreground"/> Application Settings</CardTitle>
          <CardDescription>Configure PayrollPal to fit your needs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" placeholder="Your Business Name" defaultValue="My Small Business" />
             <p className="text-sm text-muted-foreground">This name might appear on future reports or payslips.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
            <Input id="taxRate" type="number" step="0.1" placeholder="e.g., 15" defaultValue="15" disabled />
             <p className="text-sm text-muted-foreground">Currently fixed for MVP. More advanced tax options coming soon.</p>
          </div>

           <div className="space-y-2">
            <Label htmlFor="payFrequency">Pay Frequency</Label>
             {/* Replace with ShadCN Select when options are defined */}
             <Input id="payFrequency" placeholder="e.g., Bi-weekly" defaultValue="Bi-weekly" disabled />
             <p className="text-sm text-muted-foreground">Payroll schedule settings are planned for future updates.</p>
          </div>

          <div className="flex justify-end">
             <Button disabled>Save Changes (Not Implemented)</Button>
          </div>

        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your login and profile information.</CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground">Account management features (like changing password or email) are not yet implemented.</p>
             {/* Placeholder for account settings form */}
        </CardContent>
      </Card>
    </div>
  );
}
