import { useState } from 'react';
import { useData } from '../store.jsx';
import { prescription } from '../model.js';
import { ExerciseModal, Icon, MethodBadge, TypeTags, hasMedia } from './ui.jsx';

// Lista dos blocos/exercícios de um treino (somente leitura)
export default function WorkoutPreview({ workout, compact }) {
  const { data } = useData();
  const [open, setOpen] = useState(null);
  const exName = (id) => data.exercises.find((e) => e.id === id);
  return (
    <div className="wprev">
      {workout.blocks.map((b) => {
        const grouped = b.items.length > 1;
        const m = data.methods.find((x) => x.id === b.methodId);
        return (
          <div key={b.id} className={'blk' + (grouped ? ' grouped' : '')} style={grouped ? { '--g': m?.color || 'var(--line)' } : undefined}>
            <div className="blk-h">
              <span className="blk-l">{b.label}</span>
              <MethodBadge id={b.methodId} extra={b.rest ? `desc. ${b.rest}` : ''} />
            </div>
            {b.items.map((it) => {
              const ex = exName(it.exerciseId);
              return (
                <button key={it.id} className="exrow" onClick={() => setOpen(it.exerciseId)}>
                  <span className={'thumb' + (hasMedia(ex) ? ' has' : '')}><Icon name="play" size={14} fill="currentColor" stroke={0} /></span>
                  <span className="exrow-t">
                    <b>{ex?.name || '—'}</b>
                    <small>
                      {prescription(it)}
                      {it.load ? ` · ${it.load}` : ''}
                      {it.notes ? ` · ${it.notes}` : ''}
                    </small>
                  </span>
                  {!compact && <span className="exrow-tags"><TypeTags ids={ex?.typeIds} small /></span>}
                </button>
              );
            })}
          </div>
        );
      })}
      {open && <ExerciseModal exerciseId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
