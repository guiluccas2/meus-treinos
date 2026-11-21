// Modelo de dados, valores padrão e regras de calendário.

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);

export const DEFAULT_TYPES = [
  { id: 'mobilidade', name: 'Mobilidade', color: '#38bdf8' },
  { id: 'forca', name: 'Força', color: '#f43f5e' },
  { id: 'hipertrofia', name: 'Hipertrofia', color: '#ec4899' },
  { id: 'potencia', name: 'Potência', color: '#f59e0b' },
  { id: 'estabilidade', name: 'Estabilidade', color: '#a78bfa' },
  { id: 'core', name: 'Core', color: '#22c55e' },
  { id: 'cardio', name: 'Cardio', color: '#14b8a6' },
  { id: 'alongamento', name: 'Alongamento', color: '#60a5fa' },
  { id: 'liberacao', name: 'Liberação', color: '#94a3b8' }
];

export const DEFAULT_METHODS = [
  { id: 'simples', name: 'Simples', color: '#94a3b8', desc: 'Séries convencionais com descanso entre elas.' },
  { id: 'biset', name: 'Biset', color: '#38bdf8', desc: '2 exercícios em sequência, sem descanso entre eles.' },
  { id: 'triset', name: 'Triset', color: '#f97316', desc: '3 exercícios em sequência, sem descanso entre eles.' },
  { id: 'giantset', name: 'Giant set', color: '#ef4444', desc: '4 ou mais exercícios em sequência.' },
  { id: 'circuito', name: 'Circuito', color: '#22c55e', desc: 'Sequência de exercícios repetida por voltas.' },
  { id: 'superset', name: 'Superset', color: '#06b6d4', desc: 'Dois exercícios de grupos antagonistas em sequência.' },
  { id: 'dropset', name: 'Drop-set', color: '#e11d48', desc: 'Reduz a carga ao chegar à falha e continua.' },
  { id: 'restpause', name: 'Rest-pause', color: '#d946ef', desc: 'Pausas curtas dentro da mesma série.' },
  { id: 'piramide', name: 'Pirâmide', color: '#eab308', desc: 'Carga sobe (ou desce) a cada série.' },
  { id: 'emom', name: 'EMOM', color: '#14b8a6', desc: 'Every minute on the minute.' },
  { id: 'amrap', name: 'AMRAP', color: '#84cc16', desc: 'Máximo de repetições/voltas no tempo.' },
  { id: 'isometria', name: 'Isometria', color: '#8b5cf6', desc: 'Sustentação por tempo.' },
  { id: 'cluster', name: 'Cluster', color: '#0ea5e9', desc: 'Série dividida em mini-blocos.' },
  { id: 'intervalado', name: 'Intervalado', color: '#10b981', desc: 'Esforço e pausa alternados.' }
];

export const WORKOUT_COLORS = ['#c6f432', '#4cc9f0', '#f77f00', '#b388ff', '#ff5d73', '#38d39f', '#f7b801', '#60a5fa'];

export const UNITS = [
  { id: 'reps', label: 'reps', short: '' },
  { id: 's', label: 'segundos', short: '"' },
  { id: 'm', label: 'metros', short: 'm' }
];

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function emptyData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    settings: { theme: 'lima', mode: 'dark', defaultRest: 60, sound: true },
    types: DEFAULT_TYPES.map((t) => ({ ...t })),
    methods: DEFAULT_METHODS.map((m) => ({ ...m })),
    exercises: [],
    plans: [],
    sessions: [],
    activePlanId: null
  };
}

// ---------- datas ----------
export const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const todayISO = () => toISO(new Date());
export const weekday = (iso) => parseISO(iso).getDay();
export const fmtDate = (iso, opts = {}) => {
  if (!iso) return '';
  const d = parseISO(iso);
  if (opts.long) return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}${opts.year ? '/' + d.getFullYear() : ''}`;
};
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const startOfWeek = (iso) => addDays(iso, -((weekday(iso) + 6) % 7)); // semana começa na segunda

// ---------- utilidades de domínio ----------
export const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function methodForCount(n) {
  if (n <= 1) return 'simples';
  if (n === 2) return 'biset';
  if (n === 3) return 'triset';
  return 'circuito';
}

export function blockLabel(i) {
  let s = '';
  i += 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function prescription(item) {
  const u = UNITS.find((x) => x.id === item.unit) || UNITS[0];
  const reps = item.reps ? `${item.reps}${u.short}` : '';
  if (!item.sets && !reps) return '';
  return `${item.sets || 1} × ${reps || '—'}`;
}

export function workoutStats(workout) {
  let ex = 0;
  let sets = 0;
  for (const b of workout.blocks) for (const it of b.items) {
    ex++;
    sets += Number(it.sets) || 0;
  }
  return { ex, sets, blocks: workout.blocks.length };
}

export function planStatus(plan, today = todayISO()) {
  if (plan.start && today < plan.start) return 'futura';
  if (plan.end && today > plan.end) return 'encerrada';
  return 'ativa';
}

export function getActivePlan(data, today = todayISO()) {
  const byId = data.plans.find((p) => p.id === data.activePlanId);
  if (byId) return byId;
  return (
    data.plans.find((p) => planStatus(p, today) === 'ativa') ||
    [...data.plans].sort((a, b) => (b.start || '').localeCompare(a.start || ''))[0] ||
    null
  );
}

// ---------- calendário ----------
// Retorna Map<iso, Array<{workoutId, status, sessionId?}>>
// status: done | partial | missed | planned | today
export function buildSchedule(plan, sessions, today = todayISO()) {
  const map = new Map();
  if (!plan || !plan.start || !plan.end) return map;
  const push = (iso, e) => {
    if (!map.has(iso)) map.set(iso, []);
    map.get(iso).push(e);
  };
  const ps = sessions
    .filter((s) => s.planId === plan.id)
    .sort((a, b) => (a.date + (a.startedAt || '')).localeCompare(b.date + (b.startedAt || '')));
  const byDate = new Map();
  for (const s of ps) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }
  const sessionStatus = (s) => (s.status === 'done' ? 'done' : 'partial');
  // faltas só contam a partir do dia em que você começou a registrar
  const track = plan.trackFrom && plan.trackFrom > plan.start ? plan.trackFrom : plan.start;

  if ((plan.mode || 'fixed') === 'fixed') {
    for (let iso = plan.start; iso <= plan.end; iso = addDays(iso, 1)) {
      const wd = weekday(iso);
      const done = byDate.get(iso) || [];
      const used = new Set();
      for (const w of plan.workouts) {
        if (!(w.weekdays || []).includes(wd)) continue;
        const s = done.find((x) => x.workoutId === w.id && !used.has(x.id));
        if (s) {
          used.add(s.id);
          push(iso, { workoutId: w.id, status: sessionStatus(s), sessionId: s.id });
        } else {
          push(iso, { workoutId: w.id, status: iso < today ? (iso >= track ? 'missed' : 'unlogged') : iso === today ? 'today' : 'planned' });
        }
      }
      for (const s of done) if (!used.has(s.id)) push(iso, { workoutId: s.workoutId, status: sessionStatus(s), sessionId: s.id, extra: true });
    }
    // sessões fora do período
    for (const s of ps) if (s.date < plan.start || s.date > plan.end) push(s.date, { workoutId: s.workoutId, status: sessionStatus(s), sessionId: s.id, extra: true });
    return map;
  }

  // rodízio: segue a ordem dos treinos; faltas não avançam a sequência
  const order = plan.workouts.map((w) => w.id);
  if (!order.length) return map;
  const days = plan.rotationDays && plan.rotationDays.length ? plan.rotationDays : [1, 3, 5];
  let next = 0;
  for (let iso = plan.start; iso <= plan.end; iso = addDays(iso, 1)) {
    const done = byDate.get(iso) || [];
    if (iso < today) {
      if (done.length) {
        for (const s of done) {
          push(iso, { workoutId: s.workoutId, status: sessionStatus(s), sessionId: s.id });
          if (s.status === 'done') next = (order.indexOf(s.workoutId) + 1) % order.length;
        }
      } else if (days.includes(weekday(iso)) && iso >= track) {
        push(iso, { workoutId: null, status: 'missed' });
      }
    } else if (iso === today) {
      if (done.length) {
        for (const s of done) {
          push(iso, { workoutId: s.workoutId, status: sessionStatus(s), sessionId: s.id });
          if (s.status === 'done') next = (order.indexOf(s.workoutId) + 1) % order.length;
        }
      } else if (days.includes(weekday(iso))) {
        push(iso, { workoutId: order[next], status: 'today' });
        next = (next + 1) % order.length;
      }
    } else if (days.includes(weekday(iso))) {
      push(iso, { workoutId: order[next], status: 'planned' });
      next = (next + 1) % order.length;
    }
  }
  return map;
}

// Próximo treino sugerido no modo rodízio, independentemente do dia da semana
export function nextRotationWorkout(plan, sessions) {
  const order = plan.workouts.map((w) => w.id);
  const last = sessions
    .filter((s) => s.planId === plan.id && s.status === 'done')
    .sort((a, b) => (a.date + (a.startedAt || '')).localeCompare(b.date + (b.startedAt || '')))
    .pop();
  if (!last) return order[0];
  return order[(order.indexOf(last.workoutId) + 1) % order.length];
}

// ---------- histórico ----------
export function lastLogFor(data, exerciseId, excludeSessionId) {
  const ss = data.sessions
    .filter((s) => s.id !== excludeSessionId && s.log)
    .sort((a, b) => (b.date + (b.startedAt || '')).localeCompare(a.date + (a.startedAt || '')));
  for (const s of ss) {
    for (const k of Object.keys(s.log)) {
      const e = s.log[k];
      if (e.exerciseId === exerciseId && e.sets.some((x) => x.done)) return { session: s, sets: e.sets };
    }
  }
  return null;
}

export function exerciseHistory(data, exerciseId) {
  const out = [];
  for (const s of data.sessions) {
    if (!s.log) continue;
    for (const k of Object.keys(s.log)) {
      const e = s.log[k];
      if (e.exerciseId !== exerciseId) continue;
      const done = e.sets.filter((x) => x.done);
      if (!done.length) continue;
      const kgs = done.map((x) => parseFloat(String(x.kg).replace(',', '.')) || 0);
      const reps = done.map((x) => parseFloat(String(x.reps).replace(',', '.')) || 0);
      const best = Math.max(...kgs);
      const volume = done.reduce((a, x, i) => a + kgs[i] * reps[i], 0);
      out.push({ date: s.date, sessionId: s.id, sets: done, best, volume, maxReps: Math.max(...reps) });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function sessionVolume(s) {
  let v = 0;
  for (const k of Object.keys(s.log || {}))
    for (const x of s.log[k].sets)
      if (x.done) v += (parseFloat(String(x.kg).replace(',', '.')) || 0) * (parseFloat(String(x.reps).replace(',', '.')) || 0);
  return Math.round(v);
}

export function newSession(plan, workout, date) {
  const log = {};
  for (const b of workout.blocks)
    for (const it of b.items) {
      const n = Math.max(1, parseInt(it.sets, 10) || 1);
      log[it.id] = {
        exerciseId: it.exerciseId,
        sets: Array.from({ length: n }, () => ({ kg: '', reps: '', done: false }))
      };
    }
  return {
    id: uid(),
    planId: plan.id,
    workoutId: workout.id,
    date,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'in_progress',
    notes: '',
    log
  };
}
