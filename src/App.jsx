import { useEffect } from 'react';
import { useData } from './store.jsx';
import { applyTheme } from './themes.js';
import { Icon, useHashRoute } from './components/ui.jsx';
import Today from './pages/Today.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Plans from './pages/Plans.jsx';
import PlanEditor from './pages/PlanEditor.jsx';
import Session from './pages/Session.jsx';
import Library from './pages/Library.jsx';
import ExerciseEditor from './pages/ExerciseEditor.jsx';
import Progress from './pages/Progress.jsx';
import Settings from './pages/Settings.jsx';

const NAV = [
  ['hoje', 'Hoje', 'home'],
  ['calendario', 'Calendário', 'cal'],
  ['planilhas', 'Planilhas', 'list'],
  ['exercicios', 'Exercícios', 'dumbbell'],
  ['evolucao', 'Evolução', 'chart'],
  ['config', 'Ajustes', 'gear']
];
const SECTION = { planilha: 'planilhas', exercicio: 'exercicios', treino: 'hoje' };

export function SyncBadge({ compact }) {
  const { sync, syncNow } = useData();
  const color = { saved: 'var(--ok)', saving: 'var(--warn)', pending: 'var(--warn)', pulling: 'var(--warn)', error: 'var(--bad)', offline: 'var(--mut)', local: 'var(--mut)', idle: 'var(--mut)' }[sync.state];
  const when = sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
  if (compact)
    return (
      <button className="sync-dot" onClick={syncNow} title={sync.msg}>
        <i style={{ background: color }} />
        <span>{sync.state === 'saved' ? 'Salvo' : sync.state === 'local' ? 'Local' : sync.state === 'error' ? 'Erro' : sync.state === 'offline' ? 'Offline' : 'Salvando'}</span>
      </button>
    );
  return (
    <button className="sync-box" onClick={syncNow} title="Sincronizar agora">
      <b style={{ color }}>● {sync.msg || 'Pronto'}</b>
      {sync.state === 'local' ? <span>Conecte o GitHub em Ajustes para salvar na nuvem</span> : when && <span>Última sincronização às {when}</span>}
    </button>
  );
}

export default function App() {
  const { data } = useData();
  const route = useHashRoute();
  const { theme, mode } = data.settings;

  useEffect(() => {
    applyTheme(theme, mode);
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const f = () => applyTheme(theme, mode);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [theme, mode]);

  const section = SECTION[route.page] || route.page;
  const inSession = route.page === 'treino';
  let page;
  switch (route.page) {
    case 'calendario': page = <CalendarPage />; break;
    case 'planilhas': page = <Plans />; break;
    case 'planilha': page = <PlanEditor id={route.id} />; break;
    case 'treino': page = <Session id={route.id} />; break;
    case 'exercicios': page = <Library />; break;
    case 'exercicio': page = <ExerciseEditor id={route.id} />; break;
    case 'evolucao': page = <Progress />; break;
    case 'config': page = <Settings />; break;
    default: page = <Today />;
  }

  return (
    <div className={'app' + (inSession ? ' in-session' : '')}>
      <aside className="side">
        <a className="logo" href="#/hoje">Meus <b>Treinos</b></a>
        <nav>
          {NAV.map(([id, label, icon]) => (
            <a key={id} href={'#/' + id} className={'nav' + (section === id ? ' on' : '')}>
              <Icon name={icon} size={19} /> {label}
            </a>
          ))}
        </nav>
        <SyncBadge />
      </aside>
      <header className="mtop">
        <a className="logo" href="#/hoje">Meus <b>Treinos</b></a>
        <div className="row gap6">
          <SyncBadge compact />
          <a className="icon-btn" href="#/config" aria-label="Ajustes"><Icon name="gear" /></a>
        </div>
      </header>
      <main className="main">{page}</main>
      {!inSession && (
        <nav className="tabbar">
          {NAV.slice(0, 5).map(([id, label, icon]) => (
            <a key={id} href={'#/' + id} className={section === id ? 'on' : ''}>
              <Icon name={icon} size={22} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
