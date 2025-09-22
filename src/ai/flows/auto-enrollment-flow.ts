'use server';
/**
 * @fileOverview A server action for automatically creating time entries based on employee schedules.
 *
 * - runAutoEnrollment - A function that handles the time entry creation process.
 */
import { collection, getDocs, query, where, writeBatch, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parse, addDays, startOfWeek, isAfter } from 'date-fns';

interface AutoEnrollmentOutput {
  success: boolean;
  message: string;
  entriesCreated: number;
}

export async function runAutoEnrollment(userId: string): Promise<AutoEnrollmentOutput> {
  try {
    const batch = writeBatch(db);
    let entriesCreated = 0;

    const employeesRef = collection(db, 'users', userId, 'employees');
    const q = query(employeesRef, where('autoEnrollmentEnabled', '==', true));
    const employeeSnapshot = await getDocs(q);

    if (employeeSnapshot.empty) {
      return { success: true, message: 'No employees are enabled for auto-enrollment.', entriesCreated: 0 };
    }

    const today = new Date();
    const nextWeekStart = startOfWeek(addDays(today, 7), { weekStartsOn: 0 }); // Start from next Sunday

    for (const empDoc of employeeSnapshot.docs) {
      const employee = empDoc.data();
      if (!employee.weeklySchedule) continue;

      for (let i = 0; i < 7; i++) {
        const dayToProcess = addDays(nextWeekStart, i);
        const dayKey = format(dayToProcess, 'eeee').toLowerCase() as keyof typeof employee.weeklySchedule;
        
        const schedule = employee.weeklySchedule[dayKey];

        if (schedule && schedule.enabled && schedule.start && schedule.end) {
          try {
            const timeIn = parse(schedule.start, 'hh:mm a', dayToProcess);
            const timeOut = parse(schedule.end, 'hh:mm a', dayToProcess);

            if (!isNaN(timeIn.getTime()) && !isNaN(timeOut.getTime()) && isAfter(timeOut, timeIn)) {
              // Check if an entry for this day already exists to prevent duplicates
              const timeEntriesRef = collection(db, 'users', userId, 'employees', empDoc.id, 'timeEntries');
              const existingEntryQuery = query(timeEntriesRef, where('timeIn', '>=', startOfDay(dayToProcess)), where('timeIn', '<=', endOfDay(dayToProcess)));
              const existingEntrySnapshot = await getDocs(existingEntryQuery);

              if (existingEntrySnapshot.empty) {
                const newEntryRef = doc(collection(db, 'users', userId, 'employees', empDoc.id, 'timeEntries'));
                batch.set(newEntryRef, {
                  employeeId: empDoc.id,
                  employeeName: employee.firstName,
                  timeIn: Timestamp.fromDate(timeIn),
                  timeOut: Timestamp.fromDate(timeOut),
                });
                entriesCreated++;
              }
            }
          } catch(e) {
             console.error(`Could not parse schedule for ${employee.firstName} on ${dayKey}: '${schedule.start}' to '${schedule.end}'`, e);
          }
        }
      }
    }

    await batch.commit();

    return {
      success: true,
      message: `Successfully created ${entriesCreated} time entries for the upcoming week.`,
      entriesCreated,
    };
  } catch (error) {
    console.error('Error in autoEnrollmentFlow:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Flow failed: ${errorMessage}`, entriesCreated: 0 };
  }
}
