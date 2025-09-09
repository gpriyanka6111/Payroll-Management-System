
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function PayPeriodCalendarPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Pay Period Calendar</h1>
        <p className="text-muted-foreground">View upcoming pay periods and holidays.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            This page will display a full calendar view of all pay periods for the year.
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
