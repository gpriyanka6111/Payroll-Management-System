
"use client";

import { useState } from 'react';
import { EmployeeTable } from '@/components/employees/employee-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { employees as initialEmployees, type EmployeePlaceholder } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeePlaceholder[]>(initialEmployees);
  const { toast } = useToast();

  const handleUpdateEmployee = (updatedEmployee: EmployeePlaceholder) => {
    setEmployees(employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
    toast({
        title: "Employee Updated",
        description: `${updatedEmployee.firstName} ${updatedEmployee.lastName}'s information has been saved.`,
    });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setEmployees(employees.filter(e => e.id !== employeeId));
    if (employee) {
        toast({
            title: "Employee Deleted",
            description: `${employee.firstName} ${employee.lastName} has been removed from the system.`,
            variant: "destructive",
        });
    }
  };

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>

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
           <EmployeeTable 
             employees={employees} 
             onUpdate={handleUpdateEmployee}
             onDelete={handleDeleteEmployee}
           />
        </CardContent>
      </Card>
    </div>
  );
}
