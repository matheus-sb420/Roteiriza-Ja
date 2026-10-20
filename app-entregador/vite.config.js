import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true deixa abrir pelo IP do computador (ex.: no celular, na mesma rede).
  server: { port: 5174, host: true },
});
