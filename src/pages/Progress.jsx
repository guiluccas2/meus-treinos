import { useMemo, useState } from 'react';
import { useData } from '../store.jsx';
import { addDays, exerciseHistory, fmtDate, sessionVolume, startOfWeek, todayISO } from '../model.js';
import { Empty } from '../components/ui.jsx';

function LineChart({ points, unit, height = 200 }) {
  const [hover, setHover] = useState(null);
  if (points.length < 1) return null;
  const W = 600, H = height, pl = 40, pr = 12, pt = 14, pb = 26;
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const span = max - min;
  min = Math.max(0, min - span * 0.1);
  max = max + span * 0.1;
  const x = (i) => pl + (points.length === 1 ? (W - pl - pr) / 2 : (i / (points.length - 1)) * (W - pl - pr));
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const ticks = [min, (min + max) / 2, max];
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.y)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" onMouseLeave={() => setHover(null)}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} className="grid" />
          <text x={pl - 6} y={y(t) + 4} textAnchor="end" className="axis">{Math.round(t)}</text>
        </g>
      ))}
      <path d={`${d} L${x(points.length - 1)},${H - pb} L${x(0)},${H - pb} Z`} className="area" />
      <path d={d} className="line" />
      {points.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
          <circle cx={x(i)} cy={y(p.y)} r={hover === i ? 6 : 4} className="pt" />
          <rect x={x(i) - 12} y={pt} width={24} height={H - pt - pb} fill="transparent" />
        </g>
      ))}
      {[0, points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 && points.length > 1 ? 'start' : 'end'} className="axis">{fmtDate(points[i].date)}</text>
      ))}
      {hover != null && (
        <g>
          <rect x={Math.min(W - 130, Math.max(pl, x(hover) - 60))} y={2} width={120} height={22} rx={6} className="tip" />
          <text x={Math.min(W - 130, Math.max(pl, x(hover) - 60)) + 60} y={17} textAnchor="middle" className="tip-t">
            {fmtDate(points[hover].date)} · {points[hover].y.toLocaleString('pt-BR')} {unit}
          </text>
        </g>
      )}
    </svg>
  );
}

function Bars({ items, height = 150 }) {
  const W = 600, H = height, pb = 22, pt = 16;
  const max = Math.max(1, ...items.map((i) => i.v));
  const bw = (W / items.length) * 0.62;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {items.map((it, i) => {
        const cx = (i + 0.5) * (W / items.length);
        const h = (it.v / max) * (H - pb - pt);
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={H - pb - h} width={bw} height={Math.max(h, it.v ? 2 : 0)} rx={4} className={'barr' + (it.cur ? ' cur' : '')} />
            {it.v > 0 && <text x={cx} y={H - pb - h - 4} textAnchor="middle" className="axis">{it.v}</text>}
            <text x={cx} y={H - 6} textAnchor="middle" className="axis">{it.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Progress() {
  const { data } = useData();
  const done = data.sessions.filter((s) => s.status === 'done');
  const withHist = useMemo(
    () => data.exercises.map((e) => ({ e, h: exerciseHistory(data, e.id) })).filter((x) => x.h.length).sort((a, b) => b.h.length - a.h.length),
    [data]
  );
  const [exId, setExId] = useState('');
  const [metric, setMetric] = useState('best');
  const cur = withHist.find((x) => x.e.id === exId) || withHist[0];

  const today = todayISO();
  const ws = startOfWeek(today);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const s = addDays(ws, -7 * (11 - i));
    const e = addDays(s, 6);
    return { l: fmtDate(s).slice(0, 5), v: done.filter((x) => x.date >= s && x.date <= e).length, cur: i === 11 };
  });
  const totalVol = done.reduce((a, s) => a + sessionVolume(s), 0);
  const mins = done.filter((s) => s.finishedAt).reduce((a, s) => a + (new Date(s.finishedAt) - new Date(s.startedAt)) / 60000, 0);

  if (!done.length && !withHist.length)
    return <div className="page"><h1>Evolução</h1><Empty title="Ainda sem registros" icon="chart"><p>Registre cargas e repetições nos treinos para ver sua evolução aqui.</p></Empty></div>;

  return (
    <div className="page">
      <div className="ph"><div><h1>Evolução</h1><div className="sub">Baseado nos treinos registrados</div></div></div>
      <div className="kpis">
        <div className="card kpi"><div className="kl">Treinos concluídos</div><div className="kv">{done.length}</div></div>
        <div className="card kpi"><div className="kl">Volume total</div><div className="kv">{Math.round(totalVol / 1000).toLocaleString('pt-BR')} <small>t</small></div></div>
        <div className="card kpi"><div className="kl">Tempo treinando</div><div className="kv">{Math.round(mins / 60)} <small>h</small></div></div>
        <div className="card kpi"><div className="kl">Média semanal (12 sem.)</div><div className="kv">{(weeks.reduce((a, w) => a + w.v, 0) / 12).toFixed(1)}</div></div>
      </div>
      <div className="card">
        <h2>Treinos por semana</h2>
        <Bars items={weeks} />
      </div>
      {cur && (
        <div className="card">
          <div className="row between wrap gap8" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Por exercício</h2>
            <div className="row gap8 wrap">
              <select value={cur.e.id} onChange={(e) => setExId(e.target.value)}>
                {withHist.map((x) => <option key={x.e.id} value={x.e.id}>{x.e.name} ({x.h.length})</option>)}
              </select>
              <div className="seg sm">
                <button className={metric === 'best' ? 'on' : ''} onClick={() => setMetric('best')}>Maior carga</button>
                <button className={metric === 'volume' ? 'on' : ''} onClick={() => setMetric('volume')}>Volume</button>
                <button className={metric === 'reps' ? 'on' : ''} onClick={() => setMetric('reps')}>Reps/tempo</button>
              </div>
            </div>
          </div>
          <LineChart
            points={cur.h.map((h) => ({ date: h.date, y: metric === 'best' ? h.best : metric === 'volume' ? Math.round(h.volume) : h.maxReps }))}
            unit={metric === 'reps' ? '' : 'kg'}
          />
          <div className="htable">
            {[...cur.h].reverse().map((h) => (
              <div key={h.sessionId} className="hrow">
                <span>{fmtDate(h.date, { year: true })}</span>
                <span className="mut">{h.sets.map((s) => `${s.kg || 0}×${s.reps || 0}`).join('  ')}</span>
                <b>{h.best} kg</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
