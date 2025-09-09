
import { AddEmployeeForm } from '@/components/employees/add-employee-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddEmployeePage() {
  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard/manager/employees">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Add New Employee</h1>
      <p className="text-muted-foreground">Enter the details for the new employee.</p>

      <Card className="max-w-2xl mx-auto">
         <CardHeader>
            <CardTitle>Employee Information</CardTitle>
             <CardDescription>Fill in the form below to add a new team member.</CardDescription>
         </CardHeader>
        <CardContent>
          <AddEmployeeForm />
        </CardContent>
      </Card>
    </div>
  );
}
