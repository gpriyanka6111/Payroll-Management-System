
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, History, DollarSign, CalendarClock, Calendar, Star, PlayCircle } from 'lucide-react';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();

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
    <div className="grid w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
             <h2 className="text-lg font-semibold">Manager Area</h2>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 py-4 text-sm font-medium lg:px-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname === link.href && "bg-muted text-primary"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
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
  );
}
