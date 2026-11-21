import { useMemo, useState } from 'react';
import { useData } from '../store.jsx';
import { addDays, buildSchedule, fmtDate, getActivePlan, MONTHS, parseISO, todayISO, toISO, sessionVolume, WEEKDAYS } from '../model.js';
import { Empty, Icon } from '../components/ui.jsx';
import WorkoutPreview from '../components/WorkoutPreview.jsx';
import { planStats, useStartWorkout } from './Today.jsx';

export default function CalendarPage() {
  const { data } = useData();
  const today = todayISO();
  const active = getActivePlan(data, today);
  const [planId, setPlanId] = useState(active?.id);
  const plan = data.plans.find((p) => p.id === planId) || active;
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const start = useStartWorkout();
  const sched = useMemo(() => (plan ? buildSchedule(plan, data.sessions, today) : new Map()), [plan, data.sessions, today]);
  if (!plan) return <div className="page"><Empty title="Nenhuma planilha ainda" icon="cal"><a className="btn" href="#/planilhas/importar">Importar do Word</a></Empty></div>;

  const first = parseISO(month + '-01');
  const gridStart = addDays(month + '-01', -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const shift = (n) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(toISO(d).slice(0, 7));
  };
  const wById = (id) => plan.workouts.find((w) => w.id === id);
  const st = planStats(plan, sched, data.sessions, today);
  const entries = sched.get(sel) || [];

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Calendário</h1>
          <div className="sub">{plan.mode === 'rotation' ? 'Modo rodízio — a sequência avança só quando você treina' : 'Dias fixos da semana'}</div>
        </div>
        {data.plans.length > 1 && (
          <select value={plan.id} onChange={(e) => setPlanId(e.target.value)}>
            {data.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>
      <div className="cal-layout">
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="back" /></button>
            <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{MONTHS[first.getMonth()]} {first.getFullYear()}</h2>
            <button className="icon-btn flip" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="back" /></button>
          </div>
          <div className="cal">
            {WEEKDAYS.map((w) => <div key={w} className="cal-h">{w}</div>)}
            {days.map((iso) => {
              const es = sched.get(iso) || [];
              const out = iso.slice(0, 7) !== month;
              const inPlan = iso >= plan.start && iso <= plan.end;
              return (
                <button key={iso} className={'day' + (out ? ' out' : '') + (iso === today ? ' today' : '') + (iso === sel ? ' sel' : '') + (inPlan ? ' inplan' : '')} onClick={() => setSel(iso)}>
                  <span className="dn">{parseISO(iso).getDate()}</span>
                  {es.some((e) => e.status === 'done') && <span className="st ok">✓</span>}
                  {es.some((e) => e.status === 'missed') && <span className="st bad">✕</span>}
                  <span className="chips">
                    {es.map((e, i) => {
                      const w = wById(e.workoutId);
                      return (
                        <span key={i} className={'wchip ' + e.status} style={{ '--w': w?.color || 'var(--mut)' }}>
                          <span className="full">{w ? w.name : 'Falta'}</span>
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="legend">
            {plan.workouts.map((w) => <span key={w.id}><i className="cdot" style={{ background: w.color }} />{w.name}</span>)}
            <span><b className="ok-tx">✓</b> feito</span>
            <span><b className="bad-tx">✕</b> não realizado</span>
          </div>
        </div>
        <div className="cal-side">
          <div className="card">
            <div className="kl">Planilha</div>
            <b>{plan.name}</b>
            <div className="bar"><div style={{ width: st.pct + '%' }} /></div>
            <div className="sub">{fmtDate(plan.start, { year: true })} → {fmtDate(plan.end, { year: true })} · {st.done}/{st.planned} treinos feitos</div>
          </div>
          <h2 className="day-title">{fmtDate(sel, { long: true })}</h2>
          {!entries.length && <div className="card rest"><b>Sem treino previsto</b></div>}
          {entries.map((e, i) => {
            const w = wById(e.workoutId);
            const session = e.sessionId && data.sessions.find((x) => x.id === e.sessionId);
            if (!w) return <div key={i} className="card rest"><b>Treino não realizado</b></div>;
            return (
              <div key={i} className="card wcard" style={{ '--w': w.color }}>
                <div className="wcard-h">
                  <div className="wdot">{w.name.replace(/\D/g, '').slice(0, 2) || w.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <h2>{w.name}</h2>
                    <div className="sub">
                      {e.status === 'done' ? `✓ Concluído · ${sessionVolume(session).toLocaleString('pt-BR')} kg` : e.status === 'missed' ? '✕ Não realizado' : e.status === 'partial' ? 'Em andamento' : 'Previsto'}
                    </div>
                  </div>
                  {session ? (
                    <a className="btn ghost sm" href={'#/treino/' + session.id}>Abrir</a>
                  ) : (
                    <button className="btn sm" onClick={() => start(plan, w, sel <= today ? sel : today)}>{sel < today ? 'Registrar' : sel === today ? 'Iniciar' : 'Fazer hoje'}</button>
                  )}
                </div>
                <WorkoutPreview workout={w} compact />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
