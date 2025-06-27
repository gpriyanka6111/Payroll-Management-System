
// In a real application, this data would come from a database or an API.
export const employees = [
  { id: 'emp001', firstName: 'Alice', lastName: 'Smith', email: 'alice.smith@example.com', mobileNumber: '1234567890', ssn: '***-**-1234', payMethod: 'Hourly' as const, payRateCheck: 25.50, payRateOthers: 15.00, ptoBalance: 40.0, standardCheckHours: 40 },
  { id: 'emp002', firstName: 'Bob', lastName: 'Johnson', email: 'bob.j@example.com', mobileNumber: '2345678901', ssn: '***-**-5678', payMethod: 'Hourly' as const, payRateCheck: 22.00, payRateOthers: 12.00, ptoBalance: 80.0, standardCheckHours: 40 },
  { id: 'emp003', firstName: 'Charlie', lastName: 'Brown', email: 'charlie.brown@example.com', mobileNumber: '3456789012', ssn: '***-**-9012', payMethod: 'Hourly' as const, payRateCheck: 30.00, payRateOthers: 0.00, ptoBalance: 0, standardCheckHours: 80 },
  { id: 'emp004', firstName: 'Diana', lastName: 'Prince', email: 'diana.prince@example.com', mobileNumber: '4567890123', ssn: '***-**-3456', payMethod: 'Hourly' as const, payRateCheck: 28.75, payRateOthers: 18.00, ptoBalance: 25.5, standardCheckHours: 35 },
];

export type EmployeePlaceholder = typeof employees[0];
