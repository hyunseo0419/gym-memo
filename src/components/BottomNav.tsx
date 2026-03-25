import { NavLink } from 'react-router-dom';

const ACTIVE = '#AAFF00';
const MUTED  = '#5A6A4A';

const navItems = [
  {
    to: '/',
    label: '홈',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/workout',
    label: '운동',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"
          stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: '캘린더',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2"
          stroke={a ? ACTIVE : MUTED} strokeWidth="2" />
        <path d="M16 2v4M8 2v4M3 10h18"
          stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinecap="round" />
        <circle cx="8"  cy="15" r="1.2" fill={a ? ACTIVE : MUTED} />
        <circle cx="12" cy="15" r="1.2" fill={a ? ACTIVE : MUTED} />
        <circle cx="16" cy="15" r="1.2" fill={a ? ACTIVE : MUTED} />
      </svg>
    ),
  },
  {
    to: '/diet',
    label: '식단',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"
          stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/stats',
    label: '통계',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 17l4-8 4 4 4-6 4 4"
          stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 21h18" stroke={a ? ACTIVE : MUTED} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <span className="nav-icon">{item.icon(isActive)}</span>
              <span className="nav-label">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
