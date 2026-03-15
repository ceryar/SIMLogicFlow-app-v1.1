import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Solo genera el manifest.webmanifest — el SW lo registramos manualmente
    VitePWA({
      registerType: 'prompt',   // no auto-registra; lo hacemos en main.jsx
      injectRegister: false,    // no inyecta registro automático
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // Solo el manifest es necesario:
      manifest: {
        name: 'SimLogicFlow',
        short_name: 'SimLogicFlow',
        description: 'Sistema de gestión de simuladores de vuelo',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'landscape-primary',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        // Al usar injectManifest, podemos decidir si queremos inyectar el manifest o no
        // Por ahora lo dejaremos configurado para que funcione con el placeholder
        injectionPoint: 'self.__WB_MANIFEST',
      },
      devOptions: {
        enabled: true, // Permitir ver el SW en dev para depurar mejor
        type: 'module',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://simlogicflow-api-v11-production.up.railway.app',
        changeOrigin: true,
      }
    }
  }
})
