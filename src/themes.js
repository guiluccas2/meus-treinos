// Temas: cada um tem versão escura e clara.
const darkBase = { bg: '#0f1115', surface: '#181b22', surface2: '#20242d', line: '#2a2f3a', tx: '#e8eaf0', mut: '#8b93a5', side: '#0b0d10' };
const lightBase = { bg: '#f4f5f7', surface: '#ffffff', surface2: '#eef0f3', line: '#dfe2e8', tx: '#15181e', mut: '#646c7c', side: '#ffffff' };

export const THEMES = [
  {
    id: 'lima', name: 'Lima',
    dark: { ...darkBase, ac: '#c6f432', acInk: '#111111', acTx: '#c6f432' },
    light: { ...lightBase, ac: '#b5e61d', acInk: '#111111', acTx: '#4d7c0f' }
  },
  {
    id: 'oceano', name: 'Oceano',
    dark: { ...darkBase, bg: '#0b111c', surface: '#121a28', surface2: '#1a2435', line: '#263247', side: '#080d16', ac: '#38bdf8', acInk: '#04111c', acTx: '#38bdf8' },
    light: { ...lightBase, bg: '#f1f6fb', surface2: '#e8f0f8', ac: '#0284c7', acInk: '#ffffff', acTx: '#0369a1' }
  },
  {
    id: 'brasa', name: 'Brasa',
    dark: { ...darkBase, bg: '#14100d', surface: '#1e1813', surface2: '#29211a', line: '#3a2f25', side: '#0e0b09', ac: '#ff7a1a', acInk: '#1a0d02', acTx: '#ff8f3d' },
    light: { ...lightBase, bg: '#faf6f2', surface2: '#f4ece4', ac: '#ea580c', acInk: '#ffffff', acTx: '#c2410c' }
  },
  {
    id: 'violeta', name: 'Violeta',
    dark: { ...darkBase, bg: '#110f1a', surface: '#1a1726', surface2: '#242033', line: '#332d47', side: '#0c0a13', ac: '#a78bfa', acInk: '#140b2b', acTx: '#b9a3fb' },
    light: { ...lightBase, bg: '#f6f4fb', surface2: '#eeeaf8', ac: '#7c3aed', acInk: '#ffffff', acTx: '#6d28d9' }
  },
  {
    id: 'rosa', name: 'Rosa',
    dark: { ...darkBase, bg: '#160d12', surface: '#21141b', surface2: '#2c1c25', line: '#3e2834', side: '#10090d', ac: '#f472b6', acInk: '#2a0718', acTx: '#f78dc5' },
    light: { ...lightBase, bg: '#fbf4f7', surface2: '#f7e9ef', ac: '#db2777', acInk: '#ffffff', acTx: '#be185d' }
  },
  {
    id: 'grafite', name: 'Grafite',
    dark: { ...darkBase, bg: '#101010', surface: '#1a1a1a', surface2: '#242424', line: '#333333', side: '#0a0a0a', ac: '#f2f2f2', acInk: '#111111', acTx: '#ffffff' },
    light: { ...lightBase, bg: '#f5f5f5', surface2: '#ececec', line: '#dddddd', ac: '#161616', acInk: '#ffffff', acTx: '#161616' }
  }
];

export function resolveMode(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(themeId, mode) {
  const t = THEMES.find((x) => x.id === themeId) || THEMES[0];
  const m = resolveMode(mode);
  const p = t[m];
  const r = document.documentElement;
  r.dataset.mode = m;
  for (const [k, v] of Object.entries(p)) r.style.setProperty('--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', p.bg);
}
