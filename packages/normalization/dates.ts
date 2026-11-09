// Month-precision date normalization (LLD §9.2, §10.2). Never invents precision:
// a bare year is PARTIAL and stays out of verified duration totals.

export type DatePrecision = "MONTH" | "YEAR" | "PRESENT" | "INVALID" | "MISSING";
export interface NormalizedDate { value: string | null; precision: DatePrecision }

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export function normalizeDate(raw: string | null | undefined): NormalizedDate {
  if (raw == null || raw.trim() === "") return { value: null, precision: "MISSING" };
  const s = raw.trim().toLowerCase().replace(/[’']/g, "");
  if (/^(present|current|now|till date|to date|ongoing)$/.test(s)) return { value: null, precision: "PRESENT" };

  let m = s.match(/^(\d{4})-(\d{1,2})$/); // 2023-06
  if (m) return month(Number(m[1]), Number(m[2]));
  m = s.match(/^(\d{1,2})[/.-](\d{4})$/); // 06/2023
  if (m) return month(Number(m[2]), Number(m[1]));
  m = s.match(/^([a-z]{3,9})\.?,?\s*(\d{4}|\d{2})$/); // June 2023, Jun 23
  if (m) {
    const mo = MONTHS[m[1]!.slice(0, m[1] === "sept" ? 4 : 3)];
    const yr = m[2]!.length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    return mo ? month(yr, mo) : { value: null, precision: "INVALID" };
  }
  m = s.match(/^(\d{4})$/);
  if (m) return { value: m[1]!, precision: "YEAR" };
  return { value: null, precision: "INVALID" };
}

function month(year: number, mo: number): NormalizedDate {
  if (!Number.isInteger(year) || year < 1950 || year > 2100 || mo < 1 || mo > 12) {
    return { value: null, precision: "INVALID" };
  }
  return { value: `${year}-${String(mo).padStart(2, "0")}`, precision: "MONTH" };
}

export function toMonthIndex(value: string): number {
  const [year, mo] = value.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(mo) || mo! < 1 || mo! > 12) {
    throw new Error(`Invalid year-month: ${value}`);
  }
  return year! * 12 + (mo! - 1);
}

export const formatMonths = (months: number): string => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
};
