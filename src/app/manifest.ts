import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexio ERP',
    short_name: 'Nexio',
    description: 'Больше, чем просто онлайн-запись',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#FB7185',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}