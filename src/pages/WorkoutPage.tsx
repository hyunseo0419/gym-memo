import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { BODY_PARTS, BODY_PART_COLORS, CARDIO_COLOR, CARDIO_ICON, getExercisesByBodyPart } from '../data/exercises';
import { api } from '../services/api';
import { addSession, removeSession } from '../services/storage';
import type { BodyPart } from '../types';

// ── 부위 선택 화면 ──────────────────────────────────────────────────
function BodyPartSelector() {
  const { selectBodyPart, state } = useWorkout();
  const navigate = useNavigate();
  const completedParts = state.currentSession?.bodyPartLogs.map(l => l.bodyPart) ?? [];

  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <h2 className="screen-title">부위 선택</h2>
        <p className="screen-subtitle">오늘 운동할 부위를 선택하세요</p>
      </div>
      <div className="body-part-grid">
        {BODY_PARTS.map(part => {
          const colors = BODY_PART_COLORS[part];
          const done = completedParts.includes(part);
          return (
            <button
              key={part}
              className={`body-part-card${done ? ' done' : ''}`}
              style={{ '--accent': colors.accent, '--grad-from': colors.from, '--grad-to': colors.to } as React.CSSProperties}
              onClick={() => selectBodyPart(part)}
            >
              {done && <span className="done-badge">✓ 완료</span>}
              <span className="body-part-icon">{getBodyPartEmoji(part)}</span>
              <span className="body-part-name">{part}</span>
            </button>
          );
        })}
        {/* 유산소 카드 */}
        <button
          className="body-part-card"
          style={{ '--accent': CARDIO_COLOR.accent, '--grad-from': CARDIO_COLOR.from, '--grad-to': CARDIO_COLOR.to } as React.CSSProperties}
          onClick={() => navigate('/cardio')}
        >
          <span className="body-part-icon">{CARDIO_ICON}</span>
          <span className="body-part-name">유산소</span>
        </button>
      </div>
    </div>
  );
}

// ── 운동 종류 선택 화면 ─────────────────────────────────────────────
function ExerciseSelector({ bodyPart }: { bodyPart: BodyPart }) {
  const { selectExercise, finishBodyPart, state } = useWorkout();
  const exercises = getExercisesByBodyPart(bodyPart);
  const colors = BODY_PART_COLORS[bodyPart];

  const completedBodyPartLog = state.currentSession?.bodyPartLogs.find(l => l.bodyPart === bodyPart);
  const completedExerciseIds = completedBodyPartLog?.exercises.map(e => e.exercise.id) ?? [];

  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <button className="back-btn" onClick={finishBodyPart}>← 뒤로</button>
        <h2 className="screen-title" style={{ color: colors.accent }}>{bodyPart} 운동</h2>
        <p className="screen-subtitle">운동 종류를 선택하세요</p>
      </div>

      {completedExerciseIds.length > 0 && (
        <div className="completed-notice">
          <span>✓ 완료된 운동: {completedExerciseIds.length}개</span>
        </div>
      )}

      <div className="exercise-list">
        {exercises.map(ex => {
          const done = completedExerciseIds.includes(ex.id);
          return (
            <button
              key={ex.id}
              className={`exercise-item${done ? ' done' : ''}`}
              style={{ '--accent': colors.accent } as React.CSSProperties}
              onClick={() => selectExercise(ex)}
            >
              <span className="exercise-name">{ex.name}</span>
              {done && <span className="check-icon">✓</span>}
              {!done && <span className="arrow-icon">→</span>}
            </button>
          );
        })}
      </div>

      <div className="action-footer">
        <button className="btn-secondary" onClick={finishBodyPart}>
          {bodyPart} 운동 완료
        </button>
      </div>
    </div>
  );
}

// ── 세트 기록 화면 ──────────────────────────────────────────────────
function SetRecorder({ bodyPart }: { bodyPart: BodyPart }) {
  const { state, addSet, removeSet, finishExercise } = useWorkout();
  const exerciseLog = state.activeExerciseLog!;
  const colors = BODY_PART_COLORS[bodyPart];

  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const repsRef = useRef<HTMLInputElement>(null);

  const handleAddSet = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
    addSet(w, r);
    setReps('');
    setWeight('');
    repsRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'weight' | 'reps') => {
    if (e.key === 'Enter') {
      if (field === 'weight') repsRef.current?.focus();
      else handleAddSet();
    }
  };

  const totalVolume = exerciseLog.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <button className="back-btn" onClick={finishExercise}>← 운동 목록</button>
        <h2 className="screen-title" style={{ color: colors.accent }}>{exerciseLog.exercise.name}</h2>
        {totalVolume > 0 && (
          <p className="screen-subtitle">총 볼륨: {totalVolume.toLocaleString()} kg</p>
        )}
      </div>

      {/* 세트 목록 */}
      <div className="sets-container">
        {exerciseLog.sets.length === 0 ? (
          <div className="empty-sets">
            <p>첫 번째 세트를 기록하세요</p>
          </div>
        ) : (
          <div className="sets-list">
            <div className="sets-header-row">
              <span>세트</span><span>무게</span><span>횟수</span><span></span>
            </div>
            {exerciseLog.sets.map(set => (
              <div key={set.id} className="set-row">
                <span className="set-num" style={{ color: colors.accent }}>{set.setNumber}</span>
                <span className="set-weight">{set.weight}kg</span>
                <span className="set-reps">{set.reps}회</span>
                <button className="remove-btn" onClick={() => removeSet(set.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 세트 입력 */}
      <div className="set-input-card" style={{ '--accent': colors.accent } as React.CSSProperties}>
        <h3 className="input-title">세트 {exerciseLog.sets.length + 1} 추가</h3>
        <div className="input-row">
          <div className="input-group">
            <label>무게 (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              onKeyDown={e => handleKeyDown(e, 'weight')}
              placeholder="0"
              className="num-input"
            />
          </div>
          <div className="input-sep">×</div>
          <div className="input-group">
            <label>횟수</label>
            <input
              ref={repsRef}
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              onKeyDown={e => handleKeyDown(e, 'reps')}
              placeholder="0"
              className="num-input"
            />
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
          onClick={handleAddSet}
          disabled={!weight || !reps}
        >
          + 세트 추가
        </button>
      </div>

      <div className="action-footer">
        <button className="btn-secondary" onClick={finishExercise}>
          운동 완료
        </button>
      </div>
    </div>
  );
}

// ── 운동 완료 / 전송 화면 ───────────────────────────────────────────
function SessionSummary() {
  const { state, resetSession, dispatch } = useWorkout();
  const session = state.currentSession!;

  const totalSets = session.bodyPartLogs.reduce(
    (sum, bpl) => sum + bpl.exercises.reduce((s, e) => s + e.sets.length, 0), 0
  );
  const totalVolume = session.bodyPartLogs.reduce(
    (sum, bpl) => sum + bpl.exercises.reduce(
      (s, e) => s + e.sets.reduce((sv, set) => sv + set.weight * set.reps, 0), 0
    ), 0
  );

  const handleFinish = async () => {
    dispatch({ type: 'SET_SENDING', sending: true });
    // 1) 로컬에 먼저 저장
    addSession(session);
    try {
      // 2) 서버 전송
      await api.sendWorkout(session);
      // 3) 성공 시 로컬 삭제
      removeSession(session.id);
      dispatch({ type: 'SET_SEND_RESULT', result: 'success' });
    } catch {
      // 서버 실패 시 로컬 유지 (히스토리/홈에서 계속 사용)
      dispatch({ type: 'SET_SEND_RESULT', result: 'error' });
    } finally {
      dispatch({ type: 'SET_SENDING', sending: false });
    }
  };

  if (state.sendResult === 'success') {
    return (
      <div className="screen fade-in center-content">
        <div className="success-icon">🏆</div>
        <h2 className="screen-title">운동 완료!</h2>
        <p className="screen-subtitle">서버에 전송되었습니다</p>
        <button className="btn-primary mt-lg" onClick={resetSession}>새 운동 시작</button>
      </div>
    );
  }

  return (
    <div className="screen fade-in">
      <div className="screen-header">
        <h2 className="screen-title">운동 요약</h2>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-value">{session.bodyPartLogs.length}</span>
          <span className="stat-label">운동 부위</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalSets}</span>
          <span className="stat-label">총 세트</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalVolume.toLocaleString()}</span>
          <span className="stat-label">총 볼륨(kg)</span>
        </div>
      </div>

      <div className="summary-detail">
        {session.bodyPartLogs.map(bpl => (
          <div key={bpl.bodyPart} className="summary-body-part">
            <h3 className="summary-part-title" style={{ color: BODY_PART_COLORS[bpl.bodyPart].accent }}>
              {bpl.bodyPart}
            </h3>
            {bpl.exercises.map(ex => (
              <div key={ex.id} className="summary-exercise">
                <span className="summary-ex-name">{ex.exercise.name}</span>
                <span className="summary-ex-sets">{ex.sets.length}세트</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {state.sendResult === 'error' && (
        <div className="error-notice">서버 전송 실패. 다시 시도해주세요.</div>
      )}

      <div className="action-footer">
        <button
          className="btn-primary"
          onClick={handleFinish}
          disabled={state.isSending}
        >
          {state.isSending ? '전송 중...' : '운동 종료 & 저장'}
        </button>
        <button className="btn-ghost" onClick={resetSession}>처음으로</button>
      </div>
    </div>
  );
}



// ── 메인 WorkoutPage ─────────────────────────────────────────────────
export default function WorkoutPage() {
  const { state, startSession } = useWorkout();
  const [showSummary, setShowSummary] = useState(false);

  // 세션 없으면 자동 시작 → 바로 부위 선택 화면
  useEffect(() => {
    if (!state.currentSession) {
      startSession();
    }
  }, [state.currentSession, startSession]);

  // 세션 초기화 중
  if (!state.currentSession) return null;

  // 요약/종료 화면
  if (showSummary || state.sendResult !== 'idle') {
    return <SessionSummary />;
  }

  // 세트 기록 화면
  if (state.activeExerciseLog) {
    return <SetRecorder bodyPart={state.activeBodyPart!} />;
  }

  // 운동 선택 화면
  if (state.activeBodyPart) {
    return <ExerciseSelector bodyPart={state.activeBodyPart} />;
  }

  // 부위 선택 화면 + 종료 버튼
  return (
    <div>
      <BodyPartSelector />
      {state.currentSession.bodyPartLogs.length > 0 && (
        <div className="action-footer">
          <button className="btn-finish" onClick={() => setShowSummary(true)}>
            운동 종료하기 →
          </button>
        </div>
      )}
    </div>
  );
}

function getBodyPartEmoji(part: BodyPart): string {
  const map: Record<BodyPart, string> = {
    '가슴': '🫁',
    '등': '🏋️',
    '하체': '🦵',
    '팔': '💪',
    '어깨': '🏆',
  };
  return map[part];
}
