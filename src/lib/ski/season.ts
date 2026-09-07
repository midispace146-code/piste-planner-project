import liftsIndex from "@/data/impianti-index.json";
import { normalizeName } from "./catalog";
import type { Resort } from "./types";

/**
 * Stagionalità dei comprensori.
 *
 * Fuori stagione non mostriamo dati incoerenti (piste aperte, neve, code):
 * la UI espone un badge di chiusura con il mese di riapertura previsto.
 * Fanno eccezione i comprensori glaciali attivi nel database (impianti in
 * quota sopra i 3.000 m ancora in esercizio), come Stelvio e Plateau Rosà.
 */

interface RawLift {
  name: string | null;
  active: boolean | null;
  resort: string | null;
  resortName: string | null;
  topEle: number | null;
}

const slugOf = (name: string) => normalizeName(name).replace(/\s+/g, "-");

/** Quota massima degli impianti ATTIVI per comprensorio (dal database impianti). */
const MAX_ACTIVE_TOP = new Map<string, number>();

for (const raw of liftsIndex as unknown as RawLift[]) {
  if (raw.active === false) continue;
  const ele = typeof raw.topEle === "number" ? raw.topEle : 0;
  const keys = [raw.resort, raw.resortName ? slugOf(raw.resortName) : null].filter(
    (k): k is string => Boolean(k),
  );
  for (const key of keys) {
    if (ele > (MAX_ACTIVE_TOP.get(key) ?? 0)) MAX_ACTIVE_TOP.set(key, ele);
  }
}


/** Quota massima raggiunta dagli impianti attivi del comprensorio. */
export function maxActiveTopElevation(resort: Resort): number {
  return MAX_ACTIVE_TOP.get(resort.id) ?? MAX_ACTIVE_TOP.get(slugOf(resort.name)) ?? 0;
}

/** Comprensorio glaciale: impianti attivi oltre i 3.000 m nel database. */
export function isGlacierResort(resort: Resort): boolean {
  return maxActiveTopElevation(resort) >= 3000;
}

const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

export interface SeasonStatus {
  /** Il comprensorio è nel periodo di apertura. */
  open: boolean;
  glacier: boolean;
  /** Mese di riapertura previsto (solo se chiuso). */
  reopeningMonth: string;
  /** Testo pronto per il badge. */
  badge: string;
  /** Descrizione estesa. */
  message: string;
}

/** Giorno dell'anno "assoluto" per confronti fra finestre stagionali. */
function dayIndex(month: number, day: number): number {
  return month * 100 + day;
}

/**
 * Calendario di apertura: finestra invernale più ampia per l'alta quota,
 * apertura continuativa per i ghiacciai attivi.
 */
export function resortSeason(resort: Resort, date: Date = new Date()): SeasonStatus {
  const glacier = isGlacierResort(resort);
  if (glacier) {
    return {
      open: true,
      glacier: true,
      reopeningMonth: "",
      badge: "Ghiacciaio in attività",
      message: "Sci su ghiacciaio: impianti in quota attivi anche fuori dalla stagione invernale.",
    };
  }

  const top = Math.max(maxActiveTopElevation(resort), resort.altitude);
  const highAltitude = top >= 2600;

  // Finestre indicative: 20 nov – 1 mag in alta quota, 1 dic – 15 apr altrove.
  const start = highAltitude ? dayIndex(10, 20) : dayIndex(11, 1);
  const end = highAltitude ? dayIndex(4, 1) : dayIndex(3, 15);
  const today = dayIndex(date.getMonth(), date.getDate());

  const open = today >= start || today <= end;
  const reopeningMonth = MONTHS[Math.floor(start / 100)] ?? "Dicembre";

  if (open) {
    return {
      open: true,
      glacier: false,
      reopeningMonth: "",
      badge: "Stagione in corso",
      message: "Comprensorio nel periodo di apertura invernale.",
    };
  }

  return {
    open: false,
    glacier: false,
    reopeningMonth,
    badge: "Chiuso per pausa stagionale",
    message: `Comprensorio chiuso per pausa stagionale - Apertura prevista a ${reopeningMonth}`,
  };
}
