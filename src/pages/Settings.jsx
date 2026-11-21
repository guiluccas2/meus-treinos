import { useEffect, useState } from 'react';
import { useData, DATA_PATH } from '../store.jsx';
import { THEMES } from '../themes.js';
import { uid } from '../model.js';
import { createRepo, getRepo, getUser } from '../github.js';
import { Field, Icon } from '../components/ui.jsx';

function GitHubCard() {
  const { cfg, connect, sync, syncNow } = useData();
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('meus-treinos-dados');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pending, setPending] = useState(null); // cfg aguardando decisão de conflito / criação

  const tryConnect = async (mode = 'auto', c = null) => {
    setBusy(true);
    setMsg(null);
    try {
      let next = c;
      if (!next) {
        const user = await getUser(token.trim());
        next = { token: token.trim(), owner: user.login, repo: repo.trim(), branch: 'main' };
        try {
          const r = await getRepo(next);
          next.branch = r.default_branch || 'main';
          if (!r.private) setMsg({ t: 'warn', m: 'Atenção: este repositório é público. Recomendo deixá-lo privado (Settings → General → Change visibility).' });
        } catch (e) {
          if (e.status === 404) {
            setPending({ cfg: next, kind: 'missing' });
            return;
          }
          throw e;
        }
      }
      const r = await connect(next, mode);
      if (r === 'conflict') setPending({ cfg: next, kind: 'conflict' });
      else {
        setPending(null);
        setToken('');
        setMsg({ t: 'ok', m: r === 'remote' ? 'Conectado! Dados carregados do GitHub.' : 'Conectado! Seus dados foram enviados para o GitHub.' });
      }
    } catch (e) {
      setMsg({ t: 'err', m: e.status === 401 ? 'Token inválido.' : e.status === 403 ? 'O token não tem permissão para este repositório (precisa de "Contents: Read and write").' : e.message });
    } finally {
      setBusy(false);
    }
  };

  const doCreate = async () => {
    setBusy(true);
    try {
      const r = await createRepo(pending.cfg.token, pending.cfg.repo);
      await tryConnect('local', { ...pending.cfg, branch: r.default_branch || 'main' });
    } catch (e) {
      setBusy(false);
      setMsg({ t: 'err', m: 'Não consegui criar o repositório com este token (' + e.message + '). Crie manualmente em github.com/new e tente de novo.' });
    }
  };

  if (cfg)
    return (
      <div className="card stack">
        <h2 style={{ margin: 0 }}><Icon name="cloud" /> Salvamento no GitHub</h2>
        <div>Repositório: <a href={`https://github.com/${cfg.owner}/${cfg.repo}`} target="_blank" rel="noreferrer"><b>{cfg.owner}/{cfg.repo}</b></a> · arquivo <code>{DATA_PATH}</code></div>
        <div className="sub">Status: {sync.msg}{sync.lastSync ? ` · última sincronização ${new Date(sync.lastSync).toLocaleString('pt-BR')}` : ''}</div>
        <div className="sub">Cada alteração é salva no aparelho na hora e enviada ao GitHub alguns segundos depois (funciona offline e envia quando a internet voltar). O histórico de versões fica nos commits do repositório.</div>
        <div className="row gap8 wrap">
          <button className="btn sm" onClick={syncNow}>Sincronizar agora</button>
          <button className="btn sm ghost danger" onClick={() => confirm('Desconectar este aparelho do GitHub? Os dados continuam salvos no repositório e neste aparelho.') && connect(null)}>Desconectar</button>
        </div>
      </div>
    );

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}><Icon name="cloud" /> Salvamento automático no GitHub</h2>
      <p className="sub">Seus dados ficam num repositório <b>privado</b> seu. Assim celular e computador ficam sempre iguais, com backup e histórico.</p>
      <ol className="steps">
        <li>Crie um repositório privado chamado <b>meus-treinos-dados</b> em <a href="https://github.com/new" target="_blank" rel="noreferrer">github.com/new</a> (marque “Private” e “Add a README”).</li>
        <li>Crie um token em <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Fine-grained tokens</a>: em <i>Repository access</i> escolha “Only select repositories” → meus-treinos-dados; em <i>Permissions → Contents</i> escolha “Read and write”. Defina a validade que preferir.</li>
        <li>Cole o token abaixo e conecte. Repita este passo em cada aparelho (celular e computador).</li>
      </ol>
      <div className="grid2">
        <Field label="Token do GitHub"><input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" /></Field>
        <Field label="Repositório de dados"><input value={repo} onChange={(e) => setRepo(e.target.value)} /></Field>
      </div>
      <div className="sub">O token fica guardado só neste aparelho e é enviado apenas para api.github.com.</div>
      {!pending && <button className="btn" disabled={!token || !repo || busy} onClick={() => tryConnect()}>{busy ? 'Conectando…' : 'Conectar'}</button>}
      {pending?.kind === 'missing' && (
        <div className="note warn stack">
          <span>O repositório <b>{pending.cfg.owner}/{pending.cfg.repo}</b> não existe (ou o token não tem acesso a ele).</span>
          <div className="row gap8 wrap">
            <button className="btn sm" disabled={busy} onClick={doCreate}>Criar repositório privado agora</button>
            <button className="btn sm ghost" onClick={() => setPending(null)}>Cancelar</button>
          </div>
          <span className="sub">Criar pelo app exige um token com permissão de criar repositórios (token clássico com escopo “repo”). Com token fine-grained, crie o repositório pelo site.</span>
        </div>
      )}
      {pending?.kind === 'conflict' && (
        <div className="note warn stack">
          <span>Já existem dados no GitHub e também neste aparelho. Qual versão manter?</span>
          <div className="row gap8 wrap">
            <button className="btn sm" disabled={busy} onClick={() => tryConnect('remote', pending.cfg)}>Usar os dados do GitHub</button>
            <button className="btn sm ghost" disabled={busy} onClick={() => tryConnect('local', pending.cfg)}>Enviar os dados deste aparelho</button>
          </div>
        </div>
      )}
      {msg && <div className={'note ' + msg.t}>{msg.m}</div>}
    </div>
  );
}

function ListEditor({ title, items, onChange, withDesc, usedCount }) {
  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>{title}</h2>
      {items.map((it, i) => (
        <div key={it.id} className="led">
          <input type="color" value={it.color} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} />
          <input value={it.name} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          {withDesc && <input className="desc" value={it.desc || ''} placeholder="Descrição" onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />}
          <button className="icon-btn sm danger" title="Excluir" onClick={() => {
            const n = usedCount(it.id);
            if (n && !confirm(`"${it.name}" está em uso (${n}). Excluir mesmo assim?`)) return;
            onChange(items.filter((x) => x.id !== it.id));
          }}><Icon name="trash" size={15} /></button>
        </div>
      ))}
      <button className="btn sm ghost" onClick={() => onChange([...items, { id: uid(), name: 'Novo', color: '#94a3b8', desc: '' }])}><Icon name="plus" size={15} /> Adicionar</button>
    </div>
  );
}

export default function Settings() {
  const { data, update, replaceData } = useData();
  const [installEvt, setInstallEvt] = useState(null);
  useEffect(() => {
    const f = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);
  const S = data.settings;
  const setS = (k, v) => update((d) => (d.settings[k] = v));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `meus-treinos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="page">
      <div className="ph"><div><h1>Ajustes</h1></div></div>
      <div className="settings">
        <div className="stack">
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Aparência</h2>
            <div className="themes">
              {THEMES.map((t) => {
                const p = t[S.mode === 'light' ? 'light' : 'dark'];
                return (
                  <button key={t.id} className={'theme' + (S.theme === t.id ? ' on' : '')} onClick={() => setS('theme', t.id)} style={{ background: p.bg, color: p.tx, borderColor: S.theme === t.id ? p.ac : p.line }}>
                    <span className="theme-sw" style={{ background: p.surface, borderColor: p.line }}><i style={{ background: p.ac }} /><i style={{ background: p.surface2 }} /></span>
                    {t.name}
                  </button>
                );
              })}
            </div>
            <div className="seg">
              {[['dark', 'Escuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([k, l]) => (
                <button key={k} className={S.mode === k ? 'on' : ''} onClick={() => setS('mode', k)}>{l}</button>
              ))}
            </div>
          </div>
          <GitHubCard />
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Treino</h2>
            <div className="grid2">
              <Field label="Descanso padrão (segundos)"><input inputMode="numeric" value={S.defaultRest} onChange={(e) => setS('defaultRest', Number(e.target.value) || 0)} /></Field>
              <Field label="Aviso ao fim do descanso"><label className="check"><input type="checkbox" checked={S.sound} onChange={(e) => setS('sound', e.target.checked)} /> Som (e vibração no celular)</label></Field>
            </div>
          </div>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Instalar como app</h2>
            {installEvt ? <button className="btn" onClick={() => installEvt.prompt()}>Instalar Meus Treinos</button> : null}
            <div className="sub"><b>iPhone:</b> no Safari, toque em Compartilhar → “Adicionar à Tela de Início”.</div>
            <div className="sub"><b>Android:</b> no Chrome, menu ⋮ → “Instalar app”.</div>
            <div className="sub"><b>Computador:</b> no Chrome/Edge, ícone de instalar na barra de endereço.</div>
          </div>
          <div className="card stack">
            <h2 style={{ margin: 0 }}>Backup</h2>
            <div className="row gap8 wrap">
              <button className="btn sm ghost" onClick={exportJSON}>Exportar backup (.json)</button>
              <label className="btn sm ghost">Restaurar backup
                <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  try {
                    const d = JSON.parse(await f.text());
                    if (!d.plans || !d.sessions) throw new Error('arquivo inválido');
                    if (confirm('Substituir todos os dados atuais por este backup?')) replaceData(d);
                  } catch (err) {
                    alert('Não foi possível ler o backup: ' + err.message);
                  }
                }} />
              </label>
            </div>
          </div>
        </div>
        <div className="stack">
          <ListEditor
            title="Tipos de exercício"
            items={data.types}
            onChange={(v) => update((d) => (d.types = v))}
            usedCount={(id) => data.exercises.filter((e) => (e.typeIds || []).includes(id)).length}
          />
          <ListEditor
            title="Formas de execução"
            items={data.methods}
            withDesc
            onChange={(v) => update((d) => (d.methods = v))}
            usedCount={(id) => data.plans.reduce((a, p) => a + p.workouts.reduce((b, w) => b + w.blocks.filter((x) => x.methodId === id).length, 0), 0)}
          />
        </div>
      </div>
    </div>
  );
}
