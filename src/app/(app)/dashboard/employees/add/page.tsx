import { AddEmployeeForm } from '@/components/employees/add-employee-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddEmployeePage() {
  return (
    <div className="space-y-6">
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
