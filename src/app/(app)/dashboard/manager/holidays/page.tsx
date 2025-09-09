
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export default function HolidaysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Holidays</h1>
        <p className="text-muted-foreground">Manage your company's official paid holidays.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2 h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            This page will allow you to define company holidays which will automatically apply to payroll.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-20 text-muted-foreground">
                <p>Feature under construction.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
