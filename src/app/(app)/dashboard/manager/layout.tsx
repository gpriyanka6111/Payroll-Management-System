
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, History, DollarSign, CalendarClock, Calendar, Star, PlayCircle, ChevronLeft, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const navLinks = [
    { href: '/dashboard/manager/employees', label: 'Employees', icon: Users },
    { href: '/dashboard/manager/payroll/run', label: 'Run Payroll', icon: PlayCircle },
    { href: '/dashboard/manager/payroll', label: 'Payroll History', icon: History },
    { href: '/dashboard/manager/ytd-summary', label: 'YTD Summary', icon: DollarSign },
    { href: '/dashboard/manager/pto', label: 'PTO Tracker', icon: CalendarClock },
    { href: '/dashboard/manager/calendar', label: 'Pay Period Calendar', icon: Calendar },
    { href: '/dashboard/manager/holidays', label: 'Holidays', icon: Star },
  ];

  return (
    <TooltipProvider>
      <div className={cn(
        "grid w-full transition-[grid-template-columns] duration-300 ease-in-out",
        isCollapsed ? "md:grid-cols-[5rem_1fr]" : "md:grid-cols-[280px_1fr]"
      )}>
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col relative">
            <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/dashboard/manager" className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}>
                    <Briefcase className="h-6 w-6" />
                    <h2 className={cn("text-lg font-semibold transition-opacity duration-300", isCollapsed && "opacity-0 w-0")}>Manager Dashboard</h2>
                </Link>
                 <Button variant="outline" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className={cn("rounded-full", isCollapsed && "rotate-180")}>
                    <ChevronLeft className="h-4 w-4"/>
                    <span className="sr-only">Toggle sidebar</span>
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className={cn("grid items-start py-4 text-sm font-medium", isCollapsed ? "px-2" : "px-4")}>
                {navLinks.map(link => (
                  isCollapsed ? (
                    <Tooltip key={link.href} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center justify-center gap-3 rounded-lg h-10 w-10 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                            pathname.startsWith(link.href) && (link.href !== '/dashboard/manager' || pathname === '/dashboard/manager') && "bg-muted text-primary"
                          )}
                        >
                          <link.icon className="h-5 w-5" />
                          <span className="sr-only">{link.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {link.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                         pathname.startsWith(link.href) && (link.href !== '/dashboard/manager' || pathname === '/dashboard/manager') && "bg-muted text-primary"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
