import type { WorkoutSession, DietEntry } from '../types';

const KEYS = {
  sessions:    'gym_sessions',
  diet:        'gym_diet',
  proteinGoal: 'gym_protein_goal',
  bodyWeight:  'gym_body_weight',
  manualPR:    'gym_manual_pr',
} as const;

export interface BodyWeightEntry {
  date: string;   // YYYY-MM-DD
  weight: number; // kg
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── 운동 세션 ───────────────────────────────────────────────────────

export function getSessions(): WorkoutSession[] {
  return read<WorkoutSession[]>(KEYS.sessions, []);
}

export function addSession(session: WorkoutSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.push(session);
  write(KEYS.sessions, sessions);
}

export function removeSession(sessionId: string): void {
  write(KEYS.sessions, getSessions().filter(s => s.id !== sessionId));
}

// ── 식단 ───────────────────────────────────────────────────────────

export function getDietEntries(): DietEntry[] {
  return read<DietEntry[]>(KEYS.diet, []);
}

export function addDietEntry(entry: DietEntry): void {
  write(KEYS.diet, [...getDietEntries(), entry]);
}

export function removeDietEntry(id: string): void {
  write(KEYS.diet, getDietEntries().filter(e => e.id !== id));
}

export function getTodayDietEntries(): DietEntry[] {
  const today = new Date().toDateString();
  return getDietEntries().filter(e => new Date(e.timestamp).toDateString() === today);
}

// ── 단백질 목표 ────────────────────────────────────────────────────

export function getProteinGoal(): number {
  return read<number>(KEYS.proteinGoal, 0);
}

export function setProteinGoal(goal: number): void {
  write(KEYS.proteinGoal, goal);
}

// ── 분석 헬퍼 ──────────────────────────────────────────────────────

/** 3대 운동 최고 무게 */
export function getMaxWeight(sessions: WorkoutSession[], exerciseName: string): number {
  let max = 0;
  for (const session of sessions) {
    for (const bpl of session.bodyPartLogs) {
      for (const el of bpl.exercises) {
        if (el.exercise.name === exerciseName) {
          for (const set of el.sets) {
            if (set.weight > max) max = set.weight;
          }
        }
      }
    }
  }
  return max;
}

/** 부위별 마지막 운동 날짜 */
export function getLastTrainedDate(sessions: WorkoutSession[], bodyPart: string): Date | null {
  const relevant = sessions
    .filter(s => s.bodyPartLogs.some(l => l.bodyPart === bodyPart))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return relevant.length ? new Date(relevant[0].date) : null;
}

// ── 3대 중량 수동 PR ────────────────────────────────────────────────

export interface ManualPR {
  bench:    number; // kg, 0 = 미입력
  squat:    number;
  deadlift: number;
}

export function getManualPR(): ManualPR {
  return read<ManualPR>(KEYS.manualPR, { bench: 0, squat: 0, deadlift: 0 });
}

export function saveManualPR(pr: ManualPR): void {
  write(KEYS.manualPR, pr);
}

/** 운동 기록 + 수동 입력 중 더 높은 값 반환 */
export function getBigThreeMax(
  sessions: WorkoutSession[],
  exerciseName: string,
  manualValue: number,
): number {
  return Math.max(getMaxWeight(sessions, exerciseName), manualValue);
}

/** 오늘 총 단백질 (g) */
export function getTodayProtein(): number {
  return getTodayDietEntries().reduce((sum, e) => sum + e.protein, 0);
}

/** 오늘 총 칼로리 */
export function getTodayCalories(): number {
  return getTodayDietEntries().reduce((sum, e) => sum + e.calories, 0);
}

// ── 몸무게 ─────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function getBodyWeightHistory(): BodyWeightEntry[] {
  return read<BodyWeightEntry[]>(KEYS.bodyWeight, []);
}

export function getTodayBodyWeight(): number | null {
  const today = todayKey();
  const entry = getBodyWeightHistory().find(e => e.date === today);
  return entry ? entry.weight : null;
}

/** 체중 저장 + 단백질 목표 자동 갱신 (체중 × 2) */
export function saveBodyWeight(weight: number): void {
  const today = todayKey();
  const history = getBodyWeightHistory().filter(e => e.date !== today);
  history.push({ date: today, weight });
  history.sort((a, b) => a.date.localeCompare(b.date));
  write(KEYS.bodyWeight, history.slice(-90));
  // 단백질 목표 자동 계산
  setProteinGoal(Math.round(weight * 2));
}

/** 가장 최근 체중 */
export function getLatestBodyWeight(): number | null {
  const history = getBodyWeightHistory();
  if (!history.length) return null;
  return history[history.length - 1].weight;
}
