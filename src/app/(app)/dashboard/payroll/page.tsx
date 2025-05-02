import { PayrollCalculation } from '@/components/payroll/payroll-calculation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, History, Play } from 'lucide-react';

// Placeholder data - Replace with actual data fetching for past payrolls
const pastPayrolls = [
  { id: 'pay001', date: '2024-07-15', totalAmount: 5432.10, status: 'Completed' },
  { id: 'pay002', date: '2024-06-30', totalAmount: 5310.55, status: 'Completed' },
];

export default function PayrollPage() {
   const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
   const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll.</p>
        </div>
        <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
           {/* Link or action to start a new payroll run */}
           <Play className="mr-2 h-4 w-4" /> Run New Payroll
        </Button>
      </div>

      {/* Payroll Calculation Component */}
      <PayrollCalculation />


      {/* Past Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5 text-muted-foreground"/> Payroll History</CardTitle>
          <CardDescription>Review past payroll runs.</CardDescription>
        </CardHeader>
        <CardContent>
           {pastPayrolls.length > 0 ? (
              <ul className="space-y-3">
                {pastPayrolls.map((payroll) => (
                  <li key={payroll.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">Payroll Run - {formatDate(payroll.date)}</p>
                      <p className="text-sm text-muted-foreground">Status: {payroll.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                       {/* Add link/button to view details */}
                       <Button variant="link" size="sm" className="p-0 h-auto text-xs">View Details</Button>
                    </div>
                  </li>
                ))}
              </ul>
           ) : (
            <p className="text-center text-muted-foreground">No past payroll runs found.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
