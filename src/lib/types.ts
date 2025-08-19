
import type { PayrollResult, EmployeePayrollInput } from "@/components/payroll/payroll-calculation";

export type Employee = {
  id: string; // Document ID from Firestore
  firstName: string;
  lastName: string;
  email?: string;
  mobileNumber?: string;
  ssn?: string;
  payMethod: 'Hourly' | 'Salaried';
  payRateCheck?: number; // Used for hourly rate
  payRateOthers?: number; // Used for hourly rate
  biWeeklySalary?: number; // Used for salaried
  standardCheckHours?: number; // Used for hourly rate
  ptoBalance: number;
  comment?: string;
};

// Data structure for creating a new employee in Firestore (without id)
export type NewEmployee = Omit<Employee, 'id'>;


export type Payroll = {
    id: string; // Document ID from Firestore
    fromDate: string; // YYYY-MM-DD
    toDate: string; // YYYY-MM-DD
    totalAmount: number;
    status: 'Completed';
    // Store the data used to generate the report for historical viewing
    results: PayrollResult[];
    inputs: EmployeePayrollInput[];
    summaryEmployee?: string;
    summaryDeductions?: string;
    summaryNetPay?: string;
};
