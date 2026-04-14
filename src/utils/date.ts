/**
 * 새벽 3시 이전이면 전날로 간주하는 날짜 유틸
 */

/** 기준 시각 (이 시간 이전이면 전날로 처리) */
const NIGHT_CUTOFF_HOUR = 3;

/**
 * "실효 날짜" 반환 — 새벽 3시 전이면 하루 뺀 날짜 객체
 */
export function getEffectiveDate(now: Date = new Date()): Date {
  const d = new Date(now);
  if (d.getHours() < NIGHT_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/** 실효 날짜의 toDateString() — isToday 비교에 사용 */
export function getEffectiveDateString(d: Date = new Date()): string {
  return getEffectiveDate(d).toDateString();
}

/**
 * 실효 날짜 기준 ISO 문자열 — 세션 date 필드에 사용
 * (새벽 1시에 운동 시작하면 전날 1시 ISO로 저장됨 → 전날 기록으로 그룹핑)
 */
export function getEffectiveDateISO(): string {
  return getEffectiveDate().toISOString();
}

/** Date → 로컬 YYYY-MM-DD (캘린더·date input용) */
export function toLocalDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 실효 날짜의 로컬 YYYY-MM-DD */
export function getEffectiveDateKey(): string {
  return toLocalDateKey(getEffectiveDate());
}
