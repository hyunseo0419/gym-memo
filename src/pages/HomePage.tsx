import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSessions, getBigThreeMax, getLastTrainedDate, getDietEntries,
  getTodayProtein, getTodayCalories, getProteinGoal, setProteinGoal,
  getManualPR, saveManualPR, type ManualPR,
  getLatestBodyWeight, saveBodyWeight,
} from '../services/storage';
import { api } from '../services/api';
import { BODY_PARTS, BODY_PART_COLORS } from '../data/exercises';
import type { WorkoutSession, BodyPart } from '../types';

const BIG_THREE = [
  { key: 'bench'    as keyof ManualPR, name: '벤치프레스', label: '벤치',  icon: '🫁' },
  { key: 'squat'    as keyof ManualPR, name: '스쿼트',    label: '스쿼트', icon: '🦵' },
  { key: 'deadlift' as keyof ManualPR, name: '데드리프트', label: '데드',  icon: '🏋️' },
];

const DAY_THRESHOLD = 7;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return '深夜もトレーニング？ 💪';
  if (h < 12) return 'おはようございます 🌅';
  if (h < 18) return '今日も頑張れ 💪';
  return '夜トレ、始めよう 🌙';
}

const QUOTES = [
  'スマホ見てる暇があったら、バーベルをもう一回上げろ。',
  'バルクアップを言い訳にするな。お前のはただのデブ活だ。',
  '筋肉痛が来ない？ジムに来てスマホばっかりいじってたからだろ。',
  '24時間ジムを契約したのになぜ行かない？ドアは開いてるのに、お前の意志だけが閉ざされている。',
  '雨だから休む、疲れたから休むって、一体いつ筋肉つけるつもりだ？',
  'その重量でため息をつくな。バーベルが鼻で笑ってるぞ。',
  '口でトレーニングするな、体を動かせ。そこはおしゃべりするカフェじゃない。',
  '今日一日休んだところで筋分解は起きない。でもお前、昨日も休んだよな？',
  '鶏胸肉がマズいって文句言うな。お前の体型のほうがよっぽど見苦しい。',
  'お前の体が変わらない本当の理由は、お前自身が一番よく分かっているはずだ。',
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

export default function HomePage() {
  const navigate = useNavigate();
  const [sessions, setSessions]       = useState<WorkoutSession[]>([]);
  const [protein, setProtein]         = useState(0);
  const [calories, setCalories]       = useState(0);
  const [proteinGoal, setGoal]        = useState(150);
  const [manualPR, setManualPR]       = useState<ManualPR>({ bench: 0, squat: 0, deadlift: 0 });
  const [bodyWeight, setBodyWeight]   = useState<number | null>(null);

  // 모달 상태
  const [editGoal, setEditGoal]       = useState(false);
  const [goalInput, setGoalInput]     = useState('');
  const [editPR, setEditPR]           = useState(false);
  const [prInput, setPrInput]         = useState<ManualPR>({ bench: 0, squat: 0, deadlift: 0 });
  const [editWeight, setEditWeight]   = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const loadData = () => {
    setSessions(getSessions());
    setProtein(getTodayProtein());
    setCalories(getTodayCalories());
    setGoal(getProteinGoal());
    setManualPR(getManualPR());
    setBodyWeight(getLatestBodyWeight());
  };

  useEffect(() => {
    loadData();

    Promise.all([api.getWorkouts(), api.getDietHistory()])
      .then(([remoteSessions, remoteDiet]) => {
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

        loadData();
      })
      .catch(() => {
        console.warn('DB Sync failed in Home');
      });
  }, []);

  // ── 부위 추천 (최대 2개) ─────────────────────────────────────────
  const recommendations: { part: BodyPart; days: number | null }[] = BODY_PARTS.map(part => {
    const lastDate = getLastTrainedDate(sessions, part);
    const days = lastDate ? daysSince(lastDate) : null;
    return { part, days };
  }).filter(({ days }) => days === null || days >= DAY_THRESHOLD)
    .sort((a, b) => {
      if (a.days === null && b.days === null) return 0;
      if (a.days === null) return -1;
      if (b.days === null) return 1;
      return b.days - a.days;
    })
    .slice(0, 2);

  const proteinPct = proteinGoal > 0 ? Math.min((protein / proteinGoal) * 100, 100) : 0;

  const handleGoalSave = () => {
    const v = parseInt(goalInput);
    if (!isNaN(v) && v > 0) { setProteinGoal(v); setGoal(v); }
    setEditGoal(false);
  };

  const handlePRSave = () => {
    saveManualPR(prInput);
    setManualPR(prInput);
    setEditPR(false);
  };

  const handleWeightSave = () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;
    saveBodyWeight(w);          // 체중 저장 + 단백질 목표 자동 갱신
    setBodyWeight(w);
    setGoal(Math.round(w * 2)); // UI 즉시 반영
    setEditWeight(false);
  };

  const openPREdit   = () => { setPrInput({ ...manualPR }); setEditPR(true); };
  const openWeightEdit = () => { setWeightInput(bodyWeight ? String(bodyWeight) : ''); setEditWeight(true); };

  return (
    <div className="page fade-in">
      {/* 인사 헤더 */}
      <div className="home-header">
        <p className="home-greeting">{getGreeting()}</p>
        <h1 className="home-title">筋トレログ</h1>
      </div>

      {/* 오늘의 명언 */}
      <div className="daily-quote">
        <span>💪 {getDailyQuote()}</span>
      </div>

      {/* 운동 시작 CTA */}
      <button className="home-cta" onClick={() => navigate('/workout')}>
        <span className="home-cta-text">운동 시작하기</span>
        <span className="home-cta-arrow">→</span>
      </button>

      {/* 체중 + 단백질 목표 카드 */}
      <section className="home-section">
        <div className="weight-row">
          <button className="weight-card" onClick={openWeightEdit}>
            <span className="weight-label">내 체중</span>
            <span className="weight-value">
              {bodyWeight ? `${bodyWeight}kg` : '입력하기'}
            </span>
          </button>
          <div className="weight-card weight-card-info">
            <span className="weight-label">단백질 목표</span>
            <span className="weight-value accent">{proteinGoal > 0 ? `${proteinGoal}g` : '미설정'}</span>
            {bodyWeight && (
              <span className="weight-sub">{bodyWeight}kg × 2</span>
            )}
          </div>
        </div>
      </section>

      {/* 3대 중량 */}
      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">3대 중량</h2>
          <button className="goal-edit-btn" onClick={openPREdit}>직접 입력</button>
        </div>
        <div className="big-three-grid">
          {BIG_THREE.map(({ key, name, label, icon }) => {
            const max = getBigThreeMax(sessions, name, manualPR[key]);
            return (
              <div key={key} className="big-three-card">
                <span className="big-three-icon">{icon}</span>
                <span className="big-three-weight">
                  {max > 0 ? max : '—'}
                  {max > 0 && <small>kg</small>}
                </span>
                <span className="big-three-label">{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 부위 추천 */}
      <section className="home-section">
        <h2 className="home-section-title">오늘 추천 부위</h2>
        {recommendations.length === 0 ? (
          <div className="home-card home-card-center">
            <p className="home-card-good">모든 부위를 골고루 운동하고 있어요! 🏆</p>
          </div>
        ) : (
          <div className="recommend-list">
            {recommendations.map(({ part, days }) => {
              const colors = BODY_PART_COLORS[part];
              return (
                <button
                  key={part}
                  className="recommend-item"
                  style={{ '--accent': colors.accent } as React.CSSProperties}
                  onClick={() => navigate('/workout')}
                >
                  <div className="recommend-left">
                    <span className="recommend-dot" style={{ background: colors.accent }} />
                    <span className="recommend-part">{part}</span>
                  </div>
                  <span className="recommend-days">
                    {days === null ? '아직 기록 없음' : `${days}일 전`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 오늘 영양 */}
      <section className="home-section">
        <div className="protein-header-row">
          <h2 className="home-section-title">오늘 영양</h2>
          <button className="diet-link" onClick={() => navigate('/diet')}>식단 기록 →</button>
        </div>

        <div className="home-card">
          <div className="protein-row">
            <div>
              <p className="nutrient-label">단백질</p>
              <p className="nutrient-value">
                <span style={{ color: 'var(--accent)' }}>{protein}</span>
                <span className="nutrient-total"> / {proteinGoal > 0 ? `${proteinGoal}g` : '?g'}</span>
              </p>
            </div>
            <button className="goal-edit-btn" onClick={() => { setGoalInput(String(proteinGoal)); setEditGoal(true); }}>
              목표 설정
            </button>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${proteinPct}%` }} />
          </div>
          {proteinGoal > 0 ? (
            proteinPct < 100
              ? <p className="protein-deficit">{Math.round(proteinGoal - protein)}g 더 섭취하면 목표 달성!</p>
              : <p className="protein-ok">오늘 단백질 목표 달성 🎉</p>
          ) : (
            <p className="protein-deficit" style={{ color: 'var(--text-muted)' }}>체중을 입력해 목표를 설정하세요</p>
          )}
        </div>

        <div className="home-card calorie-card">
          <p className="nutrient-label">오늘 칼로리</p>
          <p className="nutrient-value">
            <span style={{ color: 'var(--accent)' }}>{calories.toLocaleString()}</span>
            <small>kcal</small>
          </p>
        </div>
      </section>

      {/* 체중 입력 모달 */}
      {editWeight && (
        <div className="modal-overlay" onClick={() => setEditWeight(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">체중 입력</h3>
            <p className="modal-desc">입력하면 단백질 목표가 체중 × 2로 자동 설정됩니다.</p>
            <div className="pr-input-wrap" style={{ justifyContent: 'center' }}>
              <input
                type="number" inputMode="decimal" className="num-input pr-num"
                placeholder="0" value={weightInput} autoFocus
                onChange={e => setWeightInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleWeightSave()}
              />
              <span className="pr-unit">kg</span>
            </div>
            {weightInput && !isNaN(parseFloat(weightInput)) && (
              <p className="weight-preview">단백질 목표: {Math.round(parseFloat(weightInput) * 2)}g</p>
            )}
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleWeightSave}>저장</button>
          </div>
        </div>
      )}

      {/* 3대 중량 입력 모달 */}
      {editPR && (
        <div className="modal-overlay" onClick={() => setEditPR(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">3대 중량 입력</h3>
            <p className="modal-desc">운동 기록이 있으면 자동으로 최고치를 사용해요.</p>
            <div className="pr-input-list">
              {BIG_THREE.map(({ key, label }) => (
                <div key={key} className="pr-input-row">
                  <label className="pr-input-label">{label}</label>
                  <div className="pr-input-wrap">
                    <input
                      type="number" inputMode="decimal" className="num-input pr-num"
                      placeholder="0" value={prInput[key] || ''}
                      onChange={e => setPrInput(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="pr-unit">kg</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={handlePRSave}>저장</button>
          </div>
        </div>
      )}

      {/* 단백질 목표 수동 모달 */}
      {editGoal && (
        <div className="modal-overlay" onClick={() => setEditGoal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">단백질 목표 (g)</h3>
            <input
              type="number" inputMode="numeric" className="num-input"
              value={goalInput} onChange={e => setGoalInput(e.target.value)} autoFocus
            />
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleGoalSave}>저장</button>
          </div>
        </div>
      )}
    </div>
  );
}
