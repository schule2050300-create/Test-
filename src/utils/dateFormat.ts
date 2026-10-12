import { DateFormat, DateWeekdayFormat } from '../types';

export interface DateFormatOption {
  id: DateFormat;
  germanLabel: string;
  internationalLabel: string;
  description: string;
  exampleGerman: string;
  exampleUS: string;
}

export const DATE_FORMAT_PRESETS: DateFormatOption[] = [
  {
    id: 'DD.MM.YYYY',
    germanLabel: 'TT.MM.JJJJ',
    internationalLabel: 'DD.MM.YYYY',
    description: 'Deutscher Standard (Tag.Monat.Jahr)',
    exampleGerman: '12.10.2026',
    exampleUS: '12.10.2026',
  },
  {
    id: 'MM/DD/YYYY',
    germanLabel: 'MM/TT/JJJJ',
    internationalLabel: 'MM/DD/YYYY',
    description: 'US / Internationales Format (Monat/Tag/Jahr)',
    exampleGerman: '10/12/2026',
    exampleUS: '10/12/2026',
  },
  {
    id: 'YYYY-MM-DD',
    germanLabel: 'JJJJ-MM-TT',
    internationalLabel: 'YYYY-MM-DD',
    description: 'ISO 8601 Norm (Jahr-Monat-Tag)',
    exampleGerman: '2026-10-12',
    exampleUS: '2026-10-12',
  },
  {
    id: 'D. MMMM YYYY',
    germanLabel: 'T. MMMM JJJJ',
    internationalLabel: 'D. MMMM YYYY',
    description: 'Ausgeschriebener Monatsname',
    exampleGerman: '12. Oktober 2026',
    exampleUS: 'October 12, 2026',
  },
  {
    id: 'D. MMM YYYY',
    germanLabel: 'T. MMM JJJJ',
    internationalLabel: 'D. MMM YYYY',
    description: 'Abgekürzter Monatsname',
    exampleGerman: '12. Okt. 2026',
    exampleUS: 'Oct 12, 2026',
  },
  {
    id: 'DD.MM.YY',
    germanLabel: 'TT.MM.JJ',
    internationalLabel: 'DD.MM.YY',
    description: 'Kompakt mit 2-stelligem Jahr',
    exampleGerman: '12.10.26',
    exampleUS: '12.10.26',
  },
  {
    id: 'custom',
    germanLabel: 'Eigenes Format',
    internationalLabel: 'Custom Format',
    description: 'Frei konfigurierbares Muster mit Platzhaltern',
    exampleGerman: 'z.B. WWWW, TT.MM.JJJJ',
    exampleUS: 'e.g. WWWW, MM/DD/YYYY',
  },
];

export interface FormatDateOptions {
  date?: Date;
  dateFormat?: DateFormat | string;
  weekdayFormat?: DateWeekdayFormat;
  showDayOfWeek?: boolean;
  customPattern?: string;
  locale?: string;
  timeZone?: string;
}

/**
 * Formats a given Date instance into a user-configured date string,
 * supporting standard presets (TT.MM.JJJJ, MM/TT/JJJJ, JJJJ-MM-TT etc.),
 * full/abbreviated weekdays, and custom placeholder patterns.
 */
export function formatClockDate({
  date = new Date(),
  dateFormat = 'DD.MM.YYYY',
  weekdayFormat,
  showDayOfWeek = true,
  customPattern,
  locale = 'de-DE',
  timeZone = 'Europe/Berlin',
}: FormatDateOptions): string {
  const targetTz = !timeZone || timeZone === 'auto' ? undefined : timeZone;

  // Cached formatters for parts
  const numFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: targetTz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const parts = numFormatter.formatToParts(date);
  const day2 = parts.find((p) => p.type === 'day')?.value || '01';
  const month2 = parts.find((p) => p.type === 'month')?.value || '01';
  const year4 = parts.find((p) => p.type === 'year')?.value || '2026';
  const day1 = String(parseInt(day2, 10));
  const month1 = String(parseInt(month2, 10));
  const year2 = year4.slice(-2);

  const fullMonth = new Intl.DateTimeFormat(locale, { timeZone: targetTz, month: 'long' }).format(date);
  const shortMonth = new Intl.DateTimeFormat(locale, { timeZone: targetTz, month: 'short' }).format(date);
  const fullWeekday = new Intl.DateTimeFormat(locale, { timeZone: targetTz, weekday: 'long' }).format(date);
  const shortWeekday = new Intl.DateTimeFormat(locale, { timeZone: targetTz, weekday: 'short' }).format(date);

  const effectiveWeekday = weekdayFormat ?? (showDayOfWeek ? 'long' : 'none');

  // Handle custom pattern if selected
  if (dateFormat === 'custom' && customPattern && customPattern.trim()) {
    let result = customPattern;
    // Replace tokens in priority order:
    // Weekdays
    result = result.replace(/WWWW/g, fullWeekday);
    result = result.replace(/EEEE/g, fullWeekday);
    result = result.replace(/WW/g, shortWeekday);
    result = result.replace(/EEE/g, shortWeekday);

    // Months
    result = result.replace(/MMMM/g, fullMonth);
    result = result.replace(/MMM/g, shortMonth);
    result = result.replace(/MM/g, month2);
    result = result.replace(/\bM\b/g, month1);

    // Days
    result = result.replace(/TT/g, day2);
    result = result.replace(/DD/g, day2);
    result = result.replace(/\bT\b/g, day1);
    result = result.replace(/\bD\b/g, day1);

    // Years
    result = result.replace(/JJJJ/g, year4);
    result = result.replace(/YYYY/g, year4);
    result = result.replace(/JJ/g, year2);
    result = result.replace(/YY/g, year2);

    return result;
  }

  // Base core date based on format
  let coreDate = `${day2}.${month2}.${year4}`; // TT.MM.JJJJ

  if (dateFormat === 'MM/DD/YYYY') {
    coreDate = `${month2}/${day2}/${year4}`; // MM/TT/JJJJ
  } else if (dateFormat === 'YYYY-MM-DD') {
    coreDate = `${year4}-${month2}-${day2}`; // JJJJ-MM-TT
  } else if (dateFormat === 'DD.MM.YY') {
    coreDate = `${day2}.${month2}.${year2}`; // TT.MM.JJ
  } else if (dateFormat === 'D. MMMM YYYY') {
    if (locale.startsWith('en')) {
      coreDate = `${fullMonth} ${day1}, ${year4}`;
    } else {
      coreDate = `${day1}. ${fullMonth} ${year4}`;
    }
  } else if (dateFormat === 'D. MMM YYYY') {
    if (locale.startsWith('en')) {
      coreDate = `${shortMonth} ${day1}, ${year4}`;
    } else {
      coreDate = `${day1}. ${shortMonth} ${year4}`;
    }
  }

  // Prefix weekday if enabled
  if (effectiveWeekday === 'long') {
    return `${fullWeekday}, ${coreDate}`;
  } else if (effectiveWeekday === 'short') {
    return `${shortWeekday}, ${coreDate}`;
  }

  return coreDate;
}
