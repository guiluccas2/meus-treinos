import { useEffect, useState } from 'react';
import { useData } from '../store.jsx';
import { blockLabel, getActivePlan, methodForCount, norm, planStatus, uid, UNITS, WORKOUT_COLORS, workoutStats, WEEKDAYS_LONG } from '../model.js';
import { Empty, ExerciseModal, Field, Icon, WeekdayPicker, go, hasMedia } from '../components/ui.jsx';

const AUTO = ['simples', 'biset', 'triset', 'circuito'];
const newItem = (exerciseId = '') => ({ id: uid(), exerciseId, sets: 3, reps: '10', unit: 'reps', load: '', cadence: '', rir: '', rest: '', notes: '' });

function relabel(w) {
  w.blocks = w.blocks.filter((b) => b.items.length);
  w.blocks.forEach((b, i) => {
    b.label = blockLabel(i);
    if (AUTO.includes(b.methodId)) b.methodId = methodForCount(b.items.length);
  });
}

function ExercisePicker({ value, onPick }) {
  const { data } = useData();
  const ex = data.exercises.find((e) => e.id === value);
  const [text, setText] = useState(ex?.name || '');
  useEffect(() => setText(ex?.name || ''), [ex?.name]);
  const commit = () => {
    const t = text.trim();
    if (!t) return setText(ex?.name || '');
    if (ex && norm(ex.name) === norm(t)) return;
    onPick(t);
  };
  return (
    <input
      className="expick"
      list="ex-names"
      value={text}
      placeholder="Nome do exercício"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

export default function PlanEditor({ id }) {
  const { data, update } = useData();
  const plan = data.plans.find((p) => p.id === id);
  const [wid, setWid] = useState(plan?.workouts[0]?.id);
  const [open, setOpen] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  if (!plan) return <div className="page"><Empty title="Planilha não encontrada"><a className="btn" href="#/planilhas">Voltar</a></Empty></div>;
  const w = plan.workouts.find((x) => x.id === wid) || plan.workouts[0];
  const active = getActivePlan(data)?.id === plan.id;

  const muP = (fn) => update((d) => fn(d.plans.find((p) => p.id === id), d));
  const muW = (fn) => muP((p, d) => {
    const ww = p.workouts.find((x) => x.id === w.id);
    fn(ww, d, p);
    relabel(ww);
  });
  // escolhe exercício pelo nome; cria na biblioteca se não existir
  const pickExercise = (d, name) => {
    let ex = d.exercises.find((e) => norm(e.name) === norm(name));
    if (!ex) {
      ex = { id: uid(), name: name.trim(), typeIds: [], region: '', notes: '', media: {} };
      d.exercises.push(ex);
    }
    return ex.id;
  };
  const addWorkout = () => {
    const nw = { id: uid(), name: 'Treino ' + blockLabel(plan.workouts.length), subtitle: '', color: WORKOUT_COLORS[plan.workouts.length % WORKOUT_COLORS.length], weekdays: [], blocks: [] };
    muP((p) => p.workouts.push(nw));
    setWid(nw.id);
  };

  return (
    <div className="page">
      <datalist id="ex-names">{data.exercises.map((e) => <option key={e.id} value={e.name} />)}</datalist>
      <div className="ph">
        <div style={{ flex: 1, minWidth: 0 }}>
          <a className="sub backlink" href="#/planilhas">‹ Planilhas</a>
          <input className="title-in" value={plan.name} onChange={(e) => muP((p) => (p.name = e.target.value))} aria-label="Nome da planilha" />
          <div className="sub">
            {plan.start?.split('-').reverse().join('/')} → {plan.end?.split('-').reverse().join('/')} · {plan.mode === 'rotation' ? 'Rodízio' : 'Dias fixos'} · {planStatus(plan)}
            {active ? ' · planilha ativa' : ''}
          </div>
        </div>
        <div className="row gap8 wrap">
          <button className="btn ghost" onClick={() => setShowPlan((s) => !s)}><Icon name="cal" size={18} /> Período e agenda</button>
          {!active && <button className="btn ghost" onClick={() => update((d) => (d.activePlanId = plan.id))}>Tornar ativa</button>}
        </div>
      </div>

      {showPlan && (
        <div className="card stack">
          <div className="grid3">
            <Field label="Data de início"><input type="date" value={plan.start} onChange={(e) => muP((p) => (p.start = e.target.value))} /></Field>
            <Field label="Data de fim"><input type="date" value={plan.end} onChange={(e) => muP((p) => (p.end = e.target.value))} /></Field>
            <Field label="Distribuição">
              <div className="seg">
                <button className={plan.mode !== 'rotation' ? 'on' : ''} onClick={() => muP((p) => (p.mode = 'fixed'))}>Dias fixos</button>
                <button className={plan.mode === 'rotation' ? 'on' : ''} onClick={() => muP((p) => (p.mode = 'rotation'))}>Rodízio</button>
              </div>
            </Field>
          </div>
          <Field label="Contar faltas a partir de" hint="Dias anteriores sem registro aparecem como não registrados, sem contar como falta.">
            <input type="date" value={plan.trackFrom || ''} onChange={(e) => muP((p) => (p.trackFrom = e.target.value || null))} />
          </Field>
          {plan.mode === 'rotation' ? (
            <Field label="Dias de treino (rodízio)" hint="A sequência segue a ordem das abas abaixo e só avança quando você conclui um treino.">
              <WeekdayPicker value={plan.rotationDays || []} onChange={(v) => muP((p) => (p.rotationDays = v))} />
            </Field>
          ) : (
            <div className="stack">
              {plan.workouts.map((x) => (
                <div key={x.id} className="row between wrap gap8">
                  <span><i className="cdot" style={{ background: x.color }} /> <b>{x.name}</b> <span className="sub">{(x.weekdays || []).map((d) => WEEKDAYS_LONG[d]).join(', ') || 'sem dia definido'}</span></span>
                  <WeekdayPicker value={x.weekdays || []} onChange={(v) => muP((p) => (p.workouts.find((y) => y.id === x.id).weekdays = v))} />
                </div>
              ))}
            </div>
          )}
          <Field label="Observações da planilha"><textarea rows={2} value={plan.notes || ''} onChange={(e) => muP((p) => (p.notes = e.target.value))} /></Field>
        </div>
      )}

      <div className="tabs">
        {plan.workouts.map((x) => (
          <button key={x.id} className={'tab' + (x.id === w?.id ? ' on' : '')} onClick={() => setWid(x.id)} style={{ '--w': x.color }}>
            <i className="cdot" style={{ background: x.color }} /> {x.name}
            {plan.mode !== 'rotation' && x.weekdays?.length ? <small> · {x.weekdays.map((d) => WEEKDAYS_LONG[d].slice(0, 3)).join('/')}</small> : null}
          </button>
        ))}
        <button className="tab add" onClick={addWorkout}><Icon name="plus" size={16} /> Treino</button>
      </div>

      {!w ? (
        <Empty title="Sem treinos nesta planilha"><button className="btn" onClick={addWorkout}>Adicionar treino</button></Empty>
      ) : (
        <>
          <div className="card wset">
            <div className="grid-w">
              <Field label="Nome do treino"><input value={w.name} onChange={(e) => muW((ww) => (ww.name = e.target.value))} /></Field>
              <Field label="Foco / descrição"><input value={w.subtitle || ''} placeholder="ex.: Força, Potência…" onChange={(e) => muW((ww) => (ww.subtitle = e.target.value))} /></Field>
              <Field label="Cor">
                <div className="swatches">
                  {WORKOUT_COLORS.map((c) => <button key={c} className={w.color === c ? 'on' : ''} style={{ background: c }} onClick={() => muW((ww) => (ww.color = c))} aria-label={c} />)}
                </div>
              </Field>
              {plan.mode !== 'rotation' && (
                <Field label="Dias da semana"><WeekdayPicker value={w.weekdays || []} onChange={(v) => muW((ww) => (ww.weekdays = v))} /></Field>
              )}
            </div>
            <div className="row gap6 wrap" style={{ marginTop: 10 }}>
              <span className="sub" style={{ marginRight: 'auto' }}>{workoutStats(w).ex} exercícios · {workoutStats(w).sets} séries · {w.blocks.length} blocos</span>
              <button className="btn xs ghost" onClick={() => muP((p) => {
                const i = p.workouts.findIndex((x) => x.id === w.id);
                if (i > 0) [p.workouts[i - 1], p.workouts[i]] = [p.workouts[i], p.workouts[i - 1]];
              })}>← Mover</button>
              <button className="btn xs ghost" onClick={() => muP((p) => {
                const i = p.workouts.findIndex((x) => x.id === w.id);
                if (i < p.workouts.length - 1) [p.workouts[i + 1], p.workouts[i]] = [p.workouts[i], p.workouts[i + 1]];
              })}>Mover →</button>
              <button className="btn xs ghost" onClick={() => {
                const c = structuredClone(w);
                c.id = uid();
                c.name = w.name + ' (cópia)';
                c.blocks.forEach((b) => { b.id = uid(); b.items.forEach((it) => (it.id = uid())); });
                muP((p) => p.workouts.push(c));
                setWid(c.id);
              }}><Icon name="copy" size={14} /> Duplicar</button>
              <button className="btn xs ghost danger" onClick={() => {
                if (!confirm(`Excluir "${w.name}"?`)) return;
                muP((p) => (p.workouts = p.workouts.filter((x) => x.id !== w.id)));
                setWid(plan.workouts.find((x) => x.id !== w.id)?.id);
              }}><Icon name="trash" size={14} /> Excluir</button>
            </div>
          </div>

          <div className="ihead hide-m">
            <span>Exercício</span><span>Séries</span><span>Reps/tempo</span><span>Unid.</span><span>Carga</span><span>Cadência</span><span>RIR/RPE</span><span>Desc.</span><span>Obs.</span><span />
          </div>
          {w.blocks.map((b, bi) => {
            const m = data.methods.find((x) => x.id === b.methodId);
            const grouped = b.items.length > 1;
            return (
              <section key={b.id} className={'eblk' + (grouped ? ' grouped' : '')} style={{ '--g': grouped ? m?.color : 'var(--line)' }}>
                <div className="eblk-h">
                  <span className="blk-l">{b.label}</span>
                  <select value={b.methodId} onChange={(e) => muW((ww) => (ww.blocks[bi].methodId = e.target.value))} title={m?.desc}>
                    {data.methods.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <input className="sm-in" placeholder="Descanso" value={b.rest || ''} onChange={(e) => muW((ww) => (ww.blocks[bi].rest = e.target.value))} title="Descanso do bloco (ex.: 60s, 1:30, 2min)" />
                  <span className="grow" />
                  {bi > 0 && <button className="btn xs ghost" title="Juntar com o bloco de cima (ex.: formar biset)" onClick={() => muW((ww) => {
                    ww.blocks[bi - 1].items.push(...ww.blocks[bi].items);
                    ww.blocks[bi].items = [];
                  })}><Icon name="up" size={13} /> Juntar acima</button>}
                  <button className="icon-btn sm" title="Mover bloco para cima" onClick={() => muW((ww) => bi > 0 && ([ww.blocks[bi - 1], ww.blocks[bi]] = [ww.blocks[bi], ww.blocks[bi - 1]]))}><Icon name="up" size={16} /></button>
                  <button className="icon-btn sm" title="Mover bloco para baixo" onClick={() => muW((ww) => bi < ww.blocks.length - 1 && ([ww.blocks[bi + 1], ww.blocks[bi]] = [ww.blocks[bi], ww.blocks[bi + 1]]))}><Icon name="down" size={16} /></button>
                  <button className="icon-btn sm danger" title="Excluir bloco" onClick={() => confirm('Excluir este bloco?') && muW((ww) => (ww.blocks[bi].items = []))}><Icon name="trash" size={16} /></button>
                </div>
                {b.items.map((it, ii) => {
                  const ex = data.exercises.find((e) => e.id === it.exerciseId);
                  const set = (k, v) => muW((ww) => (ww.blocks[bi].items[ii][k] = v));
                  return (
                    <div key={it.id} className="irow">
                      <div className="ic-ex">
                        <button className={'thumb' + (hasMedia(ex) ? ' has' : '')} onClick={() => ex && setOpen(ex.id)} title="Ver execução"><Icon name="play" size={13} fill="currentColor" stroke={0} /></button>
                        <ExercisePicker value={it.exerciseId} onPick={(name) => muW((ww, d) => (ww.blocks[bi].items[ii].exerciseId = pickExercise(d, name)))} />
                      </div>
                      <label><span className="ml">Séries</span><input inputMode="numeric" value={it.sets} onChange={(e) => set('sets', e.target.value)} /></label>
                      <label><span className="ml">Reps/tempo</span><input value={it.reps} onChange={(e) => set('reps', e.target.value)} placeholder="8-10" /></label>
                      <label><span className="ml">Unid.</span>
                        <select value={it.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select>
                      </label>
                      <label><span className="ml">Carga</span><input value={it.load} onChange={(e) => set('load', e.target.value)} placeholder="—" /></label>
                      <label><span className="ml">Cadência</span><input value={it.cadence} onChange={(e) => set('cadence', e.target.value)} placeholder="—" /></label>
                      <label><span className="ml">RIR/RPE</span><input value={it.rir} onChange={(e) => set('rir', e.target.value)} placeholder="—" /></label>
                      <label><span className="ml">Desc.</span><input value={it.rest} onChange={(e) => set('rest', e.target.value)} placeholder={b.rest || '—'} /></label>
                      <label className="ic-obs"><span className="ml">Observações</span><input value={it.notes} onChange={(e) => set('notes', e.target.value)} /></label>
                      <div className="ic-act">
                        <button className="icon-btn sm" title="Subir" onClick={() => muW((ww) => {
                          const its = ww.blocks[bi].items;
                          if (ii > 0) [its[ii - 1], its[ii]] = [its[ii], its[ii - 1]];
                        })}><Icon name="up" size={15} /></button>
                        <button className="icon-btn sm" title="Descer" onClick={() => muW((ww) => {
                          const its = ww.blocks[bi].items;
                          if (ii < its.length - 1) [its[ii + 1], its[ii]] = [its[ii], its[ii + 1]];
                        })}><Icon name="down" size={15} /></button>
                        {grouped && <button className="icon-btn sm" title="Separar em bloco próprio" onClick={() => muW((ww) => {
                          const [moved] = ww.blocks[bi].items.splice(ii, 1);
                          ww.blocks.splice(bi + 1, 0, { id: uid(), label: '', methodId: 'simples', rest: '', items: [moved] });
                        })}><Icon name="link2" size={15} /></button>}
                        <button className="icon-btn sm danger" title="Remover" onClick={() => muW((ww) => ww.blocks[bi].items.splice(ii, 1))}><Icon name="x" size={15} /></button>
                      </div>
                    </div>
                  );
                })}
                <button className="btn xs ghost addin" onClick={() => muW((ww) => ww.blocks[bi].items.push(newItem()))}><Icon name="plus" size={14} /> Exercício neste bloco ({grouped ? m?.name : 'vira biset'})</button>
              </section>
            );
          })}
          <button className="btn add-block" onClick={() => muW((ww) => ww.blocks.push({ id: uid(), label: '', methodId: 'simples', rest: '', items: [newItem()] }))}>
            <Icon name="plus" size={18} /> Novo bloco
          </button>
          <p className="sub" style={{ textAlign: 'center' }}>Dica: blocos com 2 exercícios viram biset, 3 viram triset, 4+ circuito — ou escolha outro método na lista. Tudo é salvo automaticamente.</p>
        </>
      )}
      {open && <ExerciseModal exerciseId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
