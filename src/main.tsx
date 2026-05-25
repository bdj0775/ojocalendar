import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// StrictMode deliberately disabled: it runs effects twice in dev, which
// causes Supabase PKCE code exchange to fire twice — the second attempt
// fails (code already consumed) and bounces OAuth users back to /login.
createRoot(rootElement).render(<App />);
