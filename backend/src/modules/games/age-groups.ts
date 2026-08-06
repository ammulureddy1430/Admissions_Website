export const GAME_AGE_GROUPS = [
  '3–4 Years', '4–5 Years', '5–7 Years', '7–9 Years',
  '9–11 Years', '11–13 Years', '13–16 Years',
] as const;

export type GameAgeGroup = (typeof GAME_AGE_GROUPS)[number];

const LEGACY_GRADE_TO_AGE_GROUP: Record<string, GameAgeGroup> = {
  nursery: '3–4 Years', 'pre-nursery': '3–4 Years', preschool: '3–4 Years',
  lkg: '4–5 Years', kindergarten: '4–5 Years', ukg: '5–7 Years',
  'grade 1': '5–7 Years', 'class 1': '5–7 Years',
  'grade 2': '7–9 Years', 'class 2': '7–9 Years', 'grade 3': '7–9 Years', 'class 3': '7–9 Years',
  'grade 4': '9–11 Years', 'class 4': '9–11 Years', 'grade 5': '9–11 Years', 'class 5': '9–11 Years',
  'grade 6': '11–13 Years', 'class 6': '11–13 Years', 'grade 7': '11–13 Years', 'class 7': '11–13 Years',
  'grade 8': '13–16 Years', 'class 8': '13–16 Years', 'grade 9': '13–16 Years', 'class 9': '13–16 Years',
  'grade 10': '13–16 Years', 'class 10': '13–16 Years',
};

export function normalizeGameAgeGroup(value?: string | null): GameAgeGroup | null {
  if (!value) return null;
  const exact = GAME_AGE_GROUPS.find((group) => group === value.trim());
  return exact || LEGACY_GRADE_TO_AGE_GROUP[value.trim().toLowerCase()] || null;
}

export function birthDateMatchesAgeGroup(dateOfBirth: Date, ageGroup: string, now = new Date()) {
  const normalized = normalizeGameAgeGroup(ageGroup);
  if (!normalized) return false;
  const [minimum, maximum] = normalized.match(/\d+/g)!.map(Number);
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthdayPassed = now.getUTCMonth() > dateOfBirth.getUTCMonth()
    || (now.getUTCMonth() === dateOfBirth.getUTCMonth() && now.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age >= minimum && age < maximum;
}

export function legacyGradesForAgeGroup(ageGroup: string) {
  const normalized = normalizeGameAgeGroup(ageGroup);
  return Object.entries(LEGACY_GRADE_TO_AGE_GROUP)
    .filter(([, group]) => group === normalized)
    .map(([grade]) => grade);
}
