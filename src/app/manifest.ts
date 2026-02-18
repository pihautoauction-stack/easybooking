import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EasyBooking',
    short_name: 'EasyBooking',
    description: 'Система онлайн-записи',
    start_url: '/',
    display: 'standalone', // Убирает адресную строку браузера (выглядит как нативное приложение)
    background_color: '#F9FAFB',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-192.png', // Сюда положи картинку логотипа 192x192 пикселя
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png', // И сюда 512x512 пикселей
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  };
}