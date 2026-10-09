import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { MaterialProvider } from './context/MaterialContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaterialProvider>
      <App />
    </MaterialProvider>
  </StrictMode>,
);
