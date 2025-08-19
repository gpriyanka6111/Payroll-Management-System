
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Settings, LogOut, Shield, ClipboardList, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from '@/lib/utils';

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

  const handleProtectedLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setDestinationPath(path);
    setPinDialogOpen(true);
  };
  
  const handleProtectedSheetLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setDestinationPath(path);
    setPinDialogOpen(true);
  }

  const getUserInitials = () => {
    if (!user || !user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  }

  if (loading || !user) {
      return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/timesheet', label: 'Timesheet', icon: ClipboardList },
    { href: '/dashboard/manager', label: 'Manager Area', icon: Shield, protected: true },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
                <span className="sr-only">WorkRoll</span>
            </Link>
          </div>
           <nav className="hidden flex-1 justify-center md:flex">
             <div className="flex items-center gap-5 text-sm lg:gap-8">
                {navLinks.map(link => (
                    link.protected ? (
                        <a href={link.href} key={link.href} onClick={(e) => handleProtectedLinkClick(e, link.href)} className="text-foreground transition-colors hover:text-foreground/80">
                            {link.label}
                        </a>
                    ) : (
                        <Link href={link.href} key={link.href} className="text-foreground transition-colors hover:text-foreground/80">
                            {link.label}
                        </Link>
                    )
                ))}
              </div>
          </nav>
           <Sheet>
            <SheetTrigger asChild>
                <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
                >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <nav className="grid gap-6 text-lg font-medium">
                     <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        <span className="">WorkRoll</span>
                    </Link>
                    {navLinks.map(link => (
                         link.protected ? (
                            <a key={link.href} href={link.href} onClick={(e) => handleProtectedSheetLinkClick(e, link.href)} className="text-muted-foreground hover:text-foreground">
                                {link.label}
                            </a>
                        ) : (
                            <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
                                {link.label}
                            </Link>
                        )
                    ))}
                </nav>
            </SheetContent>
            </Sheet>
          <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
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
                        <span>Logout</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
       </header>
       <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      <PinDialog 
        open={pinDialogOpen} 
        onOpenChange={setPinDialogOpen}
        onPinVerified={() => setPinDialogOpen(false)}
        destinationPath={destinationPath}
      />
    </div>
  );
}
