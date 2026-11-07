import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// mode "lan" (npm run dev:lan): open the dev server to the local network over HTTPS,
// because browsers only allow the camera on HTTPS pages (and localhost).
// The certificate is self-signed: the phone shows a warning once, accept it to continue.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'lan' ? [basicSsl()] : [])],
  server: {
    host: mode === 'lan' ? true : undefined,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
}))
