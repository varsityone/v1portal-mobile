// True when the athlete hasn't registered a real NCAA Eligibility ID yet —
// either the field is empty, or they've only entered the placeholder value
// ("Not Yet") that the Phase 2 form's hint tells them to type while they
// wait to register. Kept separate from the general profile-completeness
// checks elsewhere, which treat "Not Yet" as a valid filled answer. Used to
// remind athletes before real coach conversations start (mutual match,
// messages) — not part of the general completeness score.
export function needsNcaaRegistration(athlete: { ncaa_id?: string | null } | null | undefined): boolean {
  const id = athlete?.ncaa_id;
  if (!id) return true;
  return String(id).trim().toLowerCase() === 'not yet';
}
