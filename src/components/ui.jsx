import { useEffect, useState } from 'react';
import { useData } from '../store.jsx';
import { loadAnimation, loadVideoURL } from '../media.js';
import AnimationPlayer from './AnimationPlayer.jsx';

const paths = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  dumbbell: 'M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  play: 'M7 4v16l13-8z',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  upload: 'M12 16V4M6 10l6-6 6 6M4 20h16',
  cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z',
  back: 'M15 5l-7 7 7 7',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  timer: 'M12 8v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 2h6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  link2: 'M8 12h8',
  fire: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2-1-4 0-6z'
};

export function Icon({ name, size = 20, stroke = 2, fill }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <div className="modal-h">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function TypeTags({ ids, small }) {
  const { data } = useData();
  return (
    <>
      {(ids || []).map((id) => {
        const t = data.types.find((x) => x.id === id);
        if (!t) return null;
        return (
          <span key={id} className={'tag' + (small ? ' sm' : '')} style={{ '--c': t.color }}>{t.name}</span>
        );
      })}
    </>
  );
}

export function MethodBadge({ id, extra }) {
  const { data } = useData();
  const m = data.methods.find((x) => x.id === id);
  if (!m || m.id === 'simples') return extra ? <span className="mbadge plain">{extra}</span> : null;
  return (
    <span className="mbadge" style={{ background: m.color }} title={m.desc}>
      {m.name.toUpperCase()}{extra ? ` · ${extra}` : ''}
    </span>
  );
}

export function youtubeEmbed(url, start, end) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  if (!m) return null;
  let t = start;
  if (t == null) {
    const tm = url.match(/[?&]t=(\d+)/);
    if (tm) t = Number(tm[1]);
  }
  const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
  if (t) q.set('start', String(Math.floor(t)));
  if (end) q.set('end', String(Math.floor(end)));
  return `https://www.youtube-nocookie.com/embed/${m[1]}?${q}`;
}

export function hasMedia(ex) {
  const m = ex?.media || {};
  return !!(m.animation || m.youtube?.url || m.video);
}

// Mostra a mídia de um exercício: animação padronizada, YouTube e/ou vídeo próprio
export function ExerciseMedia({ exercise, height = 260 }) {
  const { cfg } = useData();
  const m = exercise?.media || {};
  const tabs = [m.animation && 'anim', m.youtube?.url && 'yt', m.video && 'video'].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]);
  const [anim, setAnim] = useState(null);
  const [vurl, setVurl] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [exercise?.id, tabs.join()]);
  useEffect(() => {
    setErr('');
    if (tab === 'anim' && m.animation) loadAnimation(m.animation.path, cfg).then(setAnim).catch((e) => setErr('Não foi possível carregar a animação: ' + e.message));
    if (tab === 'video' && m.video) loadVideoURL(m.video.path, cfg).then(setVurl).catch((e) => setErr('Não foi possível carregar o vídeo: ' + e.message));
  }, [tab, m.animation?.path, m.video?.path]);
  if (!tabs.length) return <div className="media-empty"><Icon name="video" size={28} /><span>Sem vídeo ou animação</span></div>;
  return (
    <div className="media">
      {tabs.length > 1 && (
        <div className="seg sm" style={{ marginBottom: 8 }}>
          {tabs.includes('anim') && <button className={tab === 'anim' ? 'on' : ''} onClick={() => setTab('anim')}>Animação</button>}
          {tabs.includes('yt') && <button className={tab === 'yt' ? 'on' : ''} onClick={() => setTab('yt')}>YouTube</button>}
          {tabs.includes('video') && <button className={tab === 'video' ? 'on' : ''} onClick={() => setTab('video')}>Vídeo</button>}
        </div>
      )}
      {err && <div className="note err">{err}</div>}
      {tab === 'anim' && anim && <AnimationPlayer anim={anim} height={height} />}
      {tab === 'yt' && (
        <div className="yt" style={{ height }}>
          <iframe src={youtubeEmbed(m.youtube.url, m.youtube.start, m.youtube.end)} title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      )}
      {tab === 'video' && vurl && <video className="vid" style={{ maxHeight: height + 60 }} src={vurl} controls playsInline loop muted />}
    </div>
  );
}

export function ExerciseModal({ exerciseId, onClose, extra }) {
  const { data } = useData();
  const ex = data.exercises.find((e) => e.id === exerciseId);
  if (!ex) return null;
  return (
    <Modal title={ex.name} onClose={onClose}>
      <ExerciseMedia exercise={ex} />
      <div className="row wrap gap6" style={{ marginTop: 12 }}>
        <TypeTags ids={ex.typeIds} />
        {ex.region && <span className="tag neutral">{ex.region}</span>}
      </div>
      {ex.notes && <p className="cues">{ex.notes}</p>}
      {extra}
      <div style={{ marginTop: 14 }}>
        <a className="btn ghost sm" href={`#/exercicio/${ex.id}`} onClick={onClose}><Icon name="edit" size={16} /> Editar exercício e mídia</a>
      </div>
    </Modal>
  );
}

export function Empty({ title, children, icon = 'dumbbell' }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} size={30} /></div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Field({ label, children, hint, className }) {
  return (
    <label className={'field ' + (className || '')}>
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function WeekdayPicker({ value = [], onChange, single }) {
  const L = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="wdp">
      {order.map((d) => (
        <button
          type="button"
          key={d}
          className={value.includes(d) ? 'on' : ''}
          title={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d]}
          onClick={() => onChange(single ? [d] : value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort())}
        >
          {L[d]}
        </button>
      ))}
    </div>
  );
}

export function useHashRoute() {
  const [h, setH] = useState(() => window.location.hash || '#/hoje');
  useEffect(() => {
    const f = () => {
      setH(window.location.hash || '#/hoje');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const parts = h.replace(/^#\/?/, '').split('/');
  return { page: parts[0] || 'hoje', id: parts[1], sub: parts[2] };
}

export const go = (path) => (window.location.hash = path);
