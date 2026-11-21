// Importação de planilhas em Word (.docx).
// Formato reconhecido (uma linha por exercício):
//   A. Mobilidade – Gato/camelo – 1x6
//   E. Força MMII – Step-up alto carregado – 4x6-8
// Títulos de treino: qualquer linha que não seja exercício (ex.: "Treino 1 – FORÇA").
// Exercícios com a mesma letra formam um bloco (2 = biset, 3 = triset, 4+ = circuito).
import { uid, norm, methodForCount, WORKOUT_COLORS } from './model.js';

const SEP = /\s+[-–—]{1,2}\s+/;
const EX_LINE = /^([A-Z]{1,2})[.)]\s*(.+)$/;

import { lazyImport } from './update.js';

export async function docxToText(file) {
  const mod = await lazyImport(() => import('mammoth/mammoth.browser.js'));
  const mammoth = mod.default || mod;
  const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return res.value;
}

export function parsePrescription(raw) {
  const s = (raw || '').trim().replace(/[”″]/g, '"').replace(/[’′]/g, "'");
  const m = s.match(/^(\d+)\s*[xX×]\s*([\d]+(?:\s*[-–,/]\s*[\d]+)?)\s*("|''|s\b|seg\b|segundos\b|m\b|metros\b|min\b)?\s*(.*)$/);
  if (!m) return { sets: s ? '' : 1, reps: '', unit: 'reps', notes: s };
  let unit = 'reps';
  let reps = m[2].replace(/\s+/g, '').replace('–', '-');
  const u = (m[3] || '').toLowerCase();
  if (u === '"' || u === "''" || u.startsWith('s')) unit = 's';
  else if (u === 'm' || u === 'metros') unit = 'm';
  else if (u === 'min') {
    unit = 's';
    reps = reps.split('-').map((x) => String(Number(x) * 60)).join('-');
  }
  let notes = (m[4] || '').trim().replace(/^\((.*)\)$/, '$1');
  return { sets: Number(m[1]), reps, unit, notes };
}

// Interpreta a categoria ("Força/Estabilidade", "Força MMII", "Pé/Tornozelo") em tipos + região
function parseCategory(cat, types) {
  const find = (name) => types.find((t) => norm(t.name) === norm(name));
  const whole = find(cat);
  if (whole) return { typeNames: [whole.name], region: '' };
  const words = cat.trim().split(/\s+/);
  // tenta: primeira palavra(s) = tipo, restante = região (ex.: "Força MMII", "Potência MMSS")
  for (let k = words.length; k >= 1; k--) {
    const head = words.slice(0, k).join(' ');
    const rest = words.slice(k).join(' ');
    const parts = head.split('/');
    if (parts.every((p) => find(p))) return { typeNames: parts.map((p) => find(p).name), region: rest };
  }
  return { typeNames: [cat.trim()], region: '' }; // tipo novo
}

// Retorna um rascunho de planilha (sem alterar os dados)
export function parsePlanText(text, data) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/ /g, ' ').trim()).filter(Boolean);
  const types = [...data.types];
  const newTypes = [];
  const workouts = [];
  let cur = null;
  const warnings = [];

  for (const line of lines) {
    const m = line.match(EX_LINE);
    const parts = m ? m[2].split(SEP) : null;
    if (m && parts && parts.length >= 2) {
      if (!cur) {
        cur = { name: 'Treino 1', items: [] };
        workouts.push(cur);
      }
      const [cat, name, ...rest] = parts.length >= 2 ? parts : [null, parts[0]];
      const pr = parsePrescription(rest.join(' - '));
      const { typeNames, region } = parseCategory(cat, types);
      for (const tn of typeNames)
        if (!types.find((t) => norm(t.name) === norm(tn))) {
          const t = { id: uid(), name: tn, color: '#94a3b8' };
          types.push(t);
          newTypes.push(t);
        }
      cur.items.push({ letter: m[1], category: cat, name: name.trim(), typeNames, region, ...pr });
    } else if (m && parts && parts.length === 1) {
      // linha com letra mas sem separador: ex. "I. Liberação – Rolo" com hífen comum
      if (!cur) continue;
      cur.items.push({ letter: m[1], category: '', name: m[2].trim(), typeNames: [], region: '', sets: 1, reps: '', unit: 'reps', notes: '' });
      warnings.push(`Não reconheci séries/reps em: "${line}"`);
    } else {
      const [title, ...sub] = line.split(SEP);
      cur = { name: title.trim(), subtitle: sub.join(' – ').trim(), items: [] };
      workouts.push(cur);
    }
  }
  return { workouts: workouts.filter((w) => w.items.length), types, newTypes, warnings };
}

// Extrai datas do nome do arquivo: "Treinos 12.10 a 29.11" -> { start, end }
export function datesFromName(name, refYear = new Date().getFullYear()) {
  const ms = [...name.matchAll(/(\d{1,2})[._/-](\d{1,2})(?:[._/-](\d{2,4}))?/g)];
  if (ms.length < 2) return {};
  const mk = (m, y) => {
    let yy = m[3] ? Number(m[3]) : y;
    if (yy < 100) yy += 2000;
    return `${yy}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  };
  const start = mk(ms[0], refYear);
  let end = mk(ms[1], refYear);
  if (end < start && !ms[1][3]) end = mk(ms[1], refYear + 1);
  return { start, end };
}

// Aplica o rascunho aos dados: cria tipos, exercícios (reaproveitando os existentes) e a planilha
export function applyDraft(d, draft, opts) {
  for (const t of draft.newTypes) if (!d.types.find((x) => x.id === t.id)) d.types.push(t);
  const typeId = (name) => d.types.find((t) => norm(t.name) === norm(name))?.id;
  const exId = (it) => {
    let ex = d.exercises.find((e) => norm(e.name) === norm(it.name));
    if (!ex) {
      ex = { id: uid(), name: it.name, typeIds: it.typeNames.map(typeId).filter(Boolean), region: it.region || '', notes: '', media: {} };
      d.exercises.push(ex);
    }
    return ex.id;
  };
  const plan = {
    id: uid(),
    name: opts.name,
    start: opts.start,
    end: opts.end,
    mode: opts.mode || 'fixed',
    trackFrom: opts.trackFrom || null,
    rotationDays: opts.rotationDays || [1, 3, 5],
    notes: '',
    workouts: draft.workouts.map((w, wi) => {
      const blocks = [];
      for (const it of w.items) {
        let b = blocks.find((x) => x.label === it.letter);
        if (!b) {
          b = { id: uid(), label: it.letter, methodId: 'simples', rest: '', items: [] };
          blocks.push(b);
        }
        b.items.push({
          id: uid(),
          exerciseId: exId(it),
          sets: it.sets,
          reps: it.reps,
          unit: it.unit,
          load: '',
          cadence: '',
          rir: '',
          rest: '',
          notes: it.notes || ''
        });
      }
      for (const b of blocks) b.methodId = methodForCount(b.items.length);
      return {
        id: uid(),
        name: w.name,
        subtitle: w.subtitle || '',
        color: WORKOUT_COLORS[wi % WORKOUT_COLORS.length],
        weekdays: (opts.weekdays && opts.weekdays[wi]) || [],
        blocks
      };
    })
  };
  d.plans.push(plan);
  d.activePlanId = plan.id;
  return plan;
}
