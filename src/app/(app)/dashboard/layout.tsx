
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, Users, Calculator, Settings, LogOut, CalendarClock, BookUser } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

type UserRole = 'manager' | 'employee';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = React.useState<UserRole>('employee');

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
  React.useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRole(data.role || 'employee');
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
        toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
        });
        router.push('/login');
    } catch (error) {
        console.error("Logout Error: ", error);
        toast({
            title: "Logout Failed",
            description: "An error occurred while logging out.",
            variant: "destructive"
        });
    }
  };

  if (loading || !user) {
      return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="items-center">
           <Link href="/dashboard" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
            <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">Paypall</h1>
           </Link>
          <SidebarTrigger className="ml-auto" />
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
            
            {userRole === 'manager' && (
              <>
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
              </>
            )}

             {userRole === 'employee' && (
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Timesheet">
                    <Link href="/dashboard/timesheet">
                    <BookUser />
                    <span>My Timesheet</span>
                    </Link>
                </SidebarMenuButton>
               </SidebarMenuItem>
            )}

            {userRole === 'manager' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                    <Link href="/dashboard/settings">
                    <Settings />
                    <span>Settings</span>
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
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
