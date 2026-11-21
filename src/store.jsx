// Estado global + salvamento automático (local e GitHub).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { emptyData } from './model.js';
import { getTextFile, putFile, textToB64 } from './github.js';
import { processMediaQueue } from './media.js';

const LS_DATA = 'mt:data';
const LS_META = 'mt:meta';
const LS_CFG = 'mt:github';
export const DATA_PATH = 'dados/meus-treinos.json';
const PUSH_DELAY = 3000;

const readJSON = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};

// Garante que dados antigos ganhem campos novos
export function migrate(d) {
  const base = emptyData();
  const out = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  for (const k of ['types', 'methods', 'exercises', 'plans', 'sessions']) if (!Array.isArray(out[k])) out[k] = base[k];
  return out;
}

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

export function DataProvider({ children }) {
  const [data, setData] = useState(() => migrate(readJSON(LS_DATA, emptyData())));
  const [cfg, setCfg] = useState(() => readJSON(LS_CFG, null));
  const [sync, setSync] = useState({ state: 'idle', msg: '' });
  const dataRef = useRef(data);
  const cfgRef = useRef(cfg);
  const meta = useRef(readJSON(LS_META, { sha: null, dirty: false, lastSync: null }));
  const timer = useRef(null);
  const pushing = useRef(false);

  const saveMeta = () => localStorage.setItem(LS_META, JSON.stringify(meta.current));
  const configured = () => {
    const c = cfgRef.current;
    return c && c.token && c.owner && c.repo;
  };

  const push = useCallback(async () => {
    clearTimeout(timer.current);
    if (!configured()) return setSync({ state: 'local', msg: 'Salvo neste aparelho' });
    if (!navigator.onLine) return setSync({ state: 'offline', msg: 'Sem internet — salvo no aparelho' });
    if (pushing.current) {
      timer.current = setTimeout(push, 1500);
      return;
    }
    pushing.current = true;
    const snapshot = dataRef.current;
    setSync({ state: 'saving', msg: 'Salvando no GitHub…' });
    try {
      if (meta.current.dirty) {
        const sha = await putFile(
          cfgRef.current,
          DATA_PATH,
          textToB64(JSON.stringify(snapshot, null, 1)),
          meta.current.sha,
          `Salvamento automático — ${new Date().toLocaleString('pt-BR')}`
        );
        meta.current.sha = sha;
        if (dataRef.current === snapshot) meta.current.dirty = false;
      }
      meta.current.lastSync = new Date().toISOString();
      saveMeta();
      await processMediaQueue(cfgRef.current);
      setSync({ state: 'saved', msg: 'Sincronizado' });
      if (meta.current.dirty) timer.current = setTimeout(push, PUSH_DELAY);
    } catch (e) {
      console.error(e);
      setSync({ state: 'error', msg: e.status === 401 ? 'Token inválido ou expirado' : 'Erro ao salvar: ' + e.message });
      timer.current = setTimeout(push, 30000);
    } finally {
      pushing.current = false;
    }
  }, []);

  const replaceData = useCallback((d, { dirty = true } = {}) => {
    const next = migrate(d);
    dataRef.current = next;
    setData(next);
    localStorage.setItem(LS_DATA, JSON.stringify(next));
    if (dirty) {
      meta.current.dirty = true;
      saveMeta();
      clearTimeout(timer.current);
      timer.current = setTimeout(push, PUSH_DELAY);
      setSync((s) => (configured() ? { state: 'pending', msg: 'Alterações a salvar…' } : { state: 'local', msg: 'Salvo neste aparelho' }));
    }
  }, [push]);

  // update(d => { ...mutação... })
  const update = useCallback((mutator) => {
    const next = structuredClone(dataRef.current);
    mutator(next);
    next.updatedAt = new Date().toISOString();
    replaceData(next);
  }, [replaceData]);

  const pull = useCallback(async () => {
    if (!configured() || !navigator.onLine || pushing.current) return;
    try {
      setSync((s) => (s.state === 'saving' ? s : { state: 'pulling', msg: 'Verificando atualizações…' }));
      const remote = await getTextFile(cfgRef.current, DATA_PATH);
      if (!remote) {
        meta.current.dirty = true;
        saveMeta();
        return push();
      }
      if (remote.sha !== meta.current.sha) {
        if (!meta.current.dirty) {
          meta.current.sha = remote.sha;
          saveMeta();
          replaceData(JSON.parse(remote.text), { dirty: false });
        } else {
          // há alterações locais: o aparelho prevalece (o histórico do Git guarda a versão anterior)
          meta.current.sha = remote.sha;
          saveMeta();
          return push();
        }
      }
      meta.current.lastSync = new Date().toISOString();
      saveMeta();
      if (meta.current.dirty) return push();
      await processMediaQueue(cfgRef.current);
      setSync({ state: 'saved', msg: 'Sincronizado' });
    } catch (e) {
      console.error(e);
      setSync({ state: 'error', msg: e.status === 401 ? 'Token inválido ou expirado' : e.status === 404 ? 'Repositório não encontrado' : 'Erro de sincronização: ' + e.message });
    }
  }, [push, replaceData]);

  // Conecta a um repositório. mode: 'auto' | 'remote' (usar dados do GitHub) | 'local' (enviar dados deste aparelho)
  const connect = useCallback(async (newCfg, mode = 'auto') => {
    cfgRef.current = newCfg;
    setCfg(newCfg);
    if (newCfg) localStorage.setItem(LS_CFG, JSON.stringify(newCfg));
    else localStorage.removeItem(LS_CFG);
    meta.current = { sha: null, dirty: false, lastSync: null };
    if (!newCfg) {
      saveMeta();
      return setSync({ state: 'local', msg: 'Salvo neste aparelho' });
    }
    const remote = await getTextFile(newCfg, DATA_PATH);
    const local = dataRef.current;
    const localHasData = local.plans.length || local.sessions.length || local.exercises.length;
    if (remote && (mode === 'remote' || (mode === 'auto' && !localHasData))) {
      meta.current.sha = remote.sha;
      saveMeta();
      replaceData(JSON.parse(remote.text), { dirty: false });
      setSync({ state: 'saved', msg: 'Sincronizado' });
      return 'remote';
    }
    if (remote && mode === 'auto' && localHasData) {
      return 'conflict';
    }
    meta.current.sha = remote ? remote.sha : null;
    meta.current.dirty = true;
    saveMeta();
    await push();
    return 'local';
  }, [push, replaceData]);

  useEffect(() => {
    if (configured()) pull();
    else setSync({ state: 'local', msg: 'Salvo neste aparelho' });
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (meta.current.dirty) push();
      } else pull();
    };
    const onOnline = () => (meta.current.dirty ? push() : pull());
    const onOffline = () => setSync({ state: 'offline', msg: 'Sem internet — salvo no aparelho' });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible' && !meta.current.dirty) pull();
    }, 120000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(iv);
    };
  }, [pull, push]);

  const value = {
    data,
    update,
    replaceData,
    cfg,
    connect,
    sync: { ...sync, lastSync: meta.current.lastSync, dirty: meta.current.dirty },
    syncNow: () => (meta.current.dirty ? push() : pull()),
    kickMedia: () => push()
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
