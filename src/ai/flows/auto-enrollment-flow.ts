'use server';
/**
 * @fileOverview A server action for automatically creating time entries based on employee schedules.
 *
 * - runAutoEnrollment - A function that handles the time entry creation process.
 */
import { collection, getDocs, query, where, writeBatch, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parse, eachDayOfInterval, isAfter, startOfDay, endOfDay } from 'date-fns';

interface AutoEnrollmentOutput {
  success: boolean;
  message: string;
  entriesCreated: number;
}

interface RunAutoEnrollmentParams {
  userId: string;
  startDate: Date;
  endDate: Date;
}

export async function runAutoEnrollment({ userId, startDate, endDate }: RunAutoEnrollmentParams): Promise<AutoEnrollmentOutput> {
  try {
    const batch = writeBatch(db);
    let entriesCreated = 0;

    const employeesRef = collection(db, 'users', userId, 'employees');
    const q = query(employeesRef, where('autoEnrollmentEnabled', '==', true));
    const employeeSnapshot = await getDocs(q);

    if (employeeSnapshot.empty) {
      return { success: true, message: 'No employees are enabled for auto-enrollment.', entriesCreated: 0 };
    }
    
    const periodDays = eachDayOfInterval({ start: startDate, end: endDate });

    for (const empDoc of employeeSnapshot.docs) {
      const employee = empDoc.data();
      if (!employee.weeklySchedule) continue;

      for (const dayToProcess of periodDays) {
        const dayKey = format(dayToProcess, 'eeee').toLowerCase() as keyof typeof employee.weeklySchedule;
        
        const schedule = employee.weeklySchedule[dayKey];

        if (schedule && schedule.enabled && schedule.start && schedule.end) {
          try {
            const timeIn = parse(schedule.start, 'hh:mm a', dayToProcess);
            const timeOut = parse(schedule.end, 'hh:mm a', dayToProcess);

            if (!isNaN(timeIn.getTime()) && !isNaN(timeOut.getTime()) && isAfter(timeOut, timeIn)) {
              // Check if an entry for this day already exists to prevent duplicates
              const timeEntriesRef = collection(db, 'users', userId, 'employees', empDoc.id, 'timeEntries');
              const dayStart = startOfDay(dayToProcess);
              const dayEnd = endOfDay(dayToProcess);
              const existingEntryQuery = query(timeEntriesRef, where('timeIn', '>=', dayStart), where('timeIn', '<=', dayEnd));
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
    
    if (entriesCreated > 0) {
      await batch.commit();
    }

    return {
      success: true,
      message: `Successfully created ${entriesCreated} time entries.`,
      entriesCreated,
    };
  } catch (error) {
    console.error('Error in autoEnrollmentFlow:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Flow failed: ${errorMessage}`, entriesCreated: 0 };
  }
}
