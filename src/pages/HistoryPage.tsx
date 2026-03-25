import { useState, useEffect } from 'react';
import { getSessions } from '../services/storage';
import type { WorkoutSession } from '../types';
import { BODY_PART_COLORS } from '../data/exercises';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function SessionCard({ session }: { session: WorkoutSession }) {
  const [expanded, setExpanded] = useState(false);
  const totalSets = session.bodyPartLogs.reduce(
    (sum, bpl) => sum + bpl.exercises.reduce((s, e) => s + e.sets.length, 0), 0
  );
  const totalVolume = session.bodyPartLogs.reduce(
    (sum, bpl) => sum + bpl.exercises.reduce(
      (s, e) => s + e.sets.reduce((sv, set) => sv + set.weight * set.reps, 0), 0
    ), 0
  );

  return (
    <div className="session-card" onClick={() => setExpanded(v => !v)}>
      <div className="session-card-header">
        <div className="session-date-block">
          <span className="session-date">{formatDate(session.date)}</span>
          <span className="session-time">{formatTime(session.date)}</span>
        </div>
        <div className="session-badges">
          {session.bodyPartLogs.map(bpl => (
            <span
              key={bpl.bodyPart}
              className="part-badge"
              style={{ background: `linear-gradient(135deg, ${BODY_PART_COLORS[bpl.bodyPart].from}, ${BODY_PART_COLORS[bpl.bodyPart].to})`, color: '#000' }}
            >
              {bpl.bodyPart}
            </span>
          ))}
        </div>
      </div>

      <div className="session-meta">
        <span className="meta-item">💪 {totalSets}세트</span>
        <span className="meta-item">⚡ {totalVolume.toLocaleString()}kg</span>
        <span className="expand-arrow">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="session-detail">
          {session.bodyPartLogs.map(bpl => (
            <div key={bpl.bodyPart} className="detail-body-part">
              <h4 style={{ color: BODY_PART_COLORS[bpl.bodyPart].accent }}>{bpl.bodyPart}</h4>
              {bpl.exercises.map(ex => (
                <div key={ex.id} className="detail-exercise">
                  <p className="detail-ex-name">{ex.exercise.name}</p>
                  <div className="detail-sets">
                    {ex.sets.map(set => (
                      <span key={set.id} className="detail-set-chip">
                        {set.setNumber}세트 {set.weight}kg × {set.reps}회
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">기록 확인</h1>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📋</p>
          <p>아직 운동 기록이 없어요</p>
          <p className="empty-sub">운동을 완료하면 여기에 기록됩니다</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sorted.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
