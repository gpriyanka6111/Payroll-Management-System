
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
import { Edit, Trash2, Clock, DollarSign, CalendarDays } from "lucide-react";

// Updated Employee type to reflect new structure
type Employee = {
  id: string;
  name: string;
  email?: string; // Optional
  payType: 'Hourly' | 'Salary';
  payRate: number;
  standardHoursPerPayPeriod?: number; // Optional
  ptoAccrualRate: number;
  ptoBalance: number;
  // status: 'Active' | 'Inactive'; // Removed for now, can be added back if needed
};

interface EmployeeTableProps {
  employees: Employee[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const formatCurrency = (amount: number) => {
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
          <TableHead><Clock className="inline-block h-4 w-4 mr-1"/>Pay Type</TableHead>
          <TableHead><DollarSign className="inline-block h-4 w-4 mr-1"/>Pay Rate</TableHead>
          <TableHead><CalendarDays className="inline-block h-4 w-4 mr-1"/>PTO Balance</TableHead>
          {/* <TableHead>Status</TableHead> // Removed status column */}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">{employee.name}</TableCell>
            <TableCell>
                 <Badge variant={employee.payType === 'Hourly' ? 'secondary' : 'outline'}>
                    {employee.payType}
                 </Badge>
            </TableCell>
            <TableCell>{formatCurrency(employee.payRate)}{employee.payType === 'Hourly' ? '/hr' : ' /period'}</TableCell>
            <TableCell>{formatHours(employee.ptoBalance)}</TableCell>
             {/* <TableCell>
                <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                    {employee.status}
                </Badge>
             </TableCell> */}
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
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground"> {/* Adjusted colSpan */}
              No employees found. Add your first employee!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

