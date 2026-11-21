import { useEffect, useRef, useState } from 'react';
import { useData } from '../store.jsx';
import { fmtDate, lastLogFor, prescription, sessionVolume } from '../model.js';
import { Empty, ExerciseModal, Icon, MethodBadge, TypeTags, go, hasMedia } from '../components/ui.jsx';

export function parseRest(v, fallback = 60) {
  if (v == null || v === '') return fallback;
  const s = String(v).trim().toLowerCase().replace(',', '.');
  let m = s.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/^([\d.]+)\s*(min|m|')/);
  if (m) return Math.round(Number(m[1]) * 60);
  m = s.match(/^([\d.]+)/);
  return m ? Math.round(Number(m[1])) : fallback;
}

const fmtClock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
};

let audioCtx;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t);
      o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch {}
}

function RestTimer({ rest, setRest, sound }) {
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [rest?.end]);
  if (!rest) return null;
  const left = (rest.end - now) / 1000;
  if (left <= 0 && !fired.current) {
    fired.current = true;
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    if (sound) beep();
  }
  const pct = Math.max(0, Math.min(100, (left / rest.total) * 100));
  return (
    <div className={'restbar' + (left <= 0 ? ' done' : '')}>
      <div className="restbar-fill" style={{ width: pct + '%' }} />
      <div className="restbar-in">
        <div>
          <div className="kl">{left > 0 ? 'Descanso' : 'Descanso concluído'}</div>
          <div className="kv">{left > 0 ? fmtClock(left) : 'Bora!'}</div>
          {rest.label && <div className="sub">{rest.label}</div>}
        </div>
        <div className="row gap6">
          {left > 0 && <button className="btn ghost sm" onClick={() => setRest({ ...rest, end: rest.end - 15000 })}>−15s</button>}
          {left > 0 && <button className="btn ghost sm" onClick={() => setRest({ ...rest, end: rest.end + 15000, total: rest.total + 15 })}>+15s</button>}
          <button className="btn sm" onClick={() => setRest(null)}>{left > 0 ? 'Pular' : 'Fechar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Session({ id }) {
  const { data, update } = useData();
  const s = data.sessions.find((x) => x.id === id);
  const [rest, setRest] = useState(null);
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (!s) return <div className="page"><Empty title="Treino não encontrado"><a className="btn" href="#/hoje">Voltar</a></Empty></div>;
  const plan = data.plans.find((p) => p.id === s.planId);
  const workout = plan?.workouts.find((w) => w.id === s.workoutId);
  if (!workout) return <div className="page"><Empty title="O treino desta sessão foi removido da planilha"><a className="btn" href="#/hoje">Voltar</a></Empty></div>;

  const mut = (fn) => update((d) => fn(d.sessions.find((x) => x.id === id)));
  const ensure = (ss, it) => {
    if (!ss.log[it.id]) ss.log[it.id] = { exerciseId: it.exerciseId, sets: Array.from({ length: Math.max(1, parseInt(it.sets, 10) || 1) }, () => ({ kg: '', reps: '', done: false })) };
    return ss.log[it.id];
  };
  const elapsed = ((s.finishedAt ? new Date(s.finishedAt).getTime() : now) - new Date(s.startedAt).getTime()) / 1000;
  let total = 0, doneCount = 0;
  for (const b of workout.blocks) for (const it of b.items) {
    const l = s.log[it.id];
    const n = l ? l.sets.length : parseInt(it.sets, 10) || 1;
    total += n;
    doneCount += l ? l.sets.filter((x) => x.done).length : 0;
  }

  const finish = () => {
    if (doneCount < total && !confirm(`Ainda há ${total - doneCount} séries não marcadas. Finalizar mesmo assim?`)) return;
    mut((ss) => {
      ss.status = 'done';
      ss.finishedAt = new Date().toISOString();
    });
    setRest(null);
    go('#/hoje');
  };
  const discard = () => {
    if (!confirm('Descartar este registro de treino?')) return;
    update((d) => (d.sessions = d.sessions.filter((x) => x.id !== id)));
    go('#/hoje');
  };

  return (
    <div className="page session">
      <div className="sess-top">
        <button className="icon-btn" onClick={() => go('#/hoje')} aria-label="Voltar"><Icon name="back" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sub">{fmtDate(s.date, { long: true })} · {plan.name}</div>
          <h1 className="ellipsis">{workout.name}{workout.subtitle ? <span className="mut"> — {workout.subtitle}</span> : null}</h1>
        </div>
        <div className="sess-clock"><Icon name="timer" size={16} /> {fmtClock(elapsed)}</div>
      </div>
      <div className="bar thick"><div style={{ width: (total ? (doneCount / total) * 100 : 0) + '%' }} /></div>
      <div className="sub" style={{ marginTop: -6 }}>{doneCount} de {total} séries · {sessionVolume(s).toLocaleString('pt-BR')} kg de volume {s.status === 'done' && '· ✓ treino concluído'}</div>

      {workout.blocks.map((b) => {
        const grouped = b.items.length > 1;
        const m = data.methods.find((x) => x.id === b.methodId);
        return (
          <section key={b.id} className={'sblk' + (grouped ? ' grouped' : '')} style={grouped ? { '--g': m?.color } : undefined}>
            <div className="blk-h">
              <span className="blk-l">{b.label}</span>
              <MethodBadge id={b.methodId} extra={b.rest ? `descanso ${b.rest}` : ''} />
              {grouped && <span className="sub">Faça em sequência; descanse ao fim da volta</span>}
            </div>
            {b.items.map((it, idx) => {
              const ex = data.exercises.find((e) => e.id === it.exerciseId);
              const log = s.log[it.id] || { sets: Array.from({ length: Math.max(1, parseInt(it.sets, 10) || 1) }, () => ({ kg: '', reps: '', done: false })) };
              const prev = lastLogFor(data, it.exerciseId, s.id);
              const unitLbl = it.unit === 's' ? 'SEG' : it.unit === 'm' ? 'METROS' : 'REPS';
              const targetReps = String(it.reps || '').split(/[-–]/)[0];
              const restSec = parseRest(it.rest || b.rest, data.settings.defaultRest);
              const isLast = idx === b.items.length - 1;
              return (
                <div key={it.id} className="sex">
                  <div className="sex-h">
                    <button className={'thumb lg' + (hasMedia(ex) ? ' has' : '')} onClick={() => setOpen(it.exerciseId)} aria-label="Ver execução">
                      <Icon name="play" size={18} fill="currentColor" stroke={0} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button className="linklike" onClick={() => setOpen(it.exerciseId)}><b>{ex?.name}</b></button>
                      <div className="sub">
                        {prescription(it)}
                        {it.load && ` · carga ${it.load}`}
                        {it.cadence && ` · cadência ${it.cadence}`}
                        {it.rir && ` · ${it.rir}`}
                        {(!grouped || isLast) && ` · desc. ${restSec}s`}
                      </div>
                      {it.notes && <div className="sub note-i">{it.notes}</div>}
                    </div>
                    <div className="hide-m"><TypeTags ids={ex?.typeIds} small /></div>
                  </div>
                  <div className="sets">
                    <div className="set head"><span>SÉRIE</span><span>ANTERIOR</span><span>KG</span><span>{unitLbl}</span><span /></div>
                    {log.sets.map((x, si) => {
                      const p = prev?.sets[si] || prev?.sets[prev.sets.length - 1];
                      const phKg = p?.kg || (String(it.load).match(/[\d.,]+/) || [''])[0];
                      const phReps = p?.reps || targetReps;
                      const setVal = (k, v) => mut((ss) => (ensure(ss, it).sets[si][k] = v));
                      return (
                        <div key={si} className={'set' + (x.done ? ' ok' : '')}>
                          <b>{si + 1}</b>
                          <span className="prev">{p ? `${p.kg || '–'}×${p.reps || '–'}` : '—'}</span>
                          <input inputMode="decimal" placeholder={phKg || '–'} value={x.kg} onChange={(e) => setVal('kg', e.target.value)} />
                          <input inputMode="decimal" placeholder={phReps || '–'} value={x.reps} onChange={(e) => setVal('reps', e.target.value)} />
                          <button
                            className={'ck' + (x.done ? ' on' : '')}
                            aria-label="Marcar série"
                            onClick={() => {
                              const willDone = !x.done;
                              mut((ss) => {
                                const st = ensure(ss, it).sets[si];
                                st.done = willDone;
                                if (willDone) {
                                  if (st.kg === '' && phKg) st.kg = phKg;
                                  if (st.reps === '' && phReps) st.reps = phReps;
                                }
                              });
                              if (willDone && (!grouped || isLast)) setRest({ end: Date.now() + restSec * 1000, total: restSec, label: ex?.name });
                            }}
                          >
                            <Icon name="check" size={18} stroke={3} />
                          </button>
                        </div>
                      );
                    })}
                    <div className="row gap6">
                      <button className="btn xs ghost" onClick={() => mut((ss) => ensure(ss, it).sets.push({ kg: '', reps: '', done: false }))}>+ série</button>
                      {log.sets.length > 1 && <button className="btn xs ghost" onClick={() => mut((ss) => ensure(ss, it).sets.pop())}>− série</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="card">
        <div className="lbl">Anotações do treino</div>
        <textarea rows={3} placeholder="Como foi o treino? Dores, sensações, ajustes…" value={s.notes} onChange={(e) => mut((ss) => (ss.notes = e.target.value))} />
      </div>
      <div className="row gap8 between wrap" style={{ marginBottom: rest ? 110 : 20 }}>
        <button className="btn ghost danger" onClick={discard}><Icon name="trash" size={16} /> Descartar</button>
        {s.status === 'done' ? (
          <button className="btn" onClick={() => go('#/hoje')}>Salvar alterações</button>
        ) : (
          <button className="btn" onClick={finish}><Icon name="check" size={18} stroke={3} /> Finalizar treino</button>
        )}
      </div>
      <RestTimer rest={rest} setRest={setRest} sound={data.settings.sound} />
      {open && <ExerciseModal exerciseId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
