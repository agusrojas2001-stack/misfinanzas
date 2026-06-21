import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(async ({ mode }) => {
  const plugins = [react()]

  if (mode === 'production') {
    const { VitePWA } = await import('vite-plugin-pwa')
    plugins.push(
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Mis Numeritos',
          short_name: 'Numeritos',
          description: 'Tus finanzas personales, simples y claras.',
          theme_color: '#7c3aed',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
      })
    )
  }

  return { plugins }
})
