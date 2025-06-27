
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
import { Edit, Trash2, Clock, DollarSign, CalendarDays, Phone, Shield } from "lucide-react";

// Updated Employee type to include mobile number and SSN
type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  ssn?: string;
  payMethod: 'Hourly'; // Form only supports Hourly for now
  payRateCheck: number;
  payRateOthers?: number;
  standardCheckHours?: number;
  ptoBalance: number;
};

interface EmployeeTableProps {
  employees: Employee[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

   const formatHours = (hours: number | undefined) => {
    if (hours === undefined) return 'N/A';
    return `${hours.toFixed(1)} hrs`;
   };


  return (
    <Table>
      <TableCaption>A list of your current employees.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
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
              {/* TODO: Implement Edit/Delete functionality */}
              <Button variant="ghost" size="icon" aria-label="Edit employee">
                 <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete employee">
                 <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
         {employees.length === 0 && (
           <TableRow>
            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
              No employees found. Add your first employee!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
