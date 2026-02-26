// ─── Types ───────────────────────────────────────────────────────────────────

export type DayType = 'weekday' | 'sunday' | 'holiday' | 'holidaySunday';

export interface ScheduleRow {
  post_id: number;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
  is_closed: boolean;
  break_start?: string | null;
  break_end?: string | null;
  has_break?: boolean;
}

export interface HourBuckets {
  dayWeekday:        number;
  nightWeekday:      number;
  daySunday:         number;
  nightSunday:       number;
  dayHoliday:        number;
  nightHoliday:      number;
  dayHolidaySunday:  number;
  nightHolidaySunday: number;
  total:             number;
}

export interface PeriodInfo {
  periodDays:  number;
  weeks:       number;
  mondays:     number;
  tuesdays:    number;
  wednesdays:  number;
  thursdays:   number;
  fridays:     number;
  saturdays:   number;
  sundays:     number;
  holidays:    number;
  holidaySundays: number;
}

export interface FTE {
  periodFTE:     number;
  annualizedFTE: number;
}

export interface PostResult {
  post_id:   number;
  post_name: string;
  hours:     HourBuckets;
  fte:       FTE;
}

export interface ComputeResult {
  periodDays:  number;
  periodInfo:  PeriodInfo;
  posts:       PostResult[];
  totals:      HourBuckets;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const DAWN = 6  * 60; // 06:00
const DUSK = 21 * 60; // 21:00
const EOD  = 24 * 60; // 24:00
const FTE_YEAR = 1645;

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function intersect(aS: number, aE: number, bS: number, bE: number): number {
  return Math.max(0, Math.min(aE, bE) - Math.max(aS, bS)) / 60;
}

function emptyBuckets(): HourBuckets {
  return {
    dayWeekday: 0, nightWeekday: 0,
    daySunday: 0,  nightSunday: 0,
    dayHoliday: 0, nightHoliday: 0,
    dayHolidaySunday: 0, nightHolidaySunday: 0,
    total: 0,
  };
}

function addHours(b: HourBuckets, type: DayType, isDay: boolean, h: number) {
  if (h <= 0) return;
  b.total += h;
  if (type === 'holidaySunday') {
    isDay ? (b.dayHolidaySunday  += h) : (b.nightHolidaySunday += h);
  } else if (type === 'holiday') {
    isDay ? (b.dayHoliday        += h) : (b.nightHoliday       += h);
  } else if (type === 'sunday') {
    isDay ? (b.daySunday         += h) : (b.nightSunday        += h);
  } else {
    isDay ? (b.dayWeekday        += h) : (b.nightWeekday       += h);
  }
}

function applySegment(b: HourBuckets, type: DayType, s: number, e: number) {
  addHours(b, type, false, intersect(s, e, 0,    DAWN));
  addHours(b, type, true,  intersect(s, e, DAWN, DUSK));
  addHours(b, type, false, intersect(s, e, DUSK, EOD));
}

function getDayType(date: Date, holidaySet: Set<string>): DayType {
  const iso = date.toISOString().slice(0, 10);
  const isHoliday = holidaySet.has(iso);
  const isSunday  = date.getDay() === 0;
  if (isHoliday && isSunday) return 'holidaySunday';
  if (isHoliday)             return 'holiday';
  if (isSunday)              return 'sunday';
  return 'weekday';
}

/** Soustrait une pause d'un créneau [s, e] → liste de segments restants */
function applyBreak(s: number, e: number, bS: number | null, bE: number | null): [number, number][] {
  if (!bS || !bE || bS >= bE) return [[s, e]];
  const segments: [number, number][] = [];
  if (s < bS) segments.push([s, Math.min(e, bS)]);
  if (e > bE) segments.push([Math.max(s, bE), e]);
  return segments.filter(([a, b]) => b > a);
}

// ─── Calcul infos période ────────────────────────────────────────────────────

function computePeriodInfo(
  start: Date, end: Date, holidaySet: Set<string>
): PeriodInfo {
  const periodDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const info: PeriodInfo = {
    periodDays, weeks: +(periodDays / 7).toFixed(2),
    mondays: 0, tuesdays: 0, wednesdays: 0, thursdays: 0,
    fridays: 0, saturdays: 0, sundays: 0,
    holidays: 0, holidaySundays: 0,
  };

  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    const isHol = holidaySet.has(iso);
    const isSun = day === 0;

    if (isHol && isSun) { info.holidaySundays++; info.holidays++; info.sundays++; }
    else if (isHol)     { info.holidays++; }
    else if (isSun)     { info.sundays++; }

    if (day === 1) info.mondays++;
    else if (day === 2) info.tuesdays++;
    else if (day === 3) info.wednesdays++;
    else if (day === 4) info.thursdays++;
    else if (day === 5) info.fridays++;
    else if (day === 6) info.saturdays++;

    cur.setDate(cur.getDate() + 1);
  }
  return info;
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export function compute(
  posts:     { id: number; name: string }[],
  schedules: ScheduleRow[],
  holidays:  { date: string }[],
  startDate: string,
  endDate:   string,
): ComputeResult {

  const holidaySet = new Set(holidays.map(h => h.date));
  const schedMap: Record<number, Record<string, ScheduleRow>> = {};
  for (const s of schedules) {
    if (!schedMap[s.post_id]) schedMap[s.post_id] = {};
    schedMap[s.post_id][s.day_of_week] = s;
  }

  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');

  const periodInfo = computePeriodInfo(start, end, holidaySet);
  const totals = emptyBuckets();
  const postResults: PostResult[] = [];

  for (const post of posts) {
    const b = emptyBuckets();
    const sched = schedMap[post.id] ?? {};

    const cur = new Date(start);
    while (cur <= end) {
      const dayType = getDayType(cur, holidaySet);

      // Choisir le bon gabarit
      // holidaySunday → essaie 'holidaySunday' d'abord, sinon 'holiday'
      let key: string;
      if (dayType === 'holidaySunday') {
        key = sched['holidaySunday'] ? 'holidaySunday' : 'holiday';
      } else if (dayType === 'sunday') {
        key = 'sunday';
      } else if (dayType === 'holiday') {
        key = 'holiday';
      } else {
        key = DAY_KEYS[cur.getDay()];
      }

      const row = sched[key];

      if (row && !row.is_closed && row.start_time && row.end_time) {
        const s = toMin(row.start_time);
        const e = toMin(row.end_time);

        // Pause
        const bS = row.has_break && row.break_start ? toMin(row.break_start) : null;
        const bE = row.has_break && row.break_end   ? toMin(row.break_end)   : null;

        if (e > s) {
          // Créneau normal
          const segments = applyBreak(s, e, bS, bE);
          for (const [segS, segE] of segments) {
            applySegment(b, dayType, segS, segE);
          }
        } else {
          // Traversée minuit
          const seg1 = applyBreak(s, EOD, bS, bE);
          for (const [segS, segE] of seg1) applySegment(b, dayType, segS, segE);

          const next = new Date(cur);
          next.setDate(next.getDate() + 1);
          const nextType = getDayType(next, holidaySet);
          const seg2 = applyBreak(0, e, bS, bE);
          for (const [segS, segE] of seg2) applySegment(b, nextType, segS, segE);
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    const periodFull = (periodInfo.periodDays / 365) * FTE_YEAR;
    const fte: FTE = {
      periodFTE:     +(b.total / periodFull).toFixed(3),
      annualizedFTE: +((b.total / periodInfo.periodDays) * 365 / FTE_YEAR).toFixed(3),
    };

    for (const k of Object.keys(totals) as (keyof HourBuckets)[]) {
      totals[k] = +(totals[k] + b[k]).toFixed(2);
    }

    postResults.push({ post_id: post.id, post_name: post.name, hours: b, fte });
  }

  return { periodDays: periodInfo.periodDays, periodInfo, posts: postResults, totals };
}