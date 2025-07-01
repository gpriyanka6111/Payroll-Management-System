
"use client";

import * as React from 'react';
import { EmployeeTable } from '@/components/employees/employee-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;

    const employeesCollectionRef = collection(db, 'users', user.uid, 'employees');
    const q = query(employeesCollectionRef, orderBy('lastName', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const employeesData: Employee[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(employeesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching employees: ", error);
      toast({
        title: "Error",
        description: "Could not fetch employee data.",
        variant: "destructive"
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    if (!user) return;
    const employeeDocRef = doc(db, 'users', user.uid, 'employees', updatedEmployee.id);
    try {
      // The id should not be part of the document data itself.
      const { id, ...employeeData } = updatedEmployee;
      await updateDoc(employeeDocRef, employeeData);
      toast({
          title: "Employee Updated",
          description: `${updatedEmployee.firstName} ${updatedEmployee.lastName}'s information has been saved.`,
      });
    } catch (error) {
       console.error("Error updating employee: ", error);
       toast({
          title: "Update Failed",
          description: "Could not update employee information.",
          variant: "destructive",
       });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
     if (!user) return;
     const employee = employees.find(e => e.id === employeeId);
     if (!employee) return;
     
     const employeeDocRef = doc(db, 'users', user.uid, 'employees', employeeId);
     try {
      await deleteDoc(employeeDocRef);
      toast({
          title: "Employee Deleted",
          description: `${employee.firstName} ${employee.lastName} has been removed from the system.`,
          variant: "destructive",
      });
     } catch (error) {
       console.error("Error deleting employee: ", error);
       toast({
          title: "Delete Failed",
          description: "Could not remove employee.",
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
           {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
           ) : (
             <EmployeeTable 
              employees={employees} 
              onUpdate={handleUpdateEmployee}
              onDelete={handleDeleteEmployee}
             />
           )}
        </CardContent>
      </Card>
    </div>
  );
}
