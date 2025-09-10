
import { addDays, differenceInDays, getYear, isAfter, isBefore, isSameDay, nextThursday, startOfDay, startOfYear } from 'date-fns';

export interface PayPeriod {
    start: Date;
    end: Date;
    payDate: Date;
}

/**
 * Calculates the current bi-weekly pay period based on a given date.
 * The "current" period is the one whose pay date has not yet passed.
 *
 * @param date The date to calculate the pay period for.
 * @returns An object with the start date, end date, and pay date of the period.
 */
export function getCurrentPayPeriod(date: Date): PayPeriod {
    const today = startOfDay(date);
    const year = getYear(today);
    
    // Get all pay periods for the current year and the next to handle year-end transitions
    const allPeriods = [...getYearlyPayPeriods(year), ...getYearlyPayPeriods(year + 1)];

    // Find the first period where the pay date is on or after today
    const currentPeriod = allPeriods.find(period => isAfter(period.payDate, today) || period.payDate.getTime() === today.getTime());

    if (currentPeriod) {
        return currentPeriod;
    }
    
    // Fallback logic in case something goes wrong (should be rare)
    // This calculates from a fixed anchor point
    const anchorDate = new Date('2025-08-24T00:00:00');
    const daysDifference = differenceInDays(today, anchorDate);
    const cycles = Math.floor(daysDifference / 14);
    let periodStart = addDays(anchorDate, cycles * 14);
    let periodEnd = addDays(periodStart, 13);
    let payDate = nextThursday(periodEnd);

    if (isBefore(payDate, today)) {
        periodStart = addDays(periodStart, 14);
        periodEnd = addDays(periodStart, 13);
        payDate = nextThursday(periodEnd);
    }
    
    return {
        start: periodStart,
        end: periodEnd,
        payDate: payDate,
    };
}


/**
 * Generates all bi-weekly pay periods for a given year.
 * @param year The year to generate pay periods for.
 * @returns An array of PayPeriod objects for the entire year.
 */
export function getYearlyPayPeriods(year: number): PayPeriod[] {
    // A fixed anchor date for a known pay period start (Sunday, August 24, 2025)
    const anchorDate = new Date('2025-08-24T00:00:00');
    const periods: PayPeriod[] = [];
    
    // Find the first Sunday of a pay period for the given year or earlier
    const yearStartDate = startOfYear(new Date(year, 0, 1));
    const daysSinceAnchor = differenceInDays(yearStartDate, anchorDate);
    const cyclesSinceAnchor = Math.floor(daysSinceAnchor / 14);
    let currentPeriodStart = addDays(anchorDate, cyclesSinceAnchor * 14);

    // Loop until we are past the given year
    while (getYear(currentPeriodStart) <= year) {
        const periodEnd = addDays(currentPeriodStart, 13);
        const payDate = nextThursday(periodEnd);

        // Only add the period if its start date is within the target year
        if (getYear(currentPeriodStart) === year) {
             periods.push({
                start: currentPeriodStart,
                end: periodEnd,
                payDate,
            });
        }
       
        // Move to the start of the next 14-day period
        currentPeriodStart = addDays(currentPeriodStart, 14);
    }

    return periods;
}

/**
 * Finds the pay date for a given pay period start date.
 * @param periodStartDate The start date of the pay period.
 * @returns The pay date, or null if not found.
 */
export function getPayDateForPeriod(periodStartDate: Date): Date | null {
    const year = getYear(periodStartDate);
    const periods = getYearlyPayPeriods(year);
    const period = periods.find(p => isSameDay(p.start, periodStartDate));
    return period ? period.payDate : null;
}
