
"use client";

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock, DollarSign, CalendarDays, Phone, Shield, Mail } from "lucide-react";
import type { EmployeePlaceholder } from '@/lib/placeholder-data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditEmployeeForm } from './edit-employee-form';

interface EmployeeTableProps {
  employees: EmployeePlaceholder[];
  onUpdate: (employee: EmployeePlaceholder) => void;
  onDelete: (employeeId: string) => void;
}

export function EmployeeTable({ employees, onUpdate, onDelete }: EmployeeTableProps) {
  const [employeeToDelete, setEmployeeToDelete] = React.useState<EmployeePlaceholder | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = React.useState<EmployeePlaceholder | null>(null);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

   const formatHours = (hours: number | undefined) => {
    if (hours === undefined) return 'N/A';
    return `${hours.toFixed(1)} hrs`;
   };

  const handleSaveEdit = (updatedEmployeeData: EmployeePlaceholder) => {
    onUpdate(updatedEmployeeData);
    setEmployeeToEdit(null);
  };

  return (
    <>
      <Table>
        <TableCaption>A list of your current employees.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead><Mail className="inline-block h-4 w-4 mr-1"/>Email</TableHead>
            <TableHead><Phone className="inline-block h-4 w-4 mr-1"/>Mobile</TableHead>
            <TableHead><Shield className="inline-block h-4 w-4 mr-1"/>SSN</TableHead>
            <TableHead><Clock className="inline-block h-4 w-4 mr-1"/>Pay Method</TableHead>
            <TableHead><DollarSign className="inline-block h-4 w-4 mr-1"/>Rate/Check</TableHead>
            <TableHead><DollarSign className="inline-block h-4 w-4 mr-1"/>Rate/Others</TableHead>
            <TableHead><Clock className="inline-block h-4 w-4 mr-1"/>Std. Check Hrs</TableHead>
            <TableHead><CalendarDays className="inline-block h-4 w-4 mr-1"/>PTO Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{`${employee.firstName} ${employee.lastName}`}</TableCell>
              <TableCell>{employee.email || 'N/A'}</TableCell>
              <TableCell>{employee.mobileNumber || 'N/A'}</TableCell>
              <TableCell>{employee.ssn || 'N/A'}</TableCell>
              <TableCell>
                  <Badge variant='secondary'>
                      {employee.payMethod}
                  </Badge>
              </TableCell>
              <TableCell>{formatCurrency(employee.payRateCheck)}/hr</TableCell>
              <TableCell>{formatCurrency(employee.payRateOthers)}/hr</TableCell>
              <TableCell>{formatHours(employee.standardCheckHours)}</TableCell>
              <TableCell>{formatHours(employee.ptoBalance)}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" aria-label="Edit employee" onClick={() => setEmployeeToEdit(employee)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete employee" onClick={() => setEmployeeToDelete(employee)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {employees.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                No employees found. Add your first employee!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Employee Dialog */}
      <Dialog open={!!employeeToEdit} onOpenChange={(isOpen) => !isOpen && setEmployeeToEdit(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the information for {employeeToEdit?.firstName} {employeeToEdit?.lastName}.
            </DialogDescription>
          </DialogHeader>
          {employeeToEdit && (
            <EditEmployeeForm
              employee={employeeToEdit}
              onSave={handleSaveEdit}
              onCancel={() => setEmployeeToEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={(isOpen) => !isOpen && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record for {employeeToDelete?.firstName} {employeeToDelete?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if(employeeToDelete) {
                  onDelete(employeeToDelete.id);
                  setEmployeeToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
