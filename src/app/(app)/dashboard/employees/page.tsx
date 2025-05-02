
import { EmployeeTable } from '@/components/employees/employee-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

// Placeholder data - Updated to match the new Employee structure
const employees = [
  { id: 'emp001', name: 'Alice Smith', payMethod: 'Hourly' as const, payRate: 25.50, ptoBalance: 40.0, standardHoursPerPayPeriod: 80 },
  { id: 'emp002', name: 'Bob Johnson', payMethod: 'Other' as const, payRate: 2200.00, ptoBalance: 80.0 }, // Changed to 'Other', removed standard hours maybe? Or keep if relevant
  { id: 'emp003', name: 'Charlie Brown', payMethod: 'Hourly' as const, payRate: 30.00, ptoBalance: 0, standardHoursPerPayPeriod: 80 }, // Example no PTO
  { id: 'emp004', name: 'Diana Prince', payMethod: 'Hourly' as const, payRate: 28.75, ptoBalance: 25.5, standardHoursPerPayPeriod: 80 },
];

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your employee records.</p>
        </div>
        <Button asChild>
           <Link href="/dashboard/employees/add">
            <UserPlus className="mr-2 h-4 w-4" /> Add Employee
           </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>View and manage all your employees.</CardDescription>
        </CardHeader>
        <CardContent>
           <EmployeeTable employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}

