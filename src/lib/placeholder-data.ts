
// In a real application, this data would come from a database or an API.
// For the PTO Tracker feature, the 'ptoBalance' is treated as the initial PTO balance for the year.
export const employees = [
  { id: 'emp001', firstName: 'Alice', lastName: 'Smith', email: 'alice.smith@example.com', mobileNumber: '1234567890', ssn: '***-**-1234', payMethod: 'Hourly' as const, payRateCheck: 25.50, payRateOthers: 15.00, ptoBalance: 40.0, standardCheckHours: 40, comment: 'First-month performance review is pending.' },
  { id: 'emp002', firstName: 'Bob', lastName: 'Johnson', email: 'bob.j@example.com', mobileNumber: '2345678901', ssn: '***-**-5678', payMethod: 'Hourly' as const, payRateCheck: 22.00, payRateOthers: 12.00, ptoBalance: 80.0, standardCheckHours: 40, comment: '' },
  { id: 'emp003', firstName: 'Charlie', lastName: 'Brown', email: 'charlie.brown@example.com', mobileNumber: '3456789012', ssn: '***-**-9012', payMethod: 'Hourly' as const, payRateCheck: 30.00, payRateOthers: 0.00, ptoBalance: 0, standardCheckHours: 80, comment: '' },
  { id: 'emp004', firstName: 'Diana', lastName: 'Prince', email: 'diana.prince@example.com', mobileNumber: '4567890123', ssn: '***-**-3456', payMethod: 'Hourly' as const, payRateCheck: 28.75, payRateOthers: 18.00, ptoBalance: 25.5, standardCheckHours: 35, comment: '' },
  { id: 'emp005', firstName: 'Eve', lastName: 'Adams', email: 'eve.adams@example.com', mobileNumber: '5678901234', ssn: '***-**-4567', payMethod: 'Hourly' as const, payRateCheck: 20.00, payRateOthers: 10.00, ptoBalance: 16.0, standardCheckHours: 40, comment: '' },
  { id: 'emp006', firstName: 'Frank', lastName: 'Miller', email: 'frank.miller@example.com', mobileNumber: '6789012345', ssn: '***-**-8901', payMethod: 'Hourly' as const, payRateCheck: 35.00, payRateOthers: 20.00, ptoBalance: 120.0, standardCheckHours: 40, comment: '' },
  { id: 'emp007', firstName: 'Grace', lastName: 'Lee', email: 'grace.lee@example.com', mobileNumber: '7890123456', ssn: '***-**-2345', payMethod: 'Hourly' as const, payRateCheck: 26.00, payRateOthers: 0.00, ptoBalance: 32.5, standardCheckHours: 40, comment: '' },
  { id: 'emp008', firstName: 'Henry', lastName: 'Wilson', email: 'henry.wilson@example.com', mobileNumber: '8901234567', ssn: '***-**-6789', payMethod: 'Hourly' as const, payRateCheck: 18.50, payRateOthers: 10.00, ptoBalance: 0.0, standardCheckHours: 30, comment: '' },
  { id: 'emp009', firstName: 'Ivy', lastName: 'Garcia', email: 'ivy.garcia@example.com', mobileNumber: '9012345678', ssn: '***-**-1122', payMethod: 'Hourly' as const, payRateCheck: 23.25, payRateOthers: 15.00, ptoBalance: 55.0, standardCheckHours: 40, comment: '' },
  { id: 'emp010', firstName: 'Jack', lastName: 'Taylor', email: 'jack.taylor@example.com', mobileNumber: '0123456789', ssn: '***-**-3344', payMethod: 'Hourly' as const, payRateCheck: 40.00, payRateOthers: 25.00, ptoBalance: 10.0, standardCheckHours: 40, comment: '' },
];

export type EmployeePlaceholder = typeof employees[0];

// Placeholder data for historical PTO usage.
// In a real app, this would be generated from saved payroll reports.
export const ptoUsageHistory = [
  { employeeId: 'emp001', ptoUsed: 8, payPeriod: '2024-01-15' },
  { employeeId: 'emp002', ptoUsed: 16, payPeriod: '2024-01-31' },
  { employeeId: 'emp004', ptoUsed: 4, payPeriod: '2024-02-15' },
  { employeeId: 'emp001', ptoUsed: 8, payPeriod: '2024-03-15' },
  { employeeId: 'emp005', ptoUsed: 8, payPeriod: '2024-03-31' },
  { employeeId: 'emp006', ptoUsed: 40, payPeriod: '2024-04-15' },
  { employeeId: 'emp009', ptoUsed: 16, payPeriod: '2024-05-31' },
  { employeeId: 'emp002', ptoUsed: 8, payPeriod: '2024-06-15' },
  { employeeId: 'emp010', ptoUsed: 8, payPeriod: '2024-07-01'},
];
