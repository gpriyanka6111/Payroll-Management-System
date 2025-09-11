
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ListChecks, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface Reminder {
    id: string;
    text: string;
    done: boolean;
    createdAt: Timestamp;
}

export function RemindersCard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [reminders, setReminders] = React.useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [newReminderText, setNewReminderText] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editingText, setEditingText] = React.useState('');

    React.useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const remindersRef = collection(db, 'users', user.uid, 'reminders');
        const q = query(remindersRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const remindersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
            remindersData.sort((a, b) => (a.done === b.done) ? 0 : a.done ? 1 : -1);
            setReminders(remindersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching reminders: ", error);
            toast({ title: "Error", description: "Could not fetch reminders.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);
    
    const handleAddReminder = async () => {
        if (!user || !newReminderText.trim()) return;
        setIsSubmitting(true);
        try {
            const remindersRef = collection(db, 'users', user.uid, 'reminders');
            await addDoc(remindersRef, {
                text: newReminderText.trim(),
                done: false,
                createdAt: serverTimestamp()
            });
            setNewReminderText('');
        } catch (error) {
            console.error("Error adding reminder: ", error);
            toast({ title: "Error", description: "Failed to add reminder.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleToggleDone = async (id: string, currentStatus: boolean) => {
        if (!user) return;
        try {
            const reminderDocRef = doc(db, 'users', user.uid, 'reminders', id);
            await updateDoc(reminderDocRef, { done: !currentStatus });
        } catch (error) {
             console.error("Error updating reminder: ", error);
             toast({ title: "Error", description: "Failed to update reminder status.", variant: "destructive" });
        }
    };

    const handleDeleteReminder = async (id: string) => {
        if (!user) return;
        try {
            const reminderDocRef = doc(db, 'users', user.uid, 'reminders', id);
            await deleteDoc(reminderDocRef);
        } catch (error) {
             console.error("Error deleting reminder: ", error);
             toast({ title: "Error", description: "Failed to delete reminder.", variant: "destructive" });
        }
    };

    const handleStartEditing = (reminder: Reminder) => {
        setEditingId(reminder.id);
        setEditingText(reminder.text);
    };
    
    const handleCancelEditing = () => {
        setEditingId(null);
        setEditingText('');
    };

    const handleSaveEdit = async () => {
        if (!user || !editingId || !editingText.trim()) return;
        setIsSubmitting(true);
        try {
             const reminderDocRef = doc(db, 'users', user.uid, 'reminders', editingId);
             await updateDoc(reminderDocRef, { text: editingText.trim() });
             handleCancelEditing();
        } catch (error) {
            console.error("Error saving reminder: ", error);
            toast({ title: "Error", description: "Failed to save reminder.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ListChecks className="mr-2 h-5 w-5"/>
                    Top Things To Do
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input 
                        placeholder="Add a new reminder..."
                        value={newReminderText}
                        onChange={(e) => setNewReminderText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddReminder()}
                        disabled={isSubmitting}
                    />
                    <Button onClick={handleAddReminder} disabled={isSubmitting || !newReminderText.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>

                {isLoading ? (
                     <div className="space-y-2">
                        <div className="flex items-center gap-2"><Checkbox disabled/><div className="h-4 bg-muted rounded-md w-3/4"/></div>
                        <div className="flex items-center gap-2"><Checkbox disabled/><div className="h-4 bg-muted rounded-md w-1/2"/></div>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        <AnimatePresence>
                        {reminders.length > 0 ? reminders.map(reminder => (
                             <motion.li 
                                key={reminder.id} 
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2 group"
                            >
                                <Checkbox 
                                    id={`reminder-${reminder.id}`}
                                    checked={reminder.done}
                                    onCheckedChange={() => handleToggleDone(reminder.id, reminder.done)}
                                />
                                {editingId === reminder.id ? (
                                     <div className="flex-1 flex items-center gap-2">
                                        <Input 
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                            className="h-8"
                                        />
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit} disabled={isSubmitting}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                         <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEditing}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <label 
                                        htmlFor={`reminder-${reminder.id}`} 
                                        className={cn("flex-1 text-sm cursor-pointer", reminder.done && "line-through text-muted-foreground")}
                                    >
                                        {reminder.text}
                                    </label>
                                )}
                                
                                {editingId !== reminder.id && (
                                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEditing(reminder)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteReminder(reminder.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </motion.li>
                        )) : (
                             <p className="text-sm text-center text-muted-foreground py-4">No reminders yet.</p>
                        )}
                        </AnimatePresence>
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
