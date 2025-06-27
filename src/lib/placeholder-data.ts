
// In a real application, this data would come from a database or an API.
export const employees = [
  { id: 'emp001', firstName: 'Alice', lastName: 'Smith', mobileNumber: '123-456-7890', ssn: '***-**-1234', payMethod: 'Hourly' as const, payRateCheck: 25.50, payRateOthers: 15.00, ptoBalance: 40.0, standardHoursPerPayPeriod: 80 },
  { id: 'emp002', firstName: 'Bob', lastName: 'Johnson', mobileNumber: '234-567-8901', ssn: '***-**-5678', payMethod: 'Hourly' as const, payRateCheck: 22.00, payRateOthers: 12.00, ptoBalance: 80.0, standardHoursPerPayPeriod: 80 },
  { id: 'emp003', firstName: 'Charlie', lastName: 'Brown', mobileNumber: '345-678-9012', ssn: '***-**-9012', payMethod: 'Hourly' as const, payRateCheck: 30.00, payRateOthers: 0.00, ptoBalance: 0, standardHoursPerPayPeriod: 80 },
  { id: 'emp004', firstName: 'Diana', lastName: 'Prince', mobileNumber: '456-789-0123', ssn: '***-**-3456', payMethod: 'Hourly' as const, payRateCheck: 28.75, payRateOthers: 18.00, ptoBalance: 25.5, standardHoursPerPayPeriod: 80 },
];

export type EmployeePlaceholder = typeof employees[0];
