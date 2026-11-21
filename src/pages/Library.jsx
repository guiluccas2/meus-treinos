import { useState } from 'react';
import { useData } from '../store.jsx';
import { norm, uid } from '../model.js';
import { Empty, Icon, TypeTags, go, hasMedia } from '../components/ui.jsx';

export function usageOf(data, exId) {
  const out = [];
  for (const p of data.plans) for (const w of p.workouts) for (const b of w.blocks) for (const it of b.items) if (it.exerciseId === exId) out.push({ plan: p, workout: w, block: b, item: it });
  return out;
}

export default function Library() {
  const { data, update } = useData();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [noMedia, setNoMedia] = useState(false);
  const list = data.exercises
    .filter((e) => !q || norm(e.name).includes(norm(q)))
    .filter((e) => !type || (e.typeIds || []).includes(type))
    .filter((e) => !noMedia || !hasMedia(e))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const withMedia = data.exercises.filter(hasMedia).length;
  const create = () => {
    const ex = { id: uid(), name: q.trim() || 'Novo exercício', typeIds: type ? [type] : [], region: '', notes: '', media: {} };
    update((d) => d.exercises.push(ex));
    go('#/exercicio/' + ex.id);
  };
  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Exercícios</h1>
          <div className="sub">{data.exercises.length} exercícios · {withMedia} com vídeo ou animação</div>
        </div>
        <button className="btn" onClick={create}><Icon name="plus" size={18} /> Novo exercício</button>
      </div>
      <input className="search" placeholder="Buscar exercício…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips-row">
        <button className={'chip' + (!type ? ' on' : '')} onClick={() => setType('')}>Todos</button>
        {data.types.map((t) => (
          <button key={t.id} className={'chip' + (type === t.id ? ' on' : '')} style={{ '--c': t.color }} onClick={() => setType(type === t.id ? '' : t.id)}>{t.name}</button>
        ))}
        <button className={'chip' + (noMedia ? ' on' : '')} onClick={() => setNoMedia(!noMedia)}>Sem mídia</button>
      </div>
      {!list.length && <Empty title="Nenhum exercício encontrado">{q && <button className="btn" onClick={create}>Criar “{q}”</button>}</Empty>}
      <div className="exgrid">
        {list.map((e) => {
          const uses = usageOf(data, e.id).length;
          return (
            <a key={e.id} className="card excard" href={'#/exercicio/' + e.id}>
              <span className={'thumb lg' + (hasMedia(e) ? ' has' : '')}><Icon name={e.media?.animation ? 'play' : e.media?.youtube?.url || e.media?.video ? 'video' : 'dumbbell'} size={18} /></span>
              <span className="excard-t">
                <b>{e.name}</b>
                <span className="row gap6 wrap"><TypeTags ids={e.typeIds} small />{e.region && <span className="tag sm neutral">{e.region}</span>}</span>
                <small className="mut">{uses ? `em ${uses} treino${uses > 1 ? 's' : ''}` : 'não usado em planilhas'}{e.media?.animation ? ' · animação IA' : ''}</small>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
