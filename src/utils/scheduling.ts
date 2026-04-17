import { addDays, isWeekend, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, startOfDay } from 'date-fns';

/**
 * Calculates the default booking date based on the 12:00 PM cutoff.
 * If before 12:00 PM, returns today.
 * If after 12:00 PM (or today is a weekend), returns the next business day.
 */
export const getDefaultBookingDate = (now: Date = new Date()): Date => {
  const cutoff = setHours(setMinutes(setSeconds(setMilliseconds(now, 0), 0), 0), 12);
  
  let targetDate = now;
  
  if (isBefore(cutoff, now) || isWeekend(now)) {
    targetDate = getNextBusinessDay(now);
  }
  
  return startOfDay(targetDate);
};

/**
 * Gets the next business day (skipping Saturday and Sunday).
 */
export const getNextBusinessDay = (date: Date): Date => {
  let nextDay = addDays(date, 1);
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
};

/**
 * Formats a date for the input[type="date"] field.
 */
export const formatDateForInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
