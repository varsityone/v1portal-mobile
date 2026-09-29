// lib/programDeck.ts
// Athlete swipe deck grouping, shared logic with web (see buildProgramDeck).

// Older coach accounts list DB/DE, which /coach/setup no longer offers.
const POSITION_ALIASES: Record<string, string[]> = { DB: ['CB', 'S'], DE: ['DL'] };

export function coachRecruitsPosition(needs: string[] | null | undefined, position: string | null | undefined) {
  if (!position) return false;
  return (needs ?? []).some(n => n === position || (POSITION_ALIASES[n] ?? []).includes(position));
}

interface DeckCardBase { program_id: string; match_available: boolean; position_needs: string[] | null }
export type ProgramDeckCard<T> = T & { group_position: number; group_size: number; hidden_count: number };

// The athlete deck, one program at a time: each program's coaches sit
// together, showing only those recruiting the athlete's position until the
// athlete asks to see the rest (expanded). Programs with a matching coach
// come first. A program with verified coaches but none recruiting the
// position shows all of them, after the matching programs, so it isn't
// dropped. Copy of v1portal's lib/programCards.ts; keep the two in sync.
export function buildProgramDeck<T extends DeckCardBase>(cards: T[], position: string | null | undefined, expanded: ReadonlySet<string>): ProgramDeckCard<T>[] {
  const groups = new Map<string, T[]>();
  for (const card of cards) groups.set(card.program_id, [...(groups.get(card.program_id) ?? []), card]);
  const matched: ProgramDeckCard<T>[][] = [];
  const rest: ProgramDeckCard<T>[][] = [];
  for (const [programId, group] of groups) {
    const coaches = group.filter(c => c.match_available);
    const matching = position ? coaches.filter(c => coachRecruitsPosition(c.position_needs, position)) : coaches;
    const others = coaches.filter(c => !matching.includes(c));
    const visible = !matching.length ? group : expanded.has(programId) ? [...matching, ...others] : matching;
    const hidden = visible === matching ? others.length : 0;
    const tagged = visible.map((c, i) => ({ ...c, group_position: i + 1, group_size: visible.length, hidden_count: hidden }));
    (matching.length ? matched : rest).push(tagged);
  }
  return [...matched, ...rest].flat();
}

// Free athletes get a taste of the first few programs, not the first few coaches.
export function limitToPrograms<T extends { program_id: string }>(deck: T[], limit: number) {
  const allowed = new Set<string>();
  return deck.filter(card => {
    if (allowed.has(card.program_id)) return true;
    if (allowed.size >= limit) return false;
    allowed.add(card.program_id);
    return true;
  });
}
