import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CARDIO_COLOR } from '../data/exercises';
import { getLatestBodyWeight } from '../services/storage';
import { api } from '../services/api';
import type { CardioType, BadmintonIntensity, CardioSession } from '../types';
import { getEffectiveDateISO } from '../utils/date';

const { from, to, accent } = CARDIO_COLOR;

// ── 칼로리 계산 ────────────────────────────────────────────────────────

function calcTreadmill(speedKmh: number, inclinePct: number, durationMin: number, weightKg: number): number {
  if (!speedKmh || !durationMin || !weightKg) return 0;
  const speedMmin = (speedKmh * 1000) / 60;
  const grade = inclinePct / 100;
  // ACSM 공식: 걷기(≤6 km/h)와 달리기(>6 km/h) 계수 구분
  const isRunning = speedKmh > 6;
  const hCoeff = isRunning ? 0.2 : 0.1;   // 수평 성분
  const vCoeff = isRunning ? 0.9 : 1.8;   // 수직(인클라인) 성분
  const vo2 = hCoeff * speedMmin + vCoeff * speedMmin * grade + 3.5;
  const met = vo2 / 3.5;
  return Math.round(met * weightKg * (durationMin / 60));
}

const BADMINTON_MET: Record<BadmintonIntensity, number> = {
  'ガッツリ':  7.0,
  '中間':      5.5,
  'まったり':  4.0,
};

function calcBadminton(intensity: BadmintonIntensity, durationMin: number, weightKg: number): number {
  if (!durationMin || !weightKg) return 0;
  return Math.round(BADMINTON_MET[intensity] * weightKg * (durationMin / 60));
}

// ── 타입 선택 화면 ─────────────────────────────────────────────────────

function TypeSelector({ onSelect }: { onSelect: (type: CardioType) => void }) {
  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <h2 className="screen-title" style={{ color: accent }}>유산소</h2>
        <p className="screen-subtitle">종류를 선택하세요</p>
      </div>
      <div className="body-part-grid">
        <button
          className="body-part-card"
          style={{ '--accent': accent, '--grad-from': from, '--grad-to': to } as React.CSSProperties}
          onClick={() => onSelect('런닝머신')}
        >
          <span className="body-part-icon">🏃</span>
          <span className="body-part-name">런닝머신</span>
        </button>
        <button
          className="body-part-card"
          style={{ '--accent': accent, '--grad-from': from, '--grad-to': to } as React.CSSProperties}
          onClick={() => onSelect('배드민턴')}
        >
          <span className="body-part-icon">🏸</span>
          <span className="body-part-name">배드민턴</span>
        </button>
      </div>
    </div>
  );
}

// ── 런닝머신 입력 ──────────────────────────────────────────────────────

function TreadmillForm({ onSave }: { onSave: (session: Omit<CardioSession, 'id' | 'date'>) => void }) {
  const savedWeight = getLatestBodyWeight();
  const [speed, setSpeed]     = useState('');
  const [incline, setIncline] = useState('0');
  const [duration, setDuration] = useState('');
  const [weight, setWeight]   = useState(savedWeight ? String(savedWeight) : '');

  const calories = calcTreadmill(
    parseFloat(speed), parseFloat(incline), parseFloat(duration), parseFloat(weight)
  );

  const handleSave = () => {
    const w = parseFloat(weight);
    const s = parseFloat(speed);
    const i = parseFloat(incline);
    const d = parseFloat(duration);
    if (!w || !s || !d) return;
    onSave({
      type: '런닝머신',
      duration: d,
      calories,
      weight: w,
      details: { speed: s, incline: i },
    });
  };

  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <h2 className="screen-title" style={{ color: accent }}>🏃 런닝머신</h2>
        <p className="screen-subtitle">운동 정보를 입력하세요</p>
      </div>

      <div className="set-input-card" style={{ '--accent': accent } as React.CSSProperties}>
        {!savedWeight && (
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label>체중 (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              className="num-input"
              placeholder="70"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>
        )}
        {savedWeight && (
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
            체중 {savedWeight}kg 기준으로 계산
          </p>
        )}

        <div className="input-row" style={{ marginBottom: 16 }}>
          <div className="input-group">
            <label>속도 (km/h)</label>
            <input
              type="number"
              inputMode="decimal"
              className="num-input"
              placeholder="8.0"
              value={speed}
              onChange={e => setSpeed(e.target.value)}
            />
          </div>
          <div className="input-sep" />
          <div className="input-group">
            <label>인클라인 (%)</label>
            <input
              type="number"
              inputMode="decimal"
              className="num-input"
              placeholder="0"
              value={incline}
              onChange={e => setIncline(e.target.value)}
            />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 20 }}>
          <label>시간 (분)</label>
          <input
            type="number"
            inputMode="numeric"
            className="num-input"
            placeholder="30"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
        </div>

        {calories > 0 && (
          <div className="calorie-preview" style={{ background: `linear-gradient(135deg, ${from}33, ${to}22)`, borderColor: accent }}>
            <span className="calorie-label">예상 소모 칼로리</span>
            <span className="calorie-value" style={{ color: accent }}>{calories} kcal</span>
          </div>
        )}
      </div>

      <div className="action-footer">
        <button
          className="btn-primary"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
          onClick={handleSave}
          disabled={!speed || !duration || (!savedWeight && !weight)}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

// ── 배드민턴 입력 ──────────────────────────────────────────────────────

const INTENSITY_LABELS: BadmintonIntensity[] = ['ガッツリ', '中間', 'まったり'];
const INTENSITY_DESC: Record<BadmintonIntensity, string> = {
  'ガッツリ':  '고강도 풀파워',
  '中間':      '적당히 즐기기',
  'まったり':  '가볍게 라리라리',
};

function BadmintonForm({ onSave }: { onSave: (session: Omit<CardioSession, 'id' | 'date'>) => void }) {
  const savedWeight = getLatestBodyWeight();
  const [intensity, setIntensity] = useState<BadmintonIntensity>('ガッツリ');
  const [duration, setDuration]   = useState('');
  const [weight, setWeight]       = useState(savedWeight ? String(savedWeight) : '');

  const calories = calcBadminton(intensity, parseFloat(duration), parseFloat(weight));

  const handleSave = () => {
    const w = parseFloat(weight);
    const d = parseFloat(duration);
    if (!w || !d) return;
    onSave({
      type: '배드민턴',
      duration: d,
      calories,
      weight: w,
      details: { intensity },
    });
  };

  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <h2 className="screen-title" style={{ color: accent }}>🏸 배드민턴</h2>
        <p className="screen-subtitle">강도와 시간을 입력하세요</p>
      </div>

      <div className="set-input-card" style={{ '--accent': accent } as React.CSSProperties}>
        {!savedWeight && (
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label>체중 (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              className="num-input"
              placeholder="70"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>
        )}
        {savedWeight && (
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
            체중 {savedWeight}kg 기준으로 계산
          </p>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 10 }}>강도</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {INTENSITY_LABELS.map(lvl => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `2px solid ${intensity === lvl ? accent : '#333'}`,
                  background: intensity === lvl ? `${accent}22` : '#1a1a2e',
                  color: intensity === lvl ? accent : '#ccc',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 16 }}>{lvl}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{INTENSITY_DESC[lvl]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 20 }}>
          <label>시간 (분)</label>
          <input
            type="number"
            inputMode="numeric"
            className="num-input"
            placeholder="60"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
        </div>

        {calories > 0 && (
          <div className="calorie-preview" style={{ background: `linear-gradient(135deg, ${from}33, ${to}22)`, borderColor: accent }}>
            <span className="calorie-label">예상 소모 칼로리</span>
            <span className="calorie-value" style={{ color: accent }}>{calories} kcal</span>
          </div>
        )}
      </div>

      <div className="action-footer">
        <button
          className="btn-primary"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
          onClick={handleSave}
          disabled={!duration || (!savedWeight && !weight)}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

// ── 완료 화면 ──────────────────────────────────────────────────────────

function SavedScreen({ calories, type, onDone }: { calories: number; type: CardioType; onDone: () => void }) {
  return (
    <div className="screen fade-in center-content">
      <div className="success-icon">🏆</div>
      <h2 className="screen-title">{type} 완료!</h2>
      <p className="screen-subtitle" style={{ color: accent, fontSize: 22, fontWeight: 700 }}>
        {calories} kcal 소모
      </p>
      <button className="btn-primary mt-lg" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} onClick={onDone}>
        확인
      </button>
    </div>
  );
}

// ── 메인 CardioPage ────────────────────────────────────────────────────

export default function CardioPage() {
  const navigate = useNavigate();
  const [cardioType, setCardioType] = useState<CardioType | null>(null);
  const [saved, setSaved]           = useState<{ calories: number; type: CardioType } | null>(null);
  const [saving, setSaving]         = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (partial: Omit<CardioSession, 'id' | 'date'>) => {
    setSaving(true);
    setSaveError(null);
    const session: CardioSession = {
      id:   `cardio_${Date.now()}`,
      date: getEffectiveDateISO(),
      ...partial,
    };
    try {
      await api.saveCardio(session);
      setSaved({ calories: session.calories, type: session.type });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '서버 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return <SavedScreen calories={saved.calories} type={saved.type} onDone={() => navigate('/workout')} />;
  }

  if (saving) {
    return (
      <div className="screen fade-in center-content">
        <p style={{ color: accent }}>저장 중...</p>
      </div>
    );
  }

  if (saveError) {
    return (
      <div className="screen fade-in center-content">
        <p style={{ color: '#ff4466', marginBottom: 12 }}>저장 실패</p>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>{saveError}</p>
        <button className="btn-primary" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} onClick={() => setSaveError(null)}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!cardioType) {
    return (
      <div>
        <div style={{ padding: '12px 16px 0' }}>
          <button className="back-btn" onClick={() => navigate('/workout')}>← 뒤로</button>
        </div>
        <TypeSelector onSelect={setCardioType} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '12px 16px 0' }}>
        <button className="back-btn" onClick={() => setCardioType(null)}>← 뒤로</button>
      </div>
      {cardioType === '런닝머신'
        ? <TreadmillForm onSave={handleSave} />
        : <BadmintonForm onSave={handleSave} />
      }
    </div>
  );
}
