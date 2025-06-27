import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, ArrowRight } from "lucide-react";
import Link from "next/link";
import { employees } from "@/lib/placeholder-data";

export default function DashboardPage() {
  const totalEmployees = employees.length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome back! Here's a quick overview of your payroll status.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              +2 since last month
            </p>
             <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
               <Link href="/dashboard/employees">
                View Employees <ArrowRight className="ml-1 h-3 w-3" />
               </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Payroll Run
            </CardTitle>
             <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">July 31, 2024</div> {/* Placeholder Data */}
            <p className="text-xs text-muted-foreground">
              Bi-weekly schedule
            </p>
             <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
               <Link href="/dashboard/payroll">
                Run Payroll <ArrowRight className="ml-1 h-3 w-3" />
               </Link>
            </Button>
          </CardContent>
        </Card>

         <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
             <CardDescription>Get started quickly with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
             <Button variant="outline" asChild>
               <Link href="/dashboard/employees/add">
                <Users className="mr-2 h-4 w-4" /> Add New Employee
               </Link>
            </Button>
             <Button variant="default" asChild>
               <Link href="/dashboard/payroll/run">
                <Calculator className="mr-2 h-4 w-4" /> Run New Payroll
               </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       {/* Placeholder for recent activity or reports */}
       <Card>
         <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of recent payroll actions.</CardDescription>
         </CardHeader>
         <CardContent>
            <p className="text-muted-foreground">No recent activity to display. Payroll features are under development.</p>
            {/* List recent activities here */}
         </CardContent>
       </Card>
    </div>
  );
}
