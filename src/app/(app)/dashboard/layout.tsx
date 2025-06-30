'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, Users, Calculator, Settings, LogOut, CalendarClock } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    // In a real application, you would also clear authentication tokens or session data.
    router.push('/login');
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="items-center">
           <Link href="/dashboard" className="flex items-center gap-2">
             {/* Placeholder for Logo */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
            <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">PayrollPal</h1>
           </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                 <Link href="/dashboard">
                  <Home />
                  <span>Dashboard</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Employees">
                 <Link href="/dashboard/employees">
                  <Users />
                  <span>Employees</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Payroll">
                 <Link href="/dashboard/payroll">
                  <Calculator />
                  <span>Payroll</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="PTO Tracker">
                 <Link href="/dashboard/pto">
                  <CalendarClock />
                  <span>PTO Tracker</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                 <Link href="/dashboard/settings">
                  <Settings />
                  <span>Settings</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-6 print:p-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
