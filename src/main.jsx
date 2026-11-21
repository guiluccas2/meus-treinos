import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { DataProvider } from './store.jsx';
import App from './App.jsx';
import './styles.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <DataProvider>
    <App />
  </DataProvider>
);
