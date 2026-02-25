// ─── Types ───────────────────────────────────────────────────────────────────

export type DayType = 'weekday' | 'sunday' | 'holiday';

export interface ScheduleRow {
  post_id: number;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
  is_closed: boolean;
}

export interface HourBuckets {
  dayWeekday:   number;
  nightWeekday: number;
  daySunday:    number;
  nightSunday:  number;
  dayHoliday:   number;
  nightHoliday: number;
  total:        number;
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

  periodDays: number;
  posts:      PostResult[];
  totals:     HourBuckets;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const DAWN = 6  * 60; // 06:00 = 360 min
const DUSK = 21 * 60; // 21:00 = 1260 min
const EOD  = 24 * 60; // 24:00 = 1440 min
const FTE_YEAR = 1645;

const DAY_KEYS = [
  'sunday','monday','tuesday','wednesday','thursday','friday','saturday'
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function intersect(aS: number, aE: number, bS: number, bE: number): number {
  return Math.max(0, Math.min(aE, bE) - Math.max(aS, bS)) / 60; // en heures
}

function emptyBuckets(): HourBuckets {
  return {
    dayWeekday: 0, nightWeekday: 0,
    daySunday:  0, nightSunday:  0,
    dayHoliday: 0, nightHoliday: 0,
    total: 0,
  };
}

function addHours(b: HourBuckets, type: DayType, isDay: boolean, h: number) {
  if (h <= 0) return;
  b.total += h;
  if (type === 'holiday') {
    isDay ? (b.dayHoliday   += h) : (b.nightHoliday += h);
  } else if (type === 'sunday') {
    isDay ? (b.daySunday    += h) : (b.nightSunday  += h);
  } else {
    isDay ? (b.dayWeekday   += h) : (b.nightWeekday += h);
  }
}

/** Découpe un créneau [s, e] (en minutes) en buckets jour/nuit */
function applySegment(b: HourBuckets, type: DayType, s: number, e: number) {
  addHours(b, type, false, intersect(s, e, 0,    DAWN)); // nuit avant 06:00
  addHours(b, type, true,  intersect(s, e, DAWN, DUSK)); // jour  06:00–21:00
  addHours(b, type, false, intersect(s, e, DUSK, EOD));  // nuit après 21:00
}

function getDayType(date: Date, holidaySet: Set<string>): DayType {
  const iso = date.toISOString().slice(0, 10);
  if (holidaySet.has(iso)) return 'holiday';
  if (date.getDay() === 0)  return 'sunday';
  return 'weekday';
}

// ─── Fonction principale ──────────────────────────────────────────────────────

/**
 * Calcule les heures par poste sur une période donnée.
 *
 * @param posts     Liste des postes { id, name }
 * @param schedules Gabarits horaires (toutes les lignes de la table schedules)
 * @param holidays  Jours fériés { date: 'YYYY-MM-DD' }
 * @param startDate 'YYYY-MM-DD'
 * @param endDate   'YYYY-MM-DD'
 */
export function compute(
  posts:     { id: number; name: string }[],
  schedules: ScheduleRow[],
  holidays:  { date: string }[],
  startDate: string,
  endDate:   string,
): ComputeResult {

  const holidaySet = new Set(holidays.map(h => h.date));

  // Index des gabarits : schedMap[post_id][day_of_week] = ScheduleRow
  const schedMap: Record<number, Record<string, ScheduleRow>> = {};
  for (const s of schedules) {
    if (!schedMap[s.post_id]) schedMap[s.post_id] = {};
    schedMap[s.post_id][s.day_of_week] = s;
  }

  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');
  const periodDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const totals = emptyBuckets();
  const postResults: PostResult[] = [];

  for (const post of posts) {
    const b = emptyBuckets();
    const sched = schedMap[post.id] ?? {};

    const cur = new Date(start);
    while (cur <= end) {
      const dayType = getDayType(cur, holidaySet);
      const key = dayType === 'holiday' ? 'holiday'
                : dayType === 'sunday'  ? 'sunday'
                : DAY_KEYS[cur.getDay()];

      const row = sched[key];

      if (row && !row.is_closed && row.start_time && row.end_time) {
        const s = toMin(row.start_time);
        const e = toMin(row.end_time);

        if (e > s) {
          // Créneau normal (même journée)
          applySegment(b, dayType, s, e);
        } else {
          // Créneau traversant minuit → split en deux parties
          applySegment(b, dayType, s, EOD); // partie du jour courant

          const next = new Date(cur);
          next.setDate(next.getDate() + 1);
          const nextType = getDayType(next, holidaySet);
          applySegment(b, nextType, 0, e); // partie du jour suivant
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    // Calcul ETP
    const periodFull = (periodDays / 365) * FTE_YEAR;
    const fte: FTE = {
      periodFTE:     +(b.total / periodFull).toFixed(3),
      annualizedFTE: +((b.total / periodDays) * 365 / FTE_YEAR).toFixed(3),
    };

    // Accumulation globale
    for (const k of Object.keys(totals) as (keyof HourBuckets)[]) {
      totals[k] = +(totals[k] + b[k]).toFixed(2);
    }

    postResults.push({ post_id: post.id, post_name: post.name, hours: b, fte });
  }

  return { periodDays, posts: postResults, totals };
}