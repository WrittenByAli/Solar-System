/** Theme-aware text colors — light mode always uses dark ink, never slate-400. */

export const DARK_TEXT = {
  ink: '#f8fafc',
  body: '#e2e8f0',
  secondary: '#94a3b8',
  muted: '#94a3b8',
  faint: '#64748b',
  accent: '#f5a623',
}

export const LIGHT_TEXT = {
  ink: '#0f172a',
  body: '#1e293b',
  secondary: '#334155',
  muted: '#475569',
  faint: '#64748b',
  accent: '#b45309',
}

export function themeText(isDark) {
  return isDark ? DARK_TEXT : LIGHT_TEXT
}
