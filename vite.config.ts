import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (['react/', 'react-dom/', 'react-router-dom/'].some(p => id.includes(p))) return 'react-vendor';
          if (id.includes('/recharts/')) return 'recharts';
          if (id.includes('/@supabase/')) return 'supabase';
          if (id.includes('/lucide-react/')) return 'lucide';
        }
      }
    }
  }
});
