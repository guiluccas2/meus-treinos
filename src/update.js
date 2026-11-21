// Atualizações do app: quando uma nova versão é publicada, partes carregadas sob demanda
// (leitor de Word, IA de animação) mudam de nome. Se a página ainda for a versão antiga,
// recarregamos uma vez para pegar a versão nova.
export function isChunkError(e) {
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Loading chunk|Failed to load module script/i.test(String(e?.message || e));
}

export function reloadForUpdate() {
  const k = 'mt:reloadAt';
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(k)) || 0;
  } catch {}
  if (Date.now() - last < 20000) return false; // evita recarregar em loop
  try {
    sessionStorage.setItem(k, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}

// import() que se recupera de uma versão desatualizada
export async function lazyImport(loader) {
  try {
    return await loader();
  } catch (e) {
    if (isChunkError(e) && reloadForUpdate()) {
      throw new Error('O app foi atualizado. Recarregando para a versão nova…');
    }
    throw e;
  }
}
