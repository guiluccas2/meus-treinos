import { useState } from 'react';
import { useData } from '../store.jsx';
import { addDays, daysBetween, fmtDate, getActivePlan, planStatus, todayISO, uid, WORKOUT_COLORS, workoutStats, WEEKDAYS_LONG } from '../model.js';
import { applyDraft, datesFromName, docxToText, parsePlanText } from '../importDocx.js';
import { Empty, Field, Icon, Modal, WeekdayPicker, go, useHashRoute } from '../components/ui.jsx';

const SUGGEST = { 1: [[1]], 2: [[1], [4]], 3: [[1], [3], [5]], 4: [[1], [2], [4], [5]], 5: [[1], [2], [3], [4], [5]], 6: [[1], [2], [3], [4], [5], [6]] };

function ImportModal({ onClose }) {
  const { data, update } = useData();
  const [draft, setDraft] = useState(null);
  const [opts, setOpts] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');

  const load = (text, fileName = '') => {
    const d = parsePlanText(text, data);
    if (!d.workouts.length) {
      setErr('Não encontrei exercícios. O formato esperado é uma linha por exercício, ex.: "A. Mobilidade – Gato/camelo – 1x6".');
      return;
    }
    const dates = datesFromName(fileName);
    const today = todayISO();
    const n = d.workouts.length;
    setDraft(d);
    setOpts({
      name: fileName ? fileName.replace(/\.docx?$/i, '').replace(/^[0-9a-f]{8}-/, '').replace(/[_]+/g, ' ').trim() : 'Nova planilha',
      trackFrom: today,
      start: dates.start || today,
      end: dates.end || addDays(today, 41),
      mode: 'fixed',
      rotationDays: [1, 3, 5],
      weekdays: SUGGEST[n] || d.workouts.map((_, i) => [(i % 6) + 1])
    });
    setErr('');
  };

  const onFile = async (f) => {
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      load(await docxToText(f), f.name);
    } catch (e) {
      setErr('Não foi possível ler o arquivo: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = () => {
    let planId;
    update((d) => {
      planId = applyDraft(d, draft, opts).id;
    });
    onClose();
    go('#/planilha/' + planId);
  };

  return (
    <Modal
      title="Importar planilha"
      onClose={onClose}
      wide
      footer={draft && (
        <>
          <button className="btn ghost" onClick={() => setDraft(null)}>Voltar</button>
          <button className="btn" onClick={confirmImport} disabled={!opts.name || !opts.start || !opts.end}>Criar planilha</button>
        </>
      )}
    >
      {!draft && (
        <>
          <label className="drop">
            <Icon name="upload" size={30} />
            <b>{busy ? 'Lendo arquivo…' : 'Escolha o arquivo do Word (.docx)'}</b>
            <span className="sub">Cada linha: letra do bloco, tipo, exercício e séries × repetições. Ex.: “E. Força MMII – Step-up – 4x6-8”</span>
            <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => onFile(e.target.files[0])} hidden />
          </label>
          <details style={{ marginTop: 12 }}>
            <summary className="sub">Ou cole o texto da planilha</summary>
            <textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Treino 1 – FORÇA\nA. Mobilidade – Gato/camelo – 1x6\n…'} />
            <button className="btn sm" style={{ marginTop: 8 }} onClick={() => load(paste)} disabled={!paste.trim()}>Ler texto</button>
          </details>
          {err && <div className="note err">{err}</div>}
        </>
      )}
      {draft && (
        <div className="stack">
          <div className="grid2">
            <Field label="Nome da planilha" className="span2"><input value={opts.name} onChange={(e) => setOpts({ ...opts, name: e.target.value })} /></Field>
            <Field label="Data de início"><input type="date" value={opts.start} onChange={(e) => setOpts({ ...opts, start: e.target.value })} /></Field>
            <Field label="Data de fim"><input type="date" value={opts.end} onChange={(e) => setOpts({ ...opts, end: e.target.value })} /></Field>
          </div>
          <Field label="Como os treinos se distribuem na semana?">
            <div className="seg">
              <button className={opts.mode === 'fixed' ? 'on' : ''} onClick={() => setOpts({ ...opts, mode: 'fixed' })}>Dias fixos</button>
              <button className={opts.mode === 'rotation' ? 'on' : ''} onClick={() => setOpts({ ...opts, mode: 'rotation' })}>Rodízio (A→B→C…)</button>
            </div>
          </Field>
          <Field label="Contar faltas a partir de" hint="Dias anteriores sem registro não contam como falta (útil ao importar uma planilha já em andamento).">
            <input type="date" value={opts.trackFrom || ''} onChange={(e) => setOpts({ ...opts, trackFrom: e.target.value })} />
          </Field>
          {opts.mode === 'rotation' && (
            <Field label="Dias em que você treina" hint="No rodízio, se faltar um dia, o próximo treino continua sendo o mesmo.">
              <WeekdayPicker value={opts.rotationDays} onChange={(v) => setOpts({ ...opts, rotationDays: v })} />
            </Field>
          )}
          <div className="stack">
            {draft.workouts.map((w, i) => {
              const blocks = [...new Set(w.items.map((x) => x.letter))];
              return (
                <div key={i} className="card imp-w" style={{ '--w': WORKOUT_COLORS[i % WORKOUT_COLORS.length] }}>
                  <div className="row between wrap gap8">
                    <div>
                      <b>{w.name}</b>{w.subtitle && <span className="mut"> — {w.subtitle}</span>}
                      <div className="sub">{w.items.length} exercícios em {blocks.length} blocos ({blocks.join(', ')})</div>
                    </div>
                    {opts.mode === 'fixed' && (
                      <WeekdayPicker value={opts.weekdays[i] || []} onChange={(v) => {
                      const ws = [...opts.weekdays];
                      ws[i] = v;
                      setOpts({ ...opts, weekdays: ws });
                    }} />
                    )}
                  </div>
                  {opts.mode === 'fixed' && (
                    <div className="sub" style={{ marginTop: 4 }}>
                      {(opts.weekdays[i] || []).length ? (opts.weekdays[i] || []).map((d) => WEEKDAYS_LONG[d]).join(', ') : 'Escolha o(s) dia(s) da semana'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {draft.newTypes.length > 0 && <div className="note">Novos tipos de exercício serão criados: <b>{draft.newTypes.map((t) => t.name).join(', ')}</b>. Você pode mudar cores e nomes em Ajustes.</div>}
          {draft.warnings.map((w, i) => <div key={i} className="note warn">{w}</div>)}
          <div className="note">Blocos com 2 exercícios viram <b>biset</b>, 3 viram <b>triset</b> e 4 ou mais viram <b>circuito</b>. Tudo pode ser ajustado depois no editor.</div>
        </div>
      )}
    </Modal>
  );
}

export function clonePlan(p, start) {
  const dur = daysBetween(p.start, p.end);
  const c = structuredClone(p);
  c.id = uid();
  c.name = p.name + ' (cópia)';
  c.start = start;
  c.end = addDays(start, dur);
  for (const w of c.workouts) {
    w.id = uid();
    for (const b of w.blocks) {
      b.id = uid();
      for (const it of b.items) it.id = uid();
    }
  }
  return c;
}

export default function Plans() {
  const { data, update } = useData();
  const route = useHashRoute();
  const active = getActivePlan(data);
  const today = todayISO();

  const createBlank = () => {
    const p = {
      id: uid(),
      name: 'Nova planilha',
      start: today,
      end: addDays(today, 41),
      mode: 'fixed',
      rotationDays: [1, 3, 5],
      notes: '',
      workouts: [{ id: uid(), name: 'Treino A', subtitle: '', color: WORKOUT_COLORS[0], weekdays: [1], blocks: [] }]
    };
    update((d) => {
      d.plans.push(p);
      d.activePlanId = p.id;
    });
    go('#/planilha/' + p.id);
  };

  if (route.id === 'nova') {
    setTimeout(createBlank, 0);
    return null;
  }

  const sorted = [...data.plans].sort((a, b) => (b.start || '').localeCompare(a.start || ''));
  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Planilhas</h1>
          <div className="sub">Cada planilha tem período, treinos e dias da semana</div>
        </div>
        <div className="row gap8 wrap">
          <a className="btn ghost" href="#/planilhas/importar"><Icon name="upload" size={18} /> Importar do Word</a>
          <button className="btn" onClick={createBlank}><Icon name="plus" size={18} /> Nova planilha</button>
        </div>
      </div>
      {!sorted.length && <Empty title="Nenhuma planilha" icon="list"><p>Importe seu arquivo do Word ou crie do zero.</p></Empty>}
      <div className="plist">
        {sorted.map((p) => {
          const status = planStatus(p, today);
          const done = data.sessions.filter((s) => s.planId === p.id && s.status === 'done').length;
          return (
            <div key={p.id} className={'card pcard' + (active?.id === p.id ? ' active' : '')}>
              <div className="row between gap8">
                <a href={'#/planilha/' + p.id} className="pcard-t">
                  <h2>{p.name}</h2>
                  <div className="sub">{fmtDate(p.start, { year: true })} → {fmtDate(p.end, { year: true })} · {p.mode === 'rotation' ? 'Rodízio' : 'Dias fixos'}</div>
                </a>
                <span className={'tag ' + (status === 'ativa' ? '' : 'neutral')} style={status === 'ativa' ? { '--c': 'var(--ok)' } : undefined}>{status}</span>
              </div>
              <div className="row gap6 wrap" style={{ margin: '10px 0' }}>
                {p.workouts.map((w) => (
                  <span key={w.id} className="tag neutral"><i className="cdot" style={{ background: w.color }} /> {w.name} · {workoutStats(w).ex} ex.</span>
                ))}
              </div>
              <div className="sub">{done} treinos registrados{active?.id === p.id ? ' · planilha ativa' : ''}</div>
              <div className="row gap6 wrap" style={{ marginTop: 12 }}>
                <a className="btn sm" href={'#/planilha/' + p.id}><Icon name="edit" size={15} /> Editar</a>
                {active?.id !== p.id && <button className="btn sm ghost" onClick={() => update((d) => (d.activePlanId = p.id))}>Tornar ativa</button>}
                <button className="btn sm ghost" onClick={() => {
                  const c = clonePlan(p, addDays(p.end, 1));
                  update((d) => d.plans.push(c));
                  go('#/planilha/' + c.id);
                }}><Icon name="copy" size={15} /> Duplicar p/ próximo bloco</button>
                <button className="btn sm ghost danger" onClick={() => {
                  if (!confirm(`Excluir a planilha "${p.name}" e seus ${done} registros de treino?`)) return;
                  update((d) => {
                    d.plans = d.plans.filter((x) => x.id !== p.id);
                    d.sessions = d.sessions.filter((s) => s.planId !== p.id);
                    if (d.activePlanId === p.id) d.activePlanId = null;
                  });
                }}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
      {route.id === 'importar' && <ImportModal onClose={() => go('#/planilhas')} />}
    </div>
  );
}
