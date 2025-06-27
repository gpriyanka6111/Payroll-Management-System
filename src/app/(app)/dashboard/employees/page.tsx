
import { EmployeeTable } from '@/components/employees/employee-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { employees } from '@/lib/placeholder-data';

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
