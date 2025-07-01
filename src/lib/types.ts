
export type Employee = {
  id: string; // Document ID from Firestore
  firstName: string;
  lastName: string;
  email?: string;
  mobileNumber?: string;
  ssn?: string;
  payMethod: 'Hourly';
  payRateCheck: number;
  payRateOthers?: number;
  standardCheckHours?: number;
  ptoBalance: number;
  comment?: string;
};

// Data structure for creating a new employee in Firestore (without id)
export type NewEmployee = Omit<Employee, 'id'>;
