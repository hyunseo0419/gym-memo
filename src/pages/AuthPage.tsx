import { useState } from 'react';

interface AuthPageProps {
  onLogin: () => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1218') {
      localStorage.setItem('gym_memo_auth', '1218');
      setError(false);
      onLogin(); 
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 500); 
    }
  };

  return (
    <div className="app-shell" style={{ height: '100dvh' }}>
      <style>
        {`
          @keyframes auth-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
          .shake-animation {
            animation: auth-shake 0.4s ease-in-out;
          }
        `}
      </style>
      <main 
        className="app-main fade-in center-content" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '0 20px',
          paddingBottom: '100px'
        }}
      >
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '300px' }}>
          <div className={error ? 'shake-animation' : ''} style={{ marginBottom: '28px' }}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PIN 번호 입력"
              className="num-input"
              style={{ 
                width: '100%',
                padding: '16px',
                fontSize: '24px',
                letterSpacing: password.length > 0 ? '12px' : '0px',
                borderColor: error ? 'var(--danger)' : 'var(--border)',
                transition: 'border-color 0.2s, background 0.2s',
                textAlign: 'center',
                backgroundColor: error ? 'rgba(255, 68, 68, 0.05)' : 'var(--bg-input)'
              }}
              autoFocus
            />
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '18px' }}>
            입장하기
          </button>
        </form>
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <p style={{ color: '#3a3a4a', fontSize: '11px', letterSpacing: '0.05em' }}>
            v1.1.0
          </p>
          <p style={{ color: '#2a2a3a', fontSize: '10px', marginTop: '4px' }}>
            운동 중 데이터 자동 저장 / 과거 날짜 입력 지원
          </p>
        </div>
      </main>
    </div>
  );
}
