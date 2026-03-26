import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
  PieChart, Pie,
} from 'recharts';
import { getSessions, getDietEntries, getProteinGoal } from '../services/storage';
import { api } from '../services/api';
import { BODY_PARTS, BODY_PART_COLORS, CARDIO_COLOR, EXERCISES } from '../data/exercises';
import type { WorkoutSession, DietEntry, BodyPart, CardioSession } from '../types';

// ── 계산 헬퍼 ──────────────────────────────────────────────────────

function monthOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function sessionsOfMonth(sessions: WorkoutSession[], m: string) {
  return sessions.filter(s => s.date.startsWith(m));
}

function countSets(sessions: WorkoutSession[]) {
  return sessions.reduce((sum, s) =>
    sum + s.bodyPartLogs.reduce((s2, bpl) =>
      s2 + bpl.exercises.reduce((s3, ex) => s3 + ex.sets.length, 0), 0), 0);
}

function countUniqueDays(sessions: WorkoutSession[]) {
  return new Set(sessions.map(s => s.date.slice(0, 10))).size;
}

/** 부위별 훈련 날짜 수 (중복 제거) */
function bodyPartDayCounts(sessions: WorkoutSession[]) {
  return BODY_PARTS.map(part => {
    const days = new Set(
      sessions
        .filter(s => s.bodyPartLogs.some(b => b.bodyPart === part))
        .map(s => s.date.slice(0, 10))
    ).size;
    return { part, days };
  }).filter(d => d.days > 0);
}

/** 부위별 세트 수 */
function bodyPartSetCounts(sessions: WorkoutSession[]) {
  return BODY_PARTS.map(part => ({
    part,
    sets: sessions.reduce((sum, s) =>
      sum + s.bodyPartLogs
        .filter(bpl => bpl.bodyPart === part)
        .reduce((s2, bpl) =>
          s2 + bpl.exercises.reduce((s3, ex) => s3 + ex.sets.length, 0), 0), 0),
  })).filter(d => d.sets > 0);
}

/** 최근 6개월 월별 총 볼륨 */
function monthlyVolume(sessions: WorkoutSession[]) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = monthOf(d);
    const vol = sessionsOfMonth(sessions, key).reduce((sum, s) =>
      sum + s.bodyPartLogs.reduce((s2, bpl) =>
        s2 + bpl.exercises.reduce((s3, ex) =>
          s3 + ex.sets.reduce((s4, set) => s4 + set.weight * set.reps, 0), 0), 0), 0);
    return { label: `${d.getMonth() + 1}월`, vol };
  });
}

/** 이번 달 운동별 세트 수 TOP 5 */
function top5Exercises(sessions: WorkoutSession[], month: string) {
  const map = new Map<string, { sets: number; bodyPart: BodyPart }>();
  sessionsOfMonth(sessions, month).forEach(s =>
    s.bodyPartLogs.forEach(bpl =>
      bpl.exercises.forEach(ex => {
        const prev = map.get(ex.exercise.name) ?? { sets: 0, bodyPart: bpl.bodyPart };
        map.set(ex.exercise.name, { sets: prev.sets + ex.sets.length, bodyPart: bpl.bodyPart });
      })
    )
  );
  return [...map.entries()]
    .sort((a, b) => b[1].sets - a[1].sets)
    .slice(0, 5)
    .map(([name, { sets, bodyPart }]) => ({ name, sets, bodyPart }));
}

/** 지난달 대비 최고 중량 오른 운동 */
function improvedExercises(sessions: WorkoutSession[], thisMonth: string, lastMonth: string) {
  // 운동별 최고 중량 추출
  const maxWeightByMonth = (month: string) => {
    const map = new Map<string, { weight: number; bodyPart: BodyPart }>();
    sessionsOfMonth(sessions, month).forEach(s =>
      s.bodyPartLogs.forEach(bpl =>
        bpl.exercises.forEach(ex => {
          const max = Math.max(...ex.sets.map(set => set.weight));
          const prev = map.get(ex.exercise.name);
          if (!prev || max > prev.weight) {
            map.set(ex.exercise.name, { weight: max, bodyPart: bpl.bodyPart });
          }
        })
      )
    );
    return map;
  };

  const thisMap = maxWeightByMonth(thisMonth);
  const lastMap = maxWeightByMonth(lastMonth);

  const improved: { name: string; bodyPart: BodyPart; thisWeight: number; lastWeight: number; diff: number }[] = [];
  thisMap.forEach(({ weight: thisWeight, bodyPart }, name) => {
    const last = lastMap.get(name);
    if (last && thisWeight > last.weight) {
      improved.push({ name, bodyPart, thisWeight, lastWeight: last.weight, diff: thisWeight - last.weight });
    }
  });

  return improved.sort((a, b) => b.diff - a.diff);
}

/** 최근 6개월 월별 유산소 칼로리 */
function monthlyCardio(sessions: CardioSession[]) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = monthOf(d);
    const filtered = sessions.filter(c => c.date.startsWith(key));
    return {
      label:    `${d.getMonth() + 1}월`,
      calories: filtered.reduce((s, c) => s + c.calories, 0),
      minutes:  filtered.reduce((s, c) => s + c.duration, 0),
    };
  });
}

/** 단백질 최근 7일 */
function proteinLast7(entries: DietEntry[], goal: number) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key   = d.toDateString();
    const total = entries
      .filter(e => new Date(e.timestamp).toDateString() === key)
      .reduce((s, e) => s + e.protein, 0);
    return {
      label: i === 6 ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`,
      protein: total,
      pct: goal > 0 ? Math.min(Math.round((total / goal) * 100), 100) : 0,
    };
  });
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────

function SummaryGrid({ thisMonth, lastMonth }: {
  thisMonth: { days: number; sets: number };
  lastMonth: { days: number; sets: number };
}) {
  const diff = (a: number, b: number) => {
    if (b === 0) return null;
    const p = Math.round(((a - b) / b) * 100);
    return { p, up: p >= 0 };
  };
  const daysDiff = diff(thisMonth.days, lastMonth.days);
  const setsDiff = diff(thisMonth.sets, lastMonth.sets);
  return (
    <div className="stat-summary-grid">
      <div className="stat-summary-card">
        <span className="stat-summary-value">{thisMonth.days}<small>일</small></span>
        <span className="stat-summary-label">운동 일수</span>
        {daysDiff && (
          <span className={`stat-diff ${daysDiff.up ? 'up' : 'down'}`}>
            {daysDiff.up ? '▲' : '▼'} {Math.abs(daysDiff.p)}% 지난달 대비
          </span>
        )}
      </div>
      <div className="stat-summary-card">
        <span className="stat-summary-value">{thisMonth.sets}<small>세트</small></span>
        <span className="stat-summary-label">총 세트 수</span>
        {setsDiff && (
          <span className={`stat-diff ${setsDiff.up ? 'up' : 'down'}`}>
            {setsDiff.up ? '▲' : '▼'} {Math.abs(setsDiff.p)}% 지난달 대비
          </span>
        )}
      </div>
    </div>
  );
}

// 파이차트 공통 렌더러
function BodyPartPieChart({
  data, dataKey, unit,
}: {
  data: { part: BodyPart; [key: string]: number | BodyPart }[];
  dataKey: string;
  unit: string;
}) {
  const chartData = data.map(d => ({
    name: d.part as string,
    value: d[dataKey] as number,
    color: BODY_PART_COLORS[d.part as BodyPart].accent,
  }));

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
    cx: number; cy: number; midAngle: number;
    innerRadius: number; outerRadius: number;
    percent: number; name: string;
  }) => {
    if ((percent ?? 0) < 0.08) return null;
    const r  = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x  = cx + r * Math.cos(-midAngle * RADIAN);
    const y  = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#000" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
        {name}
      </text>
    );
  };

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderLabel as any}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1C1C2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any, name: any) => [`${v}${unit}`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyVolumeChart({ data }: { data: { label: string; vol: number }[] }) {
  const max = Math.max(...data.map(d => d.vol), 1);
  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, max]} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{ background: '#1C1C2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [`${(v as number).toLocaleString()}kg`, '총 볼륨']}
          />
          <Bar dataKey="vol" radius={[4, 4, 0, 0]}>
            {data.map((_entry, i) => (
              <Cell key={i} fill={i === data.length - 1 ? '#AAFF00' : '#2A3A1A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Top5Chart({ data }: { data: { name: string; sets: number; bodyPart: BodyPart }[] }) {
  const max = Math.max(...data.map(d => d.sets), 1);
  return (
    <div className="body-part-bars">
      {data.map(({ name, sets, bodyPart }, i) => {
        const colors = BODY_PART_COLORS[bodyPart];
        return (
          <div key={name} className="body-part-bar">
            <div className="bar-label-row">
              <span style={{ color: '#F0F0FF' }}>
                <span style={{ color: colors.accent, marginRight: 6, fontSize: 12 }}>#{i + 1}</span>
                {name}
              </span>
              <span className="bar-count">{sets}세트</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(sets / max) * 100}%`,
                  background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImprovedList({ data }: {
  data: { name: string; bodyPart: BodyPart; thisWeight: number; lastWeight: number; diff: number }[];
}) {
  if (data.length === 0) {
    return <p className="stats-empty-msg">지난달 대비 중량이 오른 운동이 없어요</p>;
  }
  return (
    <div className="improved-list">
      {data.map(({ name, bodyPart, thisWeight, lastWeight, diff }) => {
        const colors = BODY_PART_COLORS[bodyPart];
        return (
          <div key={name} className="improved-row">
            <div className="improved-left">
              <span className="improved-part-dot" style={{ background: colors.accent }} />
              <span className="improved-name">{name}</span>
            </div>
            <div className="improved-right">
              <span className="improved-prev">{lastWeight}kg</span>
              <span className="improved-arrow">→</span>
              <span className="improved-now" style={{ color: colors.accent }}>{thisWeight}kg</span>
              <span className="improved-diff">+{diff}kg</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 관리가 필요한 부위 (소외된 근육) ─────────────────────────────────

type MuscleStatus = 'good' | 'warn' | 'bad' | 'never';

interface MuscleItem {
  target: string;
  bodyPart: BodyPart;
  status: MuscleStatus;
  lastDaysAgo: number | null; // null = 한번도 안함
}

function muscleWeakness(sessions: WorkoutSession[]): MuscleItem[] {
  const now = Date.now();
  const DAY = 86400000;

  // 타겟 근육별 마지막 훈련일 계산
  const lastTrainedMap = new Map<string, number>(); // target → timestamp
  for (const s of sessions) {
    const ts = new Date(s.date).getTime();
    for (const bpl of s.bodyPartLogs) {
      for (const ex of bpl.exercises) {
        const target = ex.exercise.target;
        if (!target) continue;
        const prev = lastTrainedMap.get(target) ?? 0;
        if (ts > prev) lastTrainedMap.set(target, ts);
      }
    }
  }

  // 고유 타겟 목록 (exercises.ts 기준)
  const seen = new Set<string>();
  const items: MuscleItem[] = [];
  for (const ex of EXERCISES) {
    if (seen.has(ex.target)) continue;
    seen.add(ex.target);
    const lastTs = lastTrainedMap.get(ex.target);
    if (!lastTs) {
      items.push({ target: ex.target, bodyPart: ex.bodyPart, status: 'never', lastDaysAgo: null });
      continue;
    }
    const daysAgo = Math.floor((now - lastTs) / DAY);
    const status: MuscleStatus = daysAgo <= 7 ? 'good' : daysAgo <= 14 ? 'warn' : 'bad';
    items.push({ target: ex.target, bodyPart: ex.bodyPart, status, lastDaysAgo: daysAgo });
  }

  // 정렬: bad → warn → good, never 제외
  const order: Record<MuscleStatus, number> = { bad: 0, warn: 1, never: 99, good: 2 };
  return items
    .filter(i => i.status !== 'never')
    .sort((a, b) => order[a.status] - order[b.status]);
}

const STATUS_ICON: Record<MuscleStatus, string>  = { good: '✓', warn: '⚠️', bad: '🔴', never: '─' };
const STATUS_COLOR: Record<MuscleStatus, string> = {
  good: '#AAFF00', warn: '#FFE600', bad: '#EF4444', never: '#555',
};

function MuscleWeaknessSection({ data }: { data: MuscleItem[] }) {
  return (
    <div className="muscle-weakness-list">
      {data.map(item => (
        <div key={item.target} className="muscle-row">
          <span className="muscle-dot" style={{ background: BODY_PART_COLORS[item.bodyPart].accent }} />
          <span className="muscle-name">{item.target}</span>
          <span className="muscle-sub">
            {item.status === 'never' ? '기록 없음'
              : item.lastDaysAgo === 0 ? '오늘'
              : item.lastDaysAgo === 1 ? '어제'
              : `${item.lastDaysAgo}일 전`}
          </span>
          <span className="muscle-icon" style={{ color: STATUS_COLOR[item.status] }}>
            {STATUS_ICON[item.status]}
          </span>
        </div>
      ))}
    </div>
  );
}

function CardioMonthlyChart({ data }: { data: { label: string; calories: number; minutes: number }[] }) {
  const max = Math.max(...data.map(d => d.calories), 1);
  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, max]} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{ background: '#1C1C2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={(v: any, _: any, item: any) => [
              `${(v as number).toLocaleString()}kcal · ${item?.payload?.minutes ?? 0}분`,
              '유산소',
            ]}
          />
          <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
            {data.map((_e, i) => (
              <Cell key={i} fill={i === data.length - 1 ? CARDIO_COLOR.accent : '#3A1A1A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProteinBars({ data }: { data: { label: string; protein: number; pct: number }[] }) {
  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="15%">
          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{ background: '#1C1C2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(_v: any, _n: any, item: any) =>
              [`${item?.payload?.protein ?? 0}g (${item?.payload?.pct ?? 0}%)`, '단백질']}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.pct >= 100 ? '#AAFF00' : entry.pct >= 70 ? '#77DD00' : '#2A2A3A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────

export default function StatsPage() {
  const [sessions, setSessions]         = useState<WorkoutSession[]>([]);
  const [dietEntries, setDietEntries]   = useState<DietEntry[]>([]);
  const [proteinGoal, setProteinGoal]   = useState(0);
  const [cardioSessions, setCardioSessions] = useState<CardioSession[]>([]);

  const loadData = () => {
    setSessions(getSessions());
    setDietEntries(getDietEntries());
    setProteinGoal(getProteinGoal());
  };

  useEffect(() => {
    // 1. 빠른 화면 렌더링을 위해 로컬 데이터 먼저 로드
    loadData();

    // 2. 백그라운드에서 서버(DB) 데이터 동기화
    Promise.all([api.getWorkouts(), api.getDietHistory(), api.getCardioHistory()])
      .then(([remoteSessions, remoteDiet, remoteCardio]) => {
        setCardioSessions(remoteCardio);
        // 세션 병합 후 저장
        const localS = getSessions();
        const sMap = new Map(localS.map(s => [s.id, s]));
        remoteSessions.forEach(s => sMap.set(s.id, s));
        localStorage.setItem('gym_sessions', JSON.stringify(Array.from(sMap.values())));

        // 식단 병합 후 저장
        const localD = getDietEntries();
        const dMap = new Map(localD.map(e => [e.id, e]));
        remoteDiet.forEach(d => dMap.set(d.id, d));
        localStorage.setItem('gym_diet', JSON.stringify(Array.from(dMap.values())));

        // 3. 동기화된 데이터로 화면 다시 렌더링
        loadData();
      })
      .catch(() => {
        // 통신 실패 시 로그 정도만 (기존 로컬 데이터로 유지됨)
        console.warn('DB Sync failed in Stats');
      });
  }, []);

  const now  = new Date();
  const thisM = monthOf(now);
  const lastM = monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisSessions = useMemo(() => sessionsOfMonth(sessions, thisM), [sessions, thisM]);
  const lastSessions = useMemo(() => sessionsOfMonth(sessions, lastM), [sessions, lastM]);

  const thisMonthStats  = { days: countUniqueDays(thisSessions), sets: countSets(thisSessions) };
  const lastMonthStats  = { days: countUniqueDays(lastSessions), sets: countSets(lastSessions) };
  const dayPieData      = useMemo(() => bodyPartDayCounts(thisSessions), [thisSessions]);
  const setPieData      = useMemo(() => bodyPartSetCounts(thisSessions), [thisSessions]);
  const volData         = useMemo(() => monthlyVolume(sessions), [sessions]);
  const top5Data        = useMemo(() => top5Exercises(sessions, thisM), [sessions, thisM]);
  const improvedData    = useMemo(() => improvedExercises(sessions, thisM, lastM), [sessions, thisM, lastM]);
  const muscleData      = useMemo(() => muscleWeakness(sessions), [sessions]);
  const proteinData     = useMemo(() => proteinLast7(dietEntries, proteinGoal), [dietEntries, proteinGoal]);
  const cardioData      = useMemo(() => monthlyCardio(cardioSessions), [cardioSessions]);

  const hasWorkouts = sessions.length > 0;
  const hasDiet     = dietEntries.length > 0;
  const hasCardio   = cardioSessions.length > 0;
  const monthLabel  = `${now.getMonth() + 1}월`;

  if (!hasWorkouts && !hasDiet) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h1 className="page-title">통계</h1></div>
        <div className="empty-state">
          <p className="empty-icon">📊</p>
          <p>운동을 기록하면 통계가 나타나요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">통계</h1>
        <span className="stats-month-badge">{monthLabel}</span>
      </div>

      {/* 단백질 달성률 */}
      {hasDiet && (
        <section className="stats-section">
          <h2 className="stats-section-title">단백질 달성률 <span className="stats-sub">최근 7일</span></h2>
          {proteinGoal > 0 ? (
            <>
              <ProteinBars data={proteinData} />
              <div className="protein-legend">
                <span className="legend-item"><span className="legend-dot" style={{ background: '#AAFF00' }} />100% 달성</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#77DD00' }} />70% 이상</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#2A2A3A' }} />미달</span>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ height: 160, justifyContent: 'center' }}>
              <p>체중을 입력하여 단백질 목표를 설정해보세요 ⚖️</p>
            </div>
          )}
        </section>
      )}

      {/* 이번 달 요약 */}
      {hasWorkouts && (
        <section className="stats-section">
          <h2 className="stats-section-title">{monthLabel} 요약</h2>
          <SummaryGrid thisMonth={thisMonthStats} lastMonth={lastMonthStats} />
        </section>
      )}

      {/* 부위별 날짜 비중 */}
      {hasWorkouts && dayPieData.length > 0 && (
        <section className="stats-section">
          <h2 className="stats-section-title">부위별 날짜 비중 <span className="stats-sub">{monthLabel}</span></h2>
          <BodyPartPieChart data={dayPieData} dataKey="days" unit="일" />
        </section>
      )}

      {/* 부위별 세트 비중 */}
      {hasWorkouts && setPieData.length > 0 && (
        <section className="stats-section">
          <h2 className="stats-section-title">부위별 세트 비중 <span className="stats-sub">{monthLabel}</span></h2>
          <BodyPartPieChart data={setPieData} dataKey="sets" unit="세트" />
        </section>
      )}

      {/* 월간 볼륨 추이 */}
      {hasWorkouts && (
        <section className="stats-section">
          <h2 className="stats-section-title">월간 볼륨 추이 <span className="stats-sub">최근 6개월</span></h2>
          <MonthlyVolumeChart data={volData} />
        </section>
      )}

      {/* TOP 5 운동 */}
      {hasWorkouts && top5Data.length > 0 && (
        <section className="stats-section">
          <h2 className="stats-section-title">많이 한 운동 TOP 5 <span className="stats-sub">{monthLabel}</span></h2>
          <Top5Chart data={top5Data} />
        </section>
      )}

      {/* 중량 향상 운동 */}
      {hasWorkouts && (
        <section className="stats-section">
          <h2 className="stats-section-title">중량 오른 운동 💪 <span className="stats-sub">지난달 대비</span></h2>
          <ImprovedList data={improvedData} />
        </section>
      )}

      {/* 관리가 필요한 부위 */}
      {hasWorkouts && (
        <section className="stats-section">
          <h2 className="stats-section-title">관리가 필요한 근육 🎯<span className="stats-sub">마지막 훈련 기준</span></h2>
          <MuscleWeaknessSection data={muscleData} />
        </section>
      )}

      {/* 월별 유산소 */}
      {hasCardio && (
        <section className="stats-section">
          <h2 className="stats-section-title">유산소 소모 칼로리 🏃 <span className="stats-sub">최근 6개월</span></h2>
          <CardioMonthlyChart data={cardioData} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div className="stat-summary-card" style={{ flex: 1 }}>
              <span className="stat-summary-value">
                {cardioData[cardioData.length - 1].minutes}<small>분</small>
              </span>
              <span className="stat-summary-label">이번달 유산소</span>
            </div>
            <div className="stat-summary-card" style={{ flex: 1 }}>
              <span className="stat-summary-value">
                {cardioData[cardioData.length - 1].calories.toLocaleString()}<small>kcal</small>
              </span>
              <span className="stat-summary-label">이번달 소모</span>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
