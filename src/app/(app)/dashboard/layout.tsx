
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, Users, Calculator, Settings, LogOut, CalendarClock, ClipboardList, DollarSign, Shield } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function PinDialog({ open, onOpenChange, onPinVerified, destinationPath }: { open: boolean, onOpenChange: (open: boolean) => void, onPinVerified: () => void, destinationPath: string }) {
    const [pin, setPin] = React.useState('');
    const [error, setError] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const handleVerifyPin = async () => {
        if (!user) {
            setError('You must be logged in.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().securityPin === pin) {
                onPinVerified();
                router.push(destinationPath);
            } else if (docSnap.exists() && !docSnap.data().securityPin) {
                 onPinVerified();
                 router.push(destinationPath);
            }
            else {
                setError('Invalid PIN. Please try again.');
            }
        } catch (err) {
            setError('An error occurred while verifying the PIN.');
        } finally {
            setIsLoading(false);
            setPin('');
        }
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
        setPin(value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enter Security PIN</DialogTitle>
                    <DialogDescription>
                        Please enter your 4-digit PIN to access this page.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={pin}
                        onChange={handlePinChange}
                        className="text-center text-2xl tracking-[1rem]"
                    />
                    <Button onClick={handleVerifyPin} className="w-full" disabled={isLoading || pin.length !== 4}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Verify PIN"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [pinDialogOpen, setPinDialogOpen] = React.useState(false);
  const [destinationPath, setDestinationPath] = React.useState('');

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
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

  const handleProtectedLinkClick = (path: string) => {
    setDestinationPath(path);
    setPinDialogOpen(true);
  };

  const getUserInitials = () => {
    if (!user || !user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  }

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
            <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">WorkRoll</h1>
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
             <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Timesheet">
                    <Link href="/dashboard/timesheet">
                    <ClipboardList />
                    <span>Timesheet</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton tooltip="Manager Area" onClick={() => handleProtectedLinkClick('/dashboard/manager')}>
                  <Shield />
                  <span>Manager Area</span>
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
        <header className="flex h-14 items-center justify-end gap-4 border-b bg-muted/40 px-6">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">Logged In As</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
        <div className="p-6 print:p-0">
          {children}
        </div>
      </SidebarInset>
      <PinDialog 
        open={pinDialogOpen} 
        onOpenChange={setPinDialogOpen}
        onPinVerified={() => setPinDialogOpen(false)}
        destinationPath={destinationPath}
      />
    </SidebarProvider>
  );
}
