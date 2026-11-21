// Acesso à API do GitHub (Contents API) para salvar os dados num repositório privado.
const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function gh(token, path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {}
    throw new GitHubError(res.status, msg);
  }
  return res;
}

// ---- base64 <-> bytes/texto (suporta UTF-8 e binários) ----
export function bytesToB64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}
export const textToB64 = (t) => bytesToB64(new TextEncoder().encode(t));
export function b64ToText(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

export async function getUser(token) {
  return (await gh(token, '/user')).json();
}

export async function getRepo(cfg) {
  return (await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}`)).json();
}

export async function createRepo(token, name) {
  return (
    await gh(token, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        private: true,
        auto_init: true,
        description: 'Dados do app Meus Treinos (salvamento automático)'
      })
    })
  ).json();
}

// Retorna { sha, text } ou null se não existir
export async function getTextFile(cfg, path) {
  try {
    const res = await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}?ref=${cfg.branch || 'main'}&t=${Date.now()}`, { cache: 'no-store' });
    const j = await res.json();
    if (j.encoding === 'base64' && j.content) return { sha: j.sha, text: b64ToText(j.content) };
    // arquivos > 1MB: buscar conteúdo bruto
    const raw = await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}?ref=${cfg.branch || 'main'}`, {
      headers: { Accept: 'application/vnd.github.raw' },
      cache: 'no-store'
    });
    return { sha: j.sha, text: await raw.text() };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function getSha(cfg, path) {
  try {
    const res = await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}?ref=${cfg.branch || 'main'}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github.object' }
    });
    return (await res.json()).sha;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function getBlob(cfg, path) {
  const res = await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}?ref=${cfg.branch || 'main'}`, {
    headers: { Accept: 'application/vnd.github.raw' }
  });
  return res.blob();
}

// Grava arquivo (base64). Se sha não for informado e o arquivo existir, busca o sha.
export async function putFile(cfg, path, b64, sha, message) {
  const body = { message: message || `Atualiza ${path}`, content: b64, branch: cfg.branch || 'main' };
  if (sha) body.sha = sha;
  try {
    const res = await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}`, { method: 'PUT', body: JSON.stringify(body) });
    return (await res.json()).content.sha;
  } catch (e) {
    if ((e.status === 409 || e.status === 422) && !body._retried) {
      const cur = await getSha(cfg, path);
      const res = await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}`, {
        method: 'PUT',
        body: JSON.stringify({ ...body, sha: cur || undefined, _retried: undefined })
      });
      return (await res.json()).content.sha;
    }
    throw e;
  }
}

export async function deleteFile(cfg, path, message) {
  const sha = await getSha(cfg, path);
  if (!sha) return;
  await gh(cfg.token, `/repos/${cfg.owner}/${cfg.repo}/contents/${enc(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message: message || `Remove ${path}`, sha, branch: cfg.branch || 'main' })
  });
}
