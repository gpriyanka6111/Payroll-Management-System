
import type { PayrollResult, EmployeePayrollInput } from "@/components/payroll/payroll-calculation";

export type WeeklySchedule = {
  [day in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']?: {
    start?: string;
    end?: string;
    enabled: boolean;
  };
};

export type Employee = {
  id: string; // Document ID from Firestore
  firstName: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  ssn?: string;
  payMethod: 'Hourly' | 'Salaried';
  payRateCheck?: number; // Used for hourly rate
  payRateOthers?: number; // Used for hourly rate
  biWeeklySalary?: number; // Used for salaried
  standardCheckHours?: number; // Used for hourly rate
  vacationBalance: number;
  holidayBalance: number;
  sickDayBalance: number;
  w4FormUrl?: string; // URL to the W-4 PDF file
  comment?: string;
  autoEnrollmentEnabled?: boolean;
  weeklySchedule?: WeeklySchedule;
};

// Data structure for creating a new employee in Firestore (without id)
export type NewEmployee = Omit<Employee, 'id'>;


export type Payroll = {
    id: string; // Document ID from Firestore
    fromDate: string; // YYYY-MM-DD
    toDate: string; // YYYY-MM-DD
    payDate?: string; // YYYY-MM-DD
    totalAmount: number;
    status: 'Completed';
    // Store the data used to generate the report for historical viewing
    results: PayrollResult[];
    inputs: EmployeePayrollInput[];
    summaryEmployer?: string;
    summaryEmployee?: string;
    summaryDeductions?: string;
    summaryNetPay?: string;
};

// Structure for storing holiday hour assignments
// { "employeeId": { "YYYY-MM-DD": 8, "YYYY-MM-DD": 4 }, ... }
export type HolidayAssignment = {
  [employeeId: string]: {
    [holidayDate: string]: number; // key is YYYY-MM-DD date string
  };
};

    
