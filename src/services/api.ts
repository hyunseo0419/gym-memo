import type { WorkoutSession, WorkoutPayload, DietEntry, CardioSession } from '../types';

const SERVER_URL = import.meta.env.VITE_WORKER_URL || 'https://gym-memo.gym-memo-hyunseo.workers.dev';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
  return res.json();
}

export const api = {
  // ── 운동 ──────────────────────────────────────────────
  sendWorkout(session: WorkoutSession) {
    const payload: WorkoutPayload = { session, deviceInfo: navigator.userAgent };
    return request<{ success: boolean; message: string }>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getWorkouts() {
    return request<WorkoutSession[]>('/api/workouts');
  },

  getStats() {
    return request<WorkoutStats>('/api/stats');
  },

  // ── 식단 ──────────────────────────────────────────────
  /**
   * 메뉴명을 서버로 전송 → 서버가 AI로 칼로리/단백질 계산 후 저장
   * 응답: DietEntry (id, menuName, calories, protein, timestamp 포함)
   */
  analyzeDiet(menuName: string, timestamp?: string): Promise<DietEntry> {
    return request<DietEntry>('/api/diet/analyze', {
      method: 'POST',
      body: JSON.stringify({ menuName, timestamp: timestamp ?? new Date().toISOString() }),
    });
  },

  /**
   * 칼로리/단백질 직접 입력해서 저장 (AI 미사용 수동 입력)
   */
  saveDiet(entry: Omit<DietEntry, 'id'>): Promise<DietEntry> {
    return request<DietEntry>('/api/diet', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  getDietHistory(): Promise<DietEntry[]> {
    return request<DietEntry[]>('/api/diet');
  },

  deleteDiet(id: string): Promise<void> {
    return request<void>(`/api/diet/${id}`, { method: 'DELETE' });
  },

  // ── 유산소 ─────────────────────────────────────────────────────────
  saveCardio(session: CardioSession) {
    return request<{ success: boolean }>('/api/cardio', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  getCardioHistory(): Promise<CardioSession[]> {
    return request<CardioSession[]>('/api/cardio');
  },

  deleteCardio(id: string): Promise<void> {
    return request<void>(`/api/cardio/${id}`, { method: 'DELETE' });
  },
};

export interface WorkoutStats {
  totalSessions: number;
  totalVolume: number;
  bodyPartFrequency: Record<string, number>;
  weeklyVolume: { week: string; volume: number }[];
  personalRecords: { exerciseName: string; weight: number; date: string }[];
  recentSessions: WorkoutSession[];
}
