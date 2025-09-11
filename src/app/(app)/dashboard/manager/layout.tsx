
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, History, DollarSign, CalendarClock, Calendar, Star, PlayCircle, ChevronLeft, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(280);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX - (sidebarRef.current?.getBoundingClientRect().left ?? 0);
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 400) newWidth = 400;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
   const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
  };

  const navLinks = [
    { href: '/dashboard/manager/employees', label: 'Employees', icon: Users },
    { href: '/dashboard/manager/payroll/run', label: 'Run Payroll', icon: PlayCircle },
    { href: '/dashboard/manager/payroll', label: 'Payroll History', icon: History, exact: true },
    { href: '/dashboard/manager/ytd-summary', label: 'YTD Summary', icon: DollarSign },
    { href: '/dashboard/manager/pto', label: 'PTO Tracker', icon: CalendarClock },
    { href: '/dashboard/manager/calendar', label: 'Pay Period Calendar', icon: Calendar },
    { href: '/dashboard/manager/holidays', label: 'Holidays', icon: Star },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };
  
   const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if(isCollapsed) {
        setSidebarWidth(280);
    } else {
        setSidebarWidth(64);
    }
  };


  return (
    <TooltipProvider>
      <div 
        className="grid w-full"
        style={{
             gridTemplateColumns: isCollapsed ? '64px 1fr' : `${sidebarWidth}px 1fr`,
        }}
      >
        <div ref={sidebarRef} className="relative hidden border-r bg-muted/40 md:flex">
          <div className="flex h-screen flex-col w-full">
            <div className="flex-1 pt-4">
               <div className={cn("flex items-center justify-between mb-4 px-4")}>
                <Link href="/dashboard/manager" className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}>
                    <Briefcase className="h-5 w-5" />
                    <h2 className={cn("text-lg font-semibold transition-opacity duration-300", isCollapsed && "opacity-0 w-0")}>Dashboard</h2>
                </Link>
                 <Button variant="outline" size="icon" onClick={toggleCollapse} className={cn("rounded-full h-7 w-7", isCollapsed && "rotate-180")}>
                    <ChevronLeft className="h-4 w-4"/>
                    <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>
              <Separator className="mb-4" />
              <nav className={cn("grid items-start text-base font-medium gap-y-3 px-4")}>
                {navLinks.map(link => (
                  isCollapsed ? (
                    <Tooltip key={link.href} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center justify-center gap-3 rounded-lg h-10 w-10 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                            isActive(link.href, link.exact) && "bg-muted text-primary"
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
                         isActive(link.href, link.exact) && "bg-muted text-primary"
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
          <div 
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-border/40 hover:bg-border transition-colors" 
           />
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
