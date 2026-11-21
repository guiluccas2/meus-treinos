import { useMemo, useState } from 'react';
import { useData } from '../store.jsx';
import {
  addDays, buildSchedule, daysBetween, fmtDate, getActivePlan, newSession, nextRotationWorkout, sessionVolume,
  startOfWeek, todayISO, weekday, workoutStats, WEEKDAYS, parseISO
} from '../model.js';
import { Empty, Icon, go } from '../components/ui.jsx';
import WorkoutPreview from '../components/WorkoutPreview.jsx';

export function planStats(plan, sched, sessions, today) {
  let planned = 0, done = 0;
  for (const [iso, es] of sched) {
    if (iso > today) continue;
    for (const e of es) {
      if (e.extra) continue;
      if (e.status === 'today' || e.status === 'unlogged') continue;
      planned++;
      if (e.status === 'done') done++;
    }
  }
  // sequência: treinos previstos concluídos seguidos, do mais recente para trás
  let streak = 0;
  const days = [...sched.keys()].filter((d) => d <= today).sort().reverse();
  outer: for (const d of days)
    for (const e of sched.get(d)) {
      if (e.status === 'today' || e.extra) continue;
      if (e.status === 'unlogged') break outer;
      if (e.status === 'done') streak++;
      else break outer;
    }
  const ws = startOfWeek(today);
  const vol = sessions.filter((s) => s.date >= ws && s.date <= today).reduce((a, s) => a + sessionVolume(s), 0);
  const totalDays = daysBetween(plan.start, plan.end) + 1;
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(plan.start, today) + 1));
  return {
    planned, done, streak, vol,
    pct: totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0,
    week: Math.min(Math.ceil(totalDays / 7), Math.max(1, Math.floor(daysBetween(plan.start, today) / 7) + 1)),
    weeks: Math.ceil(totalDays / 7),
    left: Math.max(0, daysBetween(today, plan.end))
  };
}

export function useStartWorkout() {
  const { update } = useData();
  return (plan, workout, date) => {
    const s = newSession(plan, workout, date);
    update((d) => d.sessions.push(s));
    go('#/treino/' + s.id);
  };
}

export default function Today() {
  const { data } = useData();
  const today = todayISO();
  const plan = getActivePlan(data, today);
  const [sel, setSel] = useState(today);
  const start = useStartWorkout();
  const sched = useMemo(() => (plan ? buildSchedule(plan, data.sessions, today) : new Map()), [plan, data.sessions, today]);
  const inProgress = data.sessions.filter((s) => s.status === 'in_progress').sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

  if (!plan)
    return (
      <div className="page">
        <Empty title="Bem-vindo ao Meus Treinos">
          <p>Comece importando sua planilha do Word ou criando uma do zero.</p>
          <div className="row gap8 center wrap">
            <a className="btn" href="#/planilhas/importar"><Icon name="upload" size={18} /> Importar do Word</a>
            <a className="btn ghost" href="#/planilhas/nova"><Icon name="plus" size={18} /> Criar planilha</a>
          </div>
        </Empty>
      </div>
    );

  const st = planStats(plan, sched, data.sessions, today);
  const ws = startOfWeek(sel);
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const entries = sched.get(sel) || [];
  const wById = (id) => plan.workouts.find((w) => w.id === id);
  const todayEntry = (sched.get(today) || []).find((e) => e.workoutId && e.status !== 'done');
  const headline = todayEntry ? wById(todayEntry.workoutId) : null;
  const rotationNext = plan.mode === 'rotation' ? wById(nextRotationWorkout(plan, data.sessions)) : null;
  const nextUp = (() => {
    const from = sel >= today ? sel : today;
    const keys = [...sched.keys()].filter((k) => k > from).sort();
    for (const k of keys) {
      const e = sched.get(k).find((x) => x.workoutId && (x.status === 'planned' || x.status === 'today'));
      if (e) return { date: k, workout: wById(e.workoutId) };
    }
    return null;
  })();
  const h = new Date().getHours();
  const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="sub">{fmtDate(today, { long: true })} · {plan.name}</div>
          <h1>
            {hello}!{' '}
            {headline ? <>Hoje é dia de <span className="ac-tx">{headline.name}</span></> : sched.get(today)?.some((e) => e.status === 'done') ? 'Treino de hoje concluído ✓' : 'Hoje é dia de descanso'}
          </h1>
        </div>
        <div className="row gap8 hide-m">
          <a className="btn ghost" href="#/planilhas/importar"><Icon name="upload" size={18} /> Importar</a>
          <a className="btn ghost" href={'#/planilha/' + plan.id}><Icon name="edit" size={18} /> Editar planilha</a>
        </div>
      </div>

      {inProgress && (
        <button className="banner" onClick={() => go('#/treino/' + inProgress.id)}>
          <Icon name="timer" /> <span>Treino em andamento: <b>{plan.workouts.find((w) => w.id === inProgress.workoutId)?.name || 'treino'}</b></span>
          <span className="btn sm">Continuar</span>
        </button>
      )}

      <div className="kpis">
        <div className="card kpi">
          <div className="kl">Período da planilha</div>
          <div className="kv sm">{fmtDate(plan.start)} → {fmtDate(plan.end)}</div>
          <div className="bar"><div style={{ width: st.pct + '%' }} /></div>
          <div className="sub">Semana {st.week} de {st.weeks} · faltam {st.left} dias</div>
        </div>
        <div className="card kpi">
          <div className="kl">Treinos concluídos</div>
          <div className="kv">{st.done} <small>/ {st.planned} previstos</small></div>
          <div className="sub">{st.planned ? Math.round((st.done / st.planned) * 100) : 100}% de aderência</div>
        </div>
        <div className="card kpi">
          <div className="kl">Sequência</div>
          <div className="kv">{st.streak} <Icon name="fire" size={22} /></div>
          <div className="sub">treinos seguidos sem faltar</div>
        </div>
        <div className="card kpi">
          <div className="kl">Volume da semana</div>
          <div className="kv">{st.vol.toLocaleString('pt-BR')} <small>kg</small></div>
          <div className="sub">carga × repetições</div>
        </div>
      </div>

      <div className="strip">
        {week.map((iso) => {
          const es = sched.get(iso) || [];
          return (
            <button key={iso} className={'sd' + (iso === sel ? ' on' : '') + (iso === today ? ' today' : '')} onClick={() => setSel(iso)}>
              <span>{WEEKDAYS[weekday(iso)].toUpperCase()}</span>
              <b>{parseISO(iso).getDate()}</b>
              <span className="dots">
                {es.length ? es.map((e, i) => (
                  <i key={i} className={e.status} style={{ background: e.workoutId ? wById(e.workoutId)?.color : undefined }} />
                )) : <i className="none" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="row gap8 between weeknav" style={{ marginTop: -4 }}>
        <button className="btn sm ghost" onClick={() => setSel(addDays(sel, -7))}>‹ Anterior</button>
        {sel !== today && <button className="btn sm ghost" onClick={() => setSel(today)}>Hoje</button>}
        <button className="btn sm ghost" onClick={() => setSel(addDays(sel, 7))}>Próxima ›</button>
      </div>

      <div className="day-list">
        {sel !== today && <h2 className="day-title">{fmtDate(sel, { long: true })}</h2>}
        {entries.length === 0 && (
          <div className="card rest">
            <b>{sel < plan.start || sel > plan.end ? 'Fora do período da planilha' : 'Dia de descanso'}</b>
            {rotationNext && sel === today && <p className="sub">Próximo treino do rodízio: <b>{rotationNext.name}</b></p>}
          </div>
        )}
        {entries.length === 0 && nextUp && (
          <div className="card wcard" style={{ '--w': nextUp.workout.color }}>
            <div className="wcard-h">
              <div className="wdot">{nextUp.workout.name.replace(/\D/g, '').slice(0, 2) || nextUp.workout.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div className="kl">Próximo treino</div>
                <h2>{nextUp.workout.name}{nextUp.workout.subtitle ? <span className="mut"> — {nextUp.workout.subtitle}</span> : null}</h2>
                <div className="sub">{fmtDate(nextUp.date, { long: true })}</div>
              </div>
              <button className="btn ghost" onClick={() => setSel(nextUp.date)}>Ver dia</button>
              <button className="btn" onClick={() => start(plan, nextUp.workout, sel <= today ? sel : today)}>Fazer {sel === today ? 'hoje' : 'agora'}</button>
            </div>
            <WorkoutPreview workout={nextUp.workout} />
          </div>
        )}
        {entries.map((e, i) => {
          const w = e.workoutId ? wById(e.workoutId) : null;
          if (!w)
            return (
              <div key={i} className="card rest"><b>Treino não realizado</b><p className="sub">Dia de treino do rodízio sem registro.</p></div>
            );
          const s = workoutStats(w);
          const session = e.sessionId && data.sessions.find((x) => x.id === e.sessionId);
          return (
            <div key={i} className="card wcard" style={{ '--w': w.color }}>
              <div className="wcard-h">
                <div className="wdot">{w.name.replace(/\D/g, '').slice(0, 2) || w.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <h2>{w.name}{w.subtitle ? <span className="mut"> — {w.subtitle}</span> : null}</h2>
                  <div className="row gap6 wrap">
                    <span className="tag neutral">{s.ex} exercícios</span>
                    <span className="tag neutral">{s.sets} séries</span>
                    <span className="tag neutral">{s.blocks} blocos</span>
                    {e.status === 'done' && <span className="tag" style={{ '--c': 'var(--ok)' }}>✓ Concluído</span>}
                    {e.status === 'missed' && <span className="tag" style={{ '--c': 'var(--bad)' }}>✕ Não realizado</span>}
                    {e.status === 'partial' && <span className="tag" style={{ '--c': 'var(--warn)' }}>Em andamento</span>}
                  </div>
                </div>
                {session ? (
                  <a className="btn ghost" href={'#/treino/' + session.id}>{session.status === 'done' ? 'Ver registro' : 'Continuar'}</a>
                ) : sel <= today ? (
                  <button className="btn" onClick={() => start(plan, w, sel)}><Icon name="play" size={16} fill="currentColor" stroke={0} /> {sel === today ? 'Iniciar' : 'Registrar'}</button>
                ) : (
                  <button className="btn ghost" onClick={() => start(plan, w, today)}>Fazer hoje</button>
                )}
              </div>
              {session?.status === 'done' && (
                <div className="sub" style={{ margin: '0 0 8px' }}>Volume: {sessionVolume(session).toLocaleString('pt-BR')} kg{session.notes ? ' · ' + session.notes : ''}</div>
              )}
              <WorkoutPreview workout={w} />
            </div>
          );
        })}
        <details className="card other">
          <summary>Fazer outro treino {sel === today ? 'hoje' : `em ${fmtDate(sel)}`}</summary>
          <div className="row gap8 wrap" style={{ marginTop: 10 }}>
            {plan.workouts.map((w) => (
              <button key={w.id} className="btn ghost" onClick={() => start(plan, w, sel <= today ? sel : today)}>
                <i className="cdot" style={{ background: w.color }} /> {w.name}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
