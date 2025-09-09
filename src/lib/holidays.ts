
import { getDay, addDays, setDate, setMonth } from 'date-fns';

export interface Holiday {
  date: Date;
  name: string;
}

// Function to get the Nth day of a month (e.g., 3rd Monday of January)
const getNthDayOfMonth = (year: number, month: number, dayOfWeek: number, n: number): Date => {
    const firstDayOfMonth = new Date(year, month, 1);
    let day = getDay(firstDayOfMonth);
    let diff = dayOfWeek - day;
    if (diff < 0) {
        diff += 7;
    }
    const date = 1 + diff + (n - 1) * 7;
    return setDate(firstDayOfMonth, date);
};

export const getHolidaysForYear = (year: number): Holiday[] => {
  const holidays: Holiday[] = [];

  // New Year's Day
  holidays.push({ date: new Date(year, 0, 1), name: "New Year's Day" });

  // Martin Luther King, Jr.'s Birthday (Third Monday in January)
  holidays.push({ date: getNthDayOfMonth(year, 0, 1, 3), name: "Martin Luther King, Jr.'s Birthday" });

  // Washington's Birthday (Third Monday in February)
  holidays.push({ date: getNthDayOfMonth(year, 1, 1, 3), name: "Washington's Birthday (Presidents' Day)" });

  // Memorial Day (Last Monday in May)
  const lastDayOfMay = new Date(year, 5, 0);
  let lastMondayInMay = lastDayOfMay;
  while (getDay(lastMondayInMay) !== 1) {
      lastMondayInMay = addDays(lastMondayInMay, -1);
  }
  holidays.push({ date: lastMondayInMay, name: 'Memorial Day' });

  // Juneteenth National Independence Day
  holidays.push({ date: new Date(year, 5, 19), name: 'Juneteenth National Independence Day' });
  
  // Independence Day
  holidays.push({ date: new Date(year, 6, 4), name: 'Independence Day' });

  // Labor Day (First Monday in September)
  holidays.push({ date: getNthDayOfMonth(year, 8, 1, 1), name: 'Labor Day' });

  // Columbus Day (Second Monday in October)
  holidays.push({ date: getNthDayOfMonth(year, 9, 1, 2), name: 'Columbus Day' });

  // Veterans Day
  holidays.push({ date: new Date(year, 10, 11), name: 'Veterans Day' });

  // Thanksgiving Day (Fourth Thursday in November)
  holidays.push({ date: getNthDayOfMonth(year, 10, 4, 4), name: 'Thanksgiving Day' });

  // Christmas Day
  holidays.push({ date: new Date(year, 11, 25), name: 'Christmas Day' });

  return holidays;
};
