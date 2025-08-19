
"use client"

import * as React from "react";
import { format } from "date-fns"
import Link from "next/link";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Play, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from "@/contexts/auth-context";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payroll } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function PayrollHistoryPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [pastPayrolls, setPastPayrolls] = React.useState<Payroll[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [payrollToDelete, setPayrollToDelete] = React.useState<Payroll | null>(null);

    React.useEffect(() => {
        if (!user) return;

        const payrollsCollectionRef = collection(db, 'users', user.uid, 'payrolls');
        const q = query(payrollsCollectionRef, orderBy('toDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const payrollsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Payroll));
            setPastPayrolls(payrollsData);
            setIsLoading(false);
        }, () => setIsLoading(false));

        return () => unsubscribe();
    }, [user]);

   const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

   const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "MMMM d, yyyy");
  };

  const handleDeletePayroll = async () => {
    if (!user || !payrollToDelete) return;

    try {
      // Delete the payroll document
      const payrollDocRef = doc(db, 'users', user.uid, 'payrolls', payrollToDelete.id);
      await deleteDoc(payrollDocRef);

      toast({
        title: "Payroll Deleted",
        description: `The payroll for ${formatDate(payrollToDelete.fromDate)} - ${formatDate(payrollToDelete.toDate)} has been deleted.`,
        variant: "destructive",
      });

    } catch (error) {
      console.error("Error deleting payroll: ", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the payroll record.",
        variant: "destructive",
      });
    } finally {
        setPayrollToDelete(null);
    }
  };


  return (
    <div className="space-y-6">
       <Button variant="outline" asChild className="w-fit">
        <Link href="/dashboard/manager">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manager Dashboard
        </Link>
      </Button>
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Run new payroll or review past history.</p>
        </div>
        <Button asChild variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
           <Link href="/dashboard/payroll/run">
             <Play className="mr-2 h-4 w-4" /> Run New Payroll
           </Link>
        </Button>
      </div>

      {/* Past Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5 text-muted-foreground"/> Payroll History</CardTitle>
          <CardDescription>Review past payroll runs.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
             </div>
           ) : pastPayrolls.length > 0 ? (
              <ul className="space-y-3">
                {pastPayrolls.map((payroll) => (
                  <li key={payroll.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">Payroll Run: {formatDate(payroll.fromDate)} - {formatDate(payroll.toDate)}</p>
                      <p className="text-sm text-muted-foreground">Status: {payroll.status}</p>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/payroll/run?id=${payroll.id}`} aria-label="Edit Payroll">
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setPayrollToDelete(payroll)} aria-label="Delete Payroll">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                       <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                         <Link href={`/dashboard/payroll/report?id=${payroll.id}`}>View Details</Link>
                       </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
           ) : (
            <p className="text-center text-muted-foreground py-10">No past payroll runs found.</p>
           )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!payrollToDelete} onOpenChange={(isOpen) => !isOpen && setPayrollToDelete(null)}>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the payroll record
            for the period{' '}
            <span className="font-semibold">{payrollToDelete ? `${formatDate(payrollToDelete.fromDate)} - ${formatDate(payrollToDelete.toDate)}` : ''}</span>.
            <br/><br/>
            Employee PTO balances will <span className="font-semibold text-destructive">not</span> be changed.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
            onClick={handleDeletePayroll}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
            Yes, delete payroll
            </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
