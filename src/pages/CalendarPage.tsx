import { useState, useEffect, useCallback } from 'react';
import { getSessions, getDietEntries, removeSession, removeDietEntry } from '../services/storage';
import { api } from '../services/api';
import { BODY_PART_COLORS } from '../data/exercises';
import type { WorkoutSession, DietEntry, BodyPart } from '../types';

// ── 데이터 구조 ─────────────────────────────────────────────────────
interface DayData {
  workouts: WorkoutSession[];
  diet: DietEntry[];
}

function buildDateMap(
  sessions: WorkoutSession[],
  dietEntries: DietEntry[],
): Map<string, DayData> {
  const map = new Map<string, DayData>();
  const get = (k: string) => {
    if (!map.has(k)) map.set(k, { workouts: [], diet: [] });
    return map.get(k)!;
  };
  sessions.forEach(s => get(s.date.slice(0, 10)).workouts.push(s));
  dietEntries.forEach(e => get(e.timestamp.slice(0, 10)).diet.push(e));
  return map;
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey(): string {
  const d = new Date();
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── 달력 그리드 계산 ────────────────────────────────────────────────
function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
  const total    = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= total; d++) days.push(d);
  return days;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// ── 날짜 셀 ─────────────────────────────────────────────────────────
function DayCell({
  day, data, selected, isToday,
  onClick,
}: {
  day: number | null;
  year?: number;
  month?: number;
  data?: DayData;
  selected: boolean;
  isToday: boolean;
  onClick: (day: number) => void;
}) {
  if (day === null) return <div className="cal-cell cal-cell-empty" />;

  const hasWorkout = (data?.workouts.length ?? 0) > 0;

  // 운동한 부위들 (최대 3개 점)
  const parts: BodyPart[] = [];
  data?.workouts.forEach(s =>
    s.bodyPartLogs.forEach(l => {
      if (!parts.includes(l.bodyPart)) parts.push(l.bodyPart);
    })
  );

  return (
    <button
      className={`cal-cell${selected ? ' cal-selected' : ''}${isToday ? ' cal-today' : ''}`}
      onClick={() => onClick(day)}
    >
      <span className="cal-day-num">{day}</span>

      {/* 운동 부위 dot들 */}
      {hasWorkout && (
        <div className="cal-dots">
          {parts.slice(0, 3).map(p => (
            <span
              key={p}
              className="cal-dot"
              style={{ background: BODY_PART_COLORS[p].accent }}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// ── 선택된 날 상세 ───────────────────────────────────────────────────
function DayDetail({ data, dateLabel, onDeleted }: {
  data: DayData;
  dateLabel: string;
  onDeleted: () => void;
}) {
  const [confirmWorkout, setConfirmWorkout] = useState<string | null>(null);
  const [confirmDiet, setConfirmDiet]       = useState<string | null>(null);

  const totalCal = data.diet.reduce((s, e) => s + e.calories, 0);
  const totalPro = data.diet.reduce((s, e) => s + e.protein, 0);
  const hasAnything = data.workouts.length > 0 || data.diet.length > 0;

  const handleDeleteWorkout = (sessionId: string) => {
    removeSession(sessionId);
    onDeleted();
  };

  const handleDeleteDiet = (id: string) => {
    removeDietEntry(id);
    api.deleteDiet(id).catch(() => {});
    onDeleted();
  };

  return (
    <div className="day-detail fade-in">
      <p className="day-detail-date">{dateLabel}</p>

      {!hasAnything && <p className="day-detail-empty">기록 없음</p>}

      {/* 운동 */}
      {data.workouts.length > 0 && (
        <div className="day-detail-section">
          <p className="day-detail-section-title">💪 운동</p>
          {data.workouts.map(session =>
            session.bodyPartLogs.map(bpl => {
              const bplVol = bpl.exercises.reduce(
                (s, ex) => s + ex.sets.reduce((s2, set) => s2 + set.weight * set.reps, 0), 0
              );
              return (
                <div key={`${session.id}-${bpl.bodyPart}`} className="day-workout-card">
                  <div className="day-workout-card-header">
                    <span
                      className="part-badge"
                      style={{
                        background: `linear-gradient(135deg, ${BODY_PART_COLORS[bpl.bodyPart].from}, ${BODY_PART_COLORS[bpl.bodyPart].to})`,
                        color: '#000',
                      }}
                    >
                      {bpl.bodyPart}
                    </span>
                    <button className="cal-del-btn" onClick={() => setConfirmWorkout(session.id)}>✕</button>
                  </div>
                  {confirmWorkout === session.id && (
                    <div className="cal-confirm-row">
                      <span>운동 기록을 삭제할까요?</span>
                      <button className="diet-del-confirm" onClick={() => handleDeleteWorkout(session.id)}>삭제</button>
                      <button className="diet-del-cancel" onClick={() => setConfirmWorkout(null)}>취소</button>
                    </div>
                  )}
                  <div className="day-workout-exercises">
                    {bpl.exercises.map(ex => {
                      const vol  = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);
                      const maxW = Math.max(...ex.sets.map(s => s.weight));
                      return (
                        <div key={ex.id} className="day-exercise-row">
                          <span className="day-ex-name">{ex.exercise.name}</span>
                          <span className="day-ex-info">
                            {ex.sets.length}세트 · 최대 {maxW}kg · {vol.toLocaleString()}kg
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="day-workout-total">볼륨 {bplVol.toLocaleString()}kg</p>
                </div>
              );
            })
          )}
        </div>

      )}

      {/* 식단 */}
      {data.diet.length > 0 && (
        <div className="day-detail-section">
          <div className="day-diet-header">
            <p className="day-detail-section-title">🍽️ 식단</p>
            <span className="day-diet-totals">{totalCal.toLocaleString()}kcal · 단백질 {totalPro}g</span>
          </div>
          {data.diet.map(entry => (
            <div key={entry.id} className="day-diet-item">
              <div className="day-diet-row">
                <span className="day-diet-name">{entry.menuName}</span>
                <div className="day-diet-nums">
                  <span className="day-diet-cal">{entry.calories}kcal</span>
                  <span className="day-diet-pro">{entry.protein}g</span>
                  <button className="cal-del-btn" onClick={() => setConfirmDiet(entry.id)}>✕</button>
                </div>
              </div>
              {confirmDiet === entry.id && (
                <div className="cal-confirm-row">
                  <span>식단 기록을 삭제할까요?</span>
                  <button className="diet-del-confirm" onClick={() => handleDeleteDiet(entry.id)}>삭제</button>
                  <button className="diet-del-cancel" onClick={() => setConfirmDiet(null)}>취소</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [selected, setSelected] = useState<number | null>(now.getDate());
  const [dateMap, setDateMap] = useState<Map<string, DayData>>(new Map());

  const reload = useCallback(async () => {
    const localSessions = getSessions();
    const localDiet = getDietEntries();
    setDateMap(buildDateMap(localSessions, localDiet));
    try {
      const [remoteSessions, remoteDiet] = await Promise.all([
        api.getWorkouts(),
        api.getDietHistory()
      ]);
      const mergedSessions = [...localSessions];
      for (const rs of remoteSessions) {
        if (!mergedSessions.find(s => s.id === rs.id)) mergedSessions.push(rs);
      }
      const mergedDietMap = new Map(localDiet.map(e => [e.id, e]));
      for (const rd of remoteDiet) {
        mergedDietMap.set(rd.id, rd); // 원격 우선 덮어쓰기
      }
      const finalMergedDiet = Array.from(mergedDietMap.values());
      setDateMap(buildDateMap(mergedSessions, finalMergedDiet));
    } catch {
      // 서버 오류 시 로컬 데이터 유지
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const days    = getCalendarDays(year, month);
  const tKey    = todayKey();
  const selKey  = selected !== null ? toKey(year, month, selected) : null;
  const selData = selKey ? dateMap.get(selKey) ?? { workouts: [], diet: [] } : null;

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  // 이번 달 통계
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  let monthWorkoutDays = 0;
  let monthVolume = 0;
  let monthProtein = 0;
  dateMap.forEach((data, key) => {
    if (!key.startsWith(monthPrefix)) return;
    if (data.workouts.length) monthWorkoutDays++;
    data.workouts.forEach(s =>
      s.bodyPartLogs.forEach(bpl =>
        bpl.exercises.forEach(ex =>
          ex.sets.forEach(set => { monthVolume += set.weight * set.reps; })
        )
      )
    );
    data.diet.forEach(e => { monthProtein += e.protein; });
  });

  // 날짜 레이블
  const selDateLabel = selKey
    ? new Date(selKey).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  return (
    <div className="page fade-in">
      {/* 월 헤더 */}
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <div className="cal-month-info">
          <h2 className="cal-month-title">{year}년 {MONTH_KO[month]}</h2>
          <div className="cal-month-stats">
            <span>운동 {monthWorkoutDays}일</span>
            <span>볼륨 {monthVolume.toLocaleString()}kg</span>
            <span>단백질 {monthProtein}g</span>
          </div>
        </div>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* 범례 */}
      <div className="cal-legend">
        {['가슴','등','하체','팔','어깨'].map(part => (
          <span key={part} className="cal-legend-item">
            <span className="cal-dot" style={{ background: BODY_PART_COLORS[part as BodyPart].accent }} />
            {part}
          </span>
        ))}
      </div>

      {/* 요일 헤더 */}
      <div className="cal-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className={`cal-weekday${d === '일' ? ' sun' : d === '토' ? ' sat' : ''}`}>
            {d}
          </div>
        ))}

        {/* 날짜 셀 */}
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            year={year}
            month={month}
            data={day !== null ? dateMap.get(toKey(year, month, day)) : undefined}
            selected={day === selected}
            isToday={day !== null && toKey(year, month, day) === tKey}
            onClick={d => setSelected(prev => prev === d ? null : d)}
          />
        ))}
      </div>

      {/* 선택된 날 상세 */}
      {selData && selected !== null && (
        <DayDetail data={selData} dateLabel={selDateLabel} onDeleted={reload} />
      )}
    </div>
  );
}
