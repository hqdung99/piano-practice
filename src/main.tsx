import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const rootEl = document.getElementById('root');
if (rootEl) {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      overflow-x: hidden;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  `;
  document.head.appendChild(style);

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
