import { useEffect, useRef, useState } from 'react';
import { useData } from '../store.jsx';
import { exerciseHistory, fmtDate } from '../model.js';
import { MAX_VIDEO_MB, removeFile, saveAnimation, saveVideo } from '../media.js';
import { Empty, ExerciseMedia, Field, Icon, go, youtubeEmbed } from '../components/ui.jsx';
import AnimationPlayer from '../components/AnimationPlayer.jsx';
import { usageOf } from './Library.jsx';

export const parseTime = (v) => {
  if (v === '' || v == null) return null;
  const p = String(v).split(':').map(Number);
  if (p.some(isNaN)) return null;
  return p.reduce((a, x) => a * 60 + x, 0);
};
const fmtTime = (s) => (s == null ? '' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function AnimationMaker({ exercise, onDone }) {
  const { update, kickMedia } = useData();
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);
  const [range, setRange] = useState({ start: 0, end: null });
  const [keep, setKeep] = useState(false);
  const [prog, setProg] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const vref = useRef(null);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  const choose = (f) => {
    if (!f) return;
    setFile(f);
    setUrl(URL.createObjectURL(f));
    setResult(null);
    setErr('');
    setRange({ start: 0, end: null });
  };
  const run = async () => {
    setErr('');
    setResult(null);
    try {
      const { videoToAnimation } = await import('../pose.js');
      const anim = await videoToAnimation(file, { start: range.start || 0, end: range.end, onProgress: (p, msg) => setProg({ p, msg }) });
      setResult(anim);
    } catch (e) {
      console.error(e);
      setErr(e.message || String(e));
    } finally {
      setProg(null);
    }
  };
  const save = async () => {
    const path = await saveAnimation(exercise.id, result);
    let vpath = null;
    if (keep && file.size <= MAX_VIDEO_MB * 1024 * 1024) vpath = await saveVideo(file);
    update((d) => {
      const ex = d.exercises.find((e) => e.id === exercise.id);
      ex.media = ex.media || {};
      if (ex.media.animation) removeFile(ex.media.animation.path);
      ex.media.animation = { path, frames: result.frames.length, fps: result.fps, createdAt: result.createdAt, source: result.source };
      if (vpath) {
        if (ex.media.video) removeFile(ex.media.video.path);
        ex.media.video = { path: vpath, name: file.name, size: file.size, type: file.type };
      }
    });
    kickMedia();
    onDone();
  };

  return (
    <div className="maker stack">
      {!file && (
        <label className="drop">
          <Icon name="video" size={30} />
          <b>Escolha ou grave um vídeo do exercício</b>
          <span className="sub">A IA identifica o corpo quadro a quadro e cria um boneco animado padronizado. Tudo é processado no seu aparelho.</span>
          <input type="file" accept="video/*" onChange={(e) => choose(e.target.files[0])} hidden />
        </label>
      )}
      {file && (
        <>
          <video ref={vref} src={url} controls playsInline muted className="vid" />
          <div className="grid3">
            <Field label="Início do trecho">
              <div className="row gap6">
                <input value={fmtTime(range.start)} onChange={(e) => setRange({ ...range, start: parseTime(e.target.value) ?? 0 })} />
                <button className="btn xs ghost" onClick={() => setRange({ ...range, start: vref.current.currentTime })}>Marcar agora</button>
              </div>
            </Field>
            <Field label="Fim do trecho">
              <div className="row gap6">
                <input value={fmtTime(range.end)} placeholder="fim do vídeo" onChange={(e) => setRange({ ...range, end: parseTime(e.target.value) })} />
                <button className="btn xs ghost" onClick={() => setRange({ ...range, end: vref.current.currentTime })}>Marcar agora</button>
              </div>
            </Field>
            <Field label="Opções">
              <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Guardar também o vídeo original {file.size > MAX_VIDEO_MB * 1048576 ? `(arquivo acima de ${MAX_VIDEO_MB} MB — não será guardado)` : `(${(file.size / 1048576).toFixed(1)} MB)`}</label>
            </Field>
          </div>
          <div className="note">Dicas: corpo inteiro no quadro, câmera parada e de lado (ou de frente), boa iluminação, 1 a 3 repetições. Máximo de 30 s por trecho.</div>
          {prog && (
            <div>
              <div className="sub">{prog.msg}</div>
              <div className="bar thick"><div style={{ width: prog.p * 100 + '%' }} /></div>
            </div>
          )}
          {err && <div className="note err">{err}</div>}
          {result && (
            <div className="card">
              <div className="kl">Prévia da animação</div>
              <AnimationPlayer anim={result} height={280} />
            </div>
          )}
          <div className="row gap8 wrap">
            <button className="btn ghost" onClick={() => { setFile(null); setResult(null); }}>Trocar vídeo</button>
            {!result && <button className="btn" onClick={run} disabled={!!prog}>{prog ? 'Processando…' : '✨ Gerar animação com IA'}</button>}
            {result && <button className="btn ghost" onClick={run}>Gerar de novo</button>}
            {result && <button className="btn" onClick={save}><Icon name="check" size={16} stroke={3} /> Salvar animação</button>}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExerciseEditor({ id }) {
  const { data, update, kickMedia } = useData();
  const ex = data.exercises.find((e) => e.id === id);
  const [making, setMaking] = useState(false);
  const [yt, setYt] = useState(null);
  if (!ex) return <div className="page"><Empty title="Exercício não encontrado"><a className="btn" href="#/exercicios">Voltar</a></Empty></div>;
  const mu = (fn) => update((d) => fn(d.exercises.find((e) => e.id === id), d));
  const m = ex.media || {};
  const uses = usageOf(data, id);
  const hist = exerciseHistory(data, id);
  const ytForm = yt || { url: m.youtube?.url || '', start: fmtTime(m.youtube?.start), end: fmtTime(m.youtube?.end) };

  return (
    <div className="page">
      <div className="ph">
        <div style={{ flex: 1, minWidth: 0 }}>
          <a className="sub backlink" href="#/exercicios">‹ Exercícios</a>
          <input className="title-in" value={ex.name} onChange={(e) => mu((x) => (x.name = e.target.value))} aria-label="Nome do exercício" />
        </div>
      </div>
      <div className="ex-layout">
        <div className="stack">
          <div className="card">
            <h2>Execução</h2>
            <ExerciseMedia exercise={ex} height={300} />
          </div>
          <div className="card stack">
            <div className="row between"><h2 style={{ margin: 0 }}>✨ Animação padronizada (IA)</h2>
              {m.animation && !making && <button className="btn xs ghost danger" onClick={() => confirm('Remover a animação?') && mu((x) => { removeFile(x.media.animation.path); delete x.media.animation; })}>Remover</button>}
            </div>
            {m.animation && !making && <div className="sub">Gerada em {new Date(m.animation.createdAt).toLocaleDateString('pt-BR')} a partir de “{m.animation.source?.name}”.</div>}
            {making ? <AnimationMaker exercise={ex} onDone={() => setMaking(false)} /> : (
              <button className="btn" onClick={() => setMaking(true)}>{m.animation ? 'Gerar nova animação' : 'Criar animação a partir de um vídeo'}</button>
            )}
            <div className="sub">Para usar um vídeo do YouTube, baixe o trecho (ou grave a tela) e envie aqui — o navegador não consegue ler vídeos direto do YouTube.</div>
          </div>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Vídeo do YouTube</h2>
            <Field label="Link"><input value={ytForm.url} placeholder="https://youtube.com/watch?v=…" onChange={(e) => setYt({ ...ytForm, url: e.target.value })} /></Field>
            <div className="grid2">
              <Field label="Começar em (m:ss)"><input value={ytForm.start} placeholder="0:00" onChange={(e) => setYt({ ...ytForm, start: e.target.value })} /></Field>
              <Field label="Terminar em (m:ss)"><input value={ytForm.end} placeholder="opcional" onChange={(e) => setYt({ ...ytForm, end: e.target.value })} /></Field>
            </div>
            {ytForm.url && !youtubeEmbed(ytForm.url) && <div className="note warn">Link do YouTube não reconhecido.</div>}
            <div className="row gap8">
              <button className="btn sm" disabled={!yt} onClick={() => {
                mu((x) => {
                  x.media = x.media || {};
                  if (ytForm.url) x.media.youtube = { url: ytForm.url.trim(), start: parseTime(ytForm.start), end: parseTime(ytForm.end) };
                  else delete x.media.youtube;
                });
                setYt(null);
              }}>Salvar link</button>
              {m.youtube && <button className="btn sm ghost danger" onClick={() => { mu((x) => delete x.media.youtube); setYt(null); }}>Remover</button>}
            </div>
          </div>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Vídeo próprio</h2>
            {m.video ? <div className="sub">{m.video.name} · {(m.video.size / 1048576).toFixed(1)} MB</div> : <div className="sub">Envie um vídeo seu executando o exercício (até {MAX_VIDEO_MB} MB). Fica guardado no seu repositório privado.</div>}
            <div className="row gap8">
              <label className="btn sm ghost">
                <Icon name="upload" size={15} /> {m.video ? 'Substituir' : 'Enviar vídeo'}
                <input type="file" accept="video/*" hidden onChange={async (e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  if (f.size > MAX_VIDEO_MB * 1048576) return alert(`O vídeo tem ${(f.size / 1048576).toFixed(0)} MB. O limite é ${MAX_VIDEO_MB} MB — corte ou comprima o vídeo.`);
                  const path = await saveVideo(f);
                  mu((x) => {
                    x.media = x.media || {};
                    if (x.media.video) removeFile(x.media.video.path);
                    x.media.video = { path, name: f.name, size: f.size, type: f.type };
                  });
                  kickMedia();
                }} />
              </label>
              {m.video && <button className="btn sm ghost danger" onClick={() => confirm('Remover o vídeo?') && mu((x) => { removeFile(x.media.video.path); delete x.media.video; })}>Remover</button>}
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Detalhes</h2>
            <Field label="Tipos">
              <div className="chips-row">
                {data.types.map((t) => {
                  const on = (ex.typeIds || []).includes(t.id);
                  return <button key={t.id} className={'chip' + (on ? ' on' : '')} style={{ '--c': t.color }} onClick={() => mu((x) => (x.typeIds = on ? x.typeIds.filter((i) => i !== t.id) : [...(x.typeIds || []), t.id]))}>{t.name}</button>;
                })}
              </div>
            </Field>
            <Field label="Região / grupo muscular"><input value={ex.region || ''} placeholder="ex.: MMII, glúteos, core…" onChange={(e) => mu((x) => (x.region = e.target.value))} /></Field>
            <Field label="Dicas de execução"><textarea rows={4} value={ex.notes || ''} placeholder="Pontos de atenção, respiração, amplitude…" onChange={(e) => mu((x) => (x.notes = e.target.value))} /></Field>
          </div>
          <div className="card">
            <h2>Onde é usado</h2>
            {!uses.length && <div className="sub">Não está em nenhuma planilha.</div>}
            {uses.map((u, i) => (
              <a key={i} className="userow" href={'#/planilha/' + u.plan.id}>
                <i className="cdot" style={{ background: u.workout.color }} /> {u.plan.name} · {u.workout.name} · bloco {u.block.label}
              </a>
            ))}
          </div>
          <div className="card">
            <h2>Histórico</h2>
            {!hist.length && <div className="sub">Nenhum registro ainda.</div>}
            {hist.length > 0 && <div className="sub" style={{ marginBottom: 8 }}>Maior carga: <b>{Math.max(...hist.map((h) => h.best))} kg</b> · {hist.length} treinos</div>}
            {[...hist].reverse().slice(0, 8).map((h) => (
              <div key={h.sessionId + h.date} className="hrow">
                <span>{fmtDate(h.date)}</span>
                <span className="mut">{h.sets.map((s) => `${s.kg || 0}×${s.reps || 0}`).join('  ')}</span>
              </div>
            ))}
          </div>
          {!uses.length && (
            <button className="btn ghost danger" onClick={() => {
              if (!confirm('Excluir este exercício?')) return;
              update((d) => (d.exercises = d.exercises.filter((e) => e.id !== id)));
              if (m.animation) removeFile(m.animation.path);
              if (m.video) removeFile(m.video.path);
              go('#/exercicios');
            }}><Icon name="trash" size={16} /> Excluir exercício</button>
          )}
        </div>
      </div>
    </div>
  );
}
