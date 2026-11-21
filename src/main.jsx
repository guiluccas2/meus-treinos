import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { DataProvider } from './store.jsx';
import App from './App.jsx';
import { reloadForUpdate } from './update.js';
import './styles.css';

// procura versão nova ao abrir, a cada hora e ao voltar para o app
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }
});

// arquivo de uma versão antiga não encontrado -> recarrega com a versão nova
window.addEventListener('vite:preloadError', (e) => {
  if (reloadForUpdate()) e.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <DataProvider>
    <App />
  </DataProvider>
);
