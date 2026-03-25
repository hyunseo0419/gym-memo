import { useState, useEffect, useRef } from 'react';
import {
  getDietEntries, addDietEntry, removeDietEntry, getProteinGoal,
} from '../services/storage';
import { api } from '../services/api';
import type { DietEntry } from '../types';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function groupByDate(entries: DietEntry[]): { dateLabel: string; entries: DietEntry[] }[] {
  const map = new Map<string, DietEntry[]>();
  [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).forEach(e => {
    const key = new Date(e.timestamp).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });
  return Array.from(map.entries()).map(([key, entries]) => ({
    dateLabel: new Date(key).toDateString() === new Date().toDateString()
      ? '오늘'
      : formatDate(entries[0].timestamp),
    entries,
  }));
}

// ── 입력 폼 ─────────────────────────────────────────────────────────
type FormState = 'idle' | 'analyzing' | 'preview' | 'manual';

function AddDietModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (entry: DietEntry) => void;
}) {
  const [formState, setFormState] = useState<FormState>('idle');
  const [menuName, setMenuName]   = useState('');
  const [calories, setCalories]   = useState('');
  const [protein, setProtein]     = useState('');
  const [error, setError]         = useState('');
  // AI 분석 결과를 서버 ID와 함께 보관 (중복 저장 방지)
  const [serverResult, setServerResult] = useState<DietEntry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // 서버 AI 분석 요청 → preview 상태로
  const handleAnalyze = async () => {
    if (!menuName.trim()) return;
    setFormState('analyzing');
    setError('');
    api.analyzeDiet(menuName.trim())
      .then(result => {
        setServerResult(result);           // 서버 ID 보관
        setCalories(String(result.calories));
        setProtein(String(result.protein));
        setFormState('preview');
      })
      .catch(() => {
        setFormState('manual');
        setError('서버 연결 실패. 직접 입력해주세요.');
      });
  };

  // 확인 후 저장 (preview / manual 공통)
  const handleSave = async () => {
    const cal = parseInt(calories);
    const pro = parseFloat(protein);
    if (isNaN(cal) || isNaN(pro)) return;

    if (formState === 'preview' && serverResult) {
      // AI 모드: 서버에는 이미 저장됨 → 서버 ID로 로컬 저장 (수정된 값 반영)
      const finalEntry: DietEntry = {
        ...serverResult,
        calories: cal,
        protein: pro,
      };
      addDietEntry(finalEntry);
      onAdded(finalEntry);
    } else {
      // 직접 입력 모드: 서버에 저장 → 받은 ID로 로컬 저장
      try {
        const saved = await api.saveDiet({
          menuName: menuName.trim(),
          calories: cal,
          protein: pro,
          timestamp: new Date().toISOString(),
        });
        addDietEntry(saved);
        onAdded(saved);
      } catch {
        const entry: DietEntry = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          menuName: menuName.trim(),
          calories: cal,
          protein: pro,
        };
        addDietEntry(entry);
        onAdded(entry);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formState === 'idle') handleAnalyze();
  };

  const isEditState = formState === 'preview' || formState === 'manual';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <h3 className="modal-title">
          {formState === 'preview' ? 'AI 분석 결과' : formState === 'manual' ? '직접 입력' : '식단 추가'}
        </h3>

        {/* 메뉴명 입력 */}
        <div className="form-group">
          <label className="form-label">메뉴 이름</label>
          <input
            ref={inputRef}
            type="text"
            className="text-input"
            placeholder="예: 닭가슴살150, 밥200"
            value={menuName}
            onChange={e => { setMenuName(e.target.value); if (isEditState) setFormState('idle'); }}
            onKeyDown={handleKeyDown}
            disabled={formState === 'analyzing'}
          />
        </div>

        {/* 분석 중 */}
        {formState === 'analyzing' && (
          <div className="diet-analyzing">
            <div className="spinner" />
            <p>AI가 영양 정보를 분석하는 중...</p>
          </div>
        )}

        {/* 결과 수정 + 저장 (preview / manual 공통) */}
        {isEditState && (
          <>
            {error && <p className="diet-error">{error}</p>}
            {formState === 'preview' && (
              <p className="diet-preview-hint">값을 수정하고 저장할 수 있어요</p>
            )}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">칼로리 (kcal)</label>
                <input
                  type="number" inputMode="numeric" className="num-input"
                  placeholder="0" value={calories}
                  onChange={e => setCalories(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">단백질 (g)</label>
                <input
                  type="number" inputMode="decimal" className="num-input"
                  placeholder="0" value={protein}
                  onChange={e => setProtein(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn-primary" style={{ marginTop: 8 }}
              onClick={handleSave}
              disabled={!menuName.trim() || !calories || !protein}
            >
              저장
            </button>
            {formState === 'manual' && (
              <button className="btn-ghost" onClick={() => { setFormState('idle'); setError(''); }}>
                AI 분석 다시 시도
              </button>
            )}
          </>
        )}

        {/* 기본: AI 분석 버튼 */}
        {formState === 'idle' && (
          <>
            <button
              className="btn-primary" style={{ marginTop: 8 }}
              onClick={handleAnalyze}
              disabled={!menuName.trim()}
            >
              🤖 AI 분석
            </button>
            <button className="btn-ghost" onClick={() => setFormState('manual')}>
              직접 입력
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── 식단 카드 ────────────────────────────────────────────────────────
function DietCard({ entry, onRemove }: { entry: DietEntry; onRemove: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);

  const handleRemove = async () => {
    // 서버에서도 삭제 시도
    if (entry.id) api.deleteDiet(entry.id).catch(() => {});
    onRemove(entry.id);
  };

  return (
    <div className="diet-card">
      <div className="diet-card-main">
        <div className="diet-card-info">
          <span className="diet-time">{formatTime(entry.timestamp)}</span>
          <span className="diet-menu">{entry.menuName}</span>
        </div>
        <div className="diet-card-nums">
          <span className="diet-cal">{entry.calories}kcal</span>
          <span className="diet-pro">{entry.protein}g</span>
        </div>
      </div>
      {confirm ? (
        <div className="diet-confirm-row">
          <span className="diet-confirm-msg">삭제할까요?</span>
          <button className="diet-del-confirm" onClick={handleRemove}>삭제</button>
          <button className="diet-del-cancel" onClick={() => setConfirm(false)}>취소</button>
        </div>
      ) : (
        <button className="diet-del-btn" onClick={() => setConfirm(true)}>✕</button>
      )}
    </div>
  );
}

// ── 날짜별 합계 ───────────────────────────────────────────────────────
function DayTotals({ entries }: { entries: DietEntry[] }) {
  const totalCal = entries.reduce((s, e) => s + e.calories, 0);
  const totalPro = entries.reduce((s, e) => s + e.protein, 0);
  return (
    <div className="day-totals">
      <span>{totalCal.toLocaleString()}kcal</span>
      <span style={{ color: 'var(--accent)' }}>단백질 {totalPro}g</span>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────
export default function DietPage() {
  const [entries, setEntries]     = useState<DietEntry[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [serverSync, setServerSync] = useState<'idle' | 'loading' | 'done'>('idle');

  const todayEntries  = entries.filter(e => isToday(e.timestamp));
  const todayProtein  = todayEntries.reduce((s, e) => s + e.protein, 0);
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0);
  const proteinGoal   = getProteinGoal();
  const proteinPct    = proteinGoal > 0 ? Math.min((todayProtein / proteinGoal) * 100, 100) : 0;

  const load = () => setEntries(getDietEntries());

  useEffect(() => {
    load();
    // 서버에서 전체 히스토리 동기화
    setServerSync('loading');
    api.getDietHistory()
      .then(serverEntries => {
        // 서버 데이터를 로컬에 병합 (서버 데이터 우선 덮어쓰기)
        const local = getDietEntries();
        const mergedMap = new Map(local.map(e => [e.id, e]));
        serverEntries.forEach(e => {
          mergedMap.set(e.id, e);
        });
        // 일괄 저장
        localStorage.setItem('gym_diet', JSON.stringify(Array.from(mergedMap.values())));
        load();
        setServerSync('done');
      })
      .catch(() => setServerSync('done'));
  }, []);

  const handleAdded = (_entry: DietEntry) => {
    load();
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    removeDietEntry(id);
    load();
  };

  const grouped = groupByDate(todayEntries);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div className="diet-page-header-row">
          <h1 className="page-title">식단</h1>
          {serverSync === 'loading' && <span className="sync-indicator">동기화 중...</span>}
        </div>
      </div>

      {/* 오늘 요약 */}
      <div className="diet-summary">
        <div className="diet-summary-item">
          <span className="diet-sum-value">{todayProtein}<small>g</small></span>
          <span className="diet-sum-label">단백질</span>
        </div>
        <div className="diet-summary-divider" />
        <div className="diet-summary-item">
          <span className="diet-sum-value">{todayCalories.toLocaleString()}<small>kcal</small></span>
          <span className="diet-sum-label">칼로리</span>
        </div>
        <div className="diet-summary-divider" />
        <div className="diet-summary-item">
          {proteinGoal > 0 ? (
            <>
              <span className="diet-sum-value" style={{ color: proteinPct >= 100 ? 'var(--accent)' : '#fff' }}>
                {proteinPct >= 100 ? '✓' : `${Math.round(proteinGoal - todayProtein)}`}
                {proteinPct < 100 && <small>g 남음</small>}
              </span>
              <span className="diet-sum-label">{proteinPct >= 100 ? '목표 달성!' : '단백질 남음'}</span>
            </>
          ) : (
            <>
              <span className="diet-sum-value" style={{ color: '#aaa', fontSize: '14px' }}>목표 없음</span>
              <span className="diet-sum-label">체중 입력 필요</span>
            </>
          )}
        </div>
      </div>

      {/* 단백질 프로그레스 */}
      <div className="diet-progress-wrap">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${proteinPct}%` }} />
        </div>
        <span className="diet-progress-label">{todayProtein} / {proteinGoal > 0 ? `${proteinGoal}g` : '?g'}</span>
      </div>



      {/* 목록 */}
      <div className="diet-list">
        {grouped.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">🍽️</p>
            <p>오늘의 식단을 기록해보세요 🍽️</p>
          </div>
        ) : (
          grouped.map(({ dateLabel, entries: dayEntries }) => (
            <div key={dateLabel} className="diet-group">
              <div className="diet-group-header">
                <p className="diet-group-label">{dateLabel}</p>
                <DayTotals entries={dayEntries} />
              </div>
              {dayEntries.map(entry => (
                <DietCard key={entry.id} entry={entry} onRemove={handleRemove} />
              ))}
            </div>
          ))
        )}
      </div>

      {showForm && <AddDietModal onClose={() => setShowForm(false)} onAdded={handleAdded} />}

      <button className="fab" onClick={() => setShowForm(true)}>+</button>
    </div>
  );
}
