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
import { Edit, Trash2 } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  hourlyRate: number;
  status: 'Active' | 'Inactive'; // Added status
};

interface EmployeeTableProps {
  employees: Employee[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Table>
      <TableCaption>A list of your current employees.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Hourly Rate</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">{employee.name}</TableCell>
            <TableCell>{formatCurrency(employee.hourlyRate)}</TableCell>
             <TableCell>
                <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                    {employee.status}
                </Badge>
             </TableCell>
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
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              No employees found. Add your first employee!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
