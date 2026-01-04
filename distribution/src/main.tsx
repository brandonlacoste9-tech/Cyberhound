import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main.tsx is running...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  const root = createRoot(rootElement);
  console.log('Root created, rendering App...');

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('Render called.');
} catch (e) {
  console.error('Fatal Error during mount:', e);
}
