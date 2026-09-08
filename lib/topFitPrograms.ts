// Mirrors web's lib/topFitPrograms.js exactly — same fit math, same shape —
// so the athlete dashboard's "Top Fit Programs" shows identical numbers on
// both platforms for the same account.
import { SupabaseClient } from '@supabase/supabase-js';
import { getBandFloorForDivision } from '../constants/RecruitingLevels';
import type { Division } from '../constants/RecruitingLevels';

const DIVISION_KEY_MAP: Record<string, Division> = {
  FBS: 'D1_FBS', FCS: 'D1_FCS', D2: 'D2', D3: 'D3', NAIA: 'NAIA', JUCO: 'NJCAA',
};

export interface ProgramRow {
  id: string;
  name: string;
  division: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  min_gpa: number | null;
  min_sat: number | null;
  typical_sat: number | null;
  typical_act: number | null;
}

export interface TopFitProgram {
  id: string;
  name: string;
  division: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  fitPct: number;
  tag: 'High' | 'Medium';
}

export function computeFitPct(
  athleteScore: number | null,
  athleteGpa: number | null,
  athleteSat: number | null,
  athleteAct: number | null,
  program: ProgramRow
): number | null {
  if (athleteScore == null) return null;
  const divisionKey: Division = program.division ? (DIVISION_KEY_MAP[program.division] ?? 'D2') : 'D2';
  const minScore = getBandFloorForDivision(divisionKey) ?? 50;
  const diff = athleteScore - minScore;
  const divisionFit = diff >= 0
    ? Math.max(70, 100 - diff * 0.8)
    : Math.max(10, 100 + diff * 8);

  let academicFit: number | null = null;
  if (program.typical_sat != null && athleteSat != null) {
    academicFit = athleteSat >= program.typical_sat ? 100 : Math.max(35, 100 - (program.typical_sat - athleteSat) / 4);
  } else if (program.typical_act != null && athleteAct != null) {
    academicFit = athleteAct >= program.typical_act ? 100 : Math.max(35, 100 - (program.typical_act - athleteAct) * 6);
  } else if (program.min_gpa != null && athleteGpa != null) {
    academicFit = athleteGpa >= program.min_gpa ? 100 : Math.max(40, 100 - (program.min_gpa - athleteGpa) * 40);
  } else if (program.min_sat != null && athleteSat != null) {
    academicFit = athleteSat >= program.min_sat ? 100 : Math.max(40, 100 - (program.min_sat - athleteSat) / 10);
  }

  const fit = academicFit != null ? (divisionFit * 0.65 + academicFit * 0.35) : divisionFit;
  return Math.round(Math.min(99, Math.max(10, fit)));
}

export async function getTopFitPrograms(
  supabaseClient: SupabaseClient,
  athleteScore: number | null,
  athleteGpa: number | null,
  athleteSat: number | null,
  athleteAct: number | null,
  limit = 5
): Promise<TopFitProgram[]> {
  if (athleteScore == null) return [];
  const { data: programs } = await supabaseClient
    .from('programs')
    .select('id, name, division, city, state, logo_url, min_gpa, min_sat, typical_sat, typical_act');
  if (!programs) return [];

  return (programs as ProgramRow[])
    .map(p => ({
      id: p.id,
      name: p.name,
      division: p.division,
      city: p.city,
      state: p.state,
      logoUrl: p.logo_url,
      fitPct: computeFitPct(athleteScore, athleteGpa, athleteSat, athleteAct, p),
    }))
    .filter((p): p is Omit<TopFitProgram, 'tag'> => p.fitPct != null)
    .sort((a, b) => b.fitPct - a.fitPct)
    .slice(0, limit)
    .map(p => ({ ...p, tag: (p.fitPct >= 85 ? 'High' : 'Medium') as 'High' | 'Medium' }));
}
