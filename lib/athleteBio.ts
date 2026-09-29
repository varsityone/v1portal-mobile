// lib/athleteBio.ts
// The bio V1Portal writes for an athlete from their profile data, shown
// until they edit it themselves (athletes.bio_auto). Copy of v1portal's
// lib/athleteBio.js; keep the two in sync.
//
//   WR / S | Class of 2027
//   Long Beach Poly | Long Beach, CA
//   6'1", 187 lbs | 4.79 40 | 3.75 GPA
//   Intended major: Engineering

const NO_ANSWER = /^(undecided|skip|n\/?a|none|not sure|-)$/i;

function clean(value: unknown): string {
  if (value == null) return '';
  const text = String(value).replace(/[’‘]/g, "'").replace(/[”“]/g, '"').trim();
  return NO_ANSWER.test(text) ? '' : text;
}

// Heights come in typed every way (5'8, 5’8”, 5,10, 6-1, 5 10, 70); show 5'10".
function height(value: unknown): string {
  const text = clean(value);
  const feetInches = text.match(/^(\d)\s*(?:'|ft|feet|,|-|\s)\s*(\d{1,2})(?:\.\d+)?\s*(?:"|''|in|inches)?$/i);
  if (feetInches && Number(feetInches[2]) < 12) return `${feetInches[1]}'${Number(feetInches[2])}"`;
  const feetOnly = text.match(/^(\d)\s*(?:'|ft|feet)$/i);
  if (feetOnly) return `${feetOnly[1]}'0"`;
  const inches = Number(text);
  if (Number.isInteger(inches) && inches >= 48 && inches <= 90) return `${Math.floor(inches / 12)}'${inches % 12}"`;
  return text;
}

function number(value: unknown): number | null {
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface BioSource {
  position?: string | null; secondary_position?: string | null; graduation_year?: string | number | null;
  high_school?: string | null; city?: string | null; state?: string | null; height?: string | null;
  weight?: string | number | null; forty_yard?: string | number | null; gpa?: string | number | null;
}

export function buildAthleteBio(athlete: BioSource, intendedMajor?: string | null): string {
  const position = clean(athlete.position).toUpperCase();
  const secondary = clean(athlete.secondary_position).toUpperCase();
  const positions = [position, secondary && secondary !== position ? secondary : ''].filter(Boolean).join(' / ');
  const year = clean(athlete.graduation_year);

  const location = [clean(athlete.city), clean(athlete.state)].filter(Boolean).join(', ');

  const heightText = height(athlete.height);
  const weight = number(athlete.weight);
  const size = [heightText, weight ? `${weight} lbs` : ''].filter(Boolean).join(', ');
  const forty = number(athlete.forty_yard);
  const gpa = number(athlete.gpa);

  const major = clean(intendedMajor);

  return [
    [positions, year ? `Class of ${year}` : ''],
    [clean(athlete.high_school), location],
    [size, forty ? `${forty} 40` : '', gpa ? `${Number.isInteger(gpa) ? gpa.toFixed(1) : gpa} GPA` : ''],
    [major ? `Intended major: ${major}` : ''],
  ]
    .map(parts => parts.filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n');
}
