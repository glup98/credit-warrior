import type { MetadataRoute } from 'next';

/**
 * Web App Manifest defining standalone PWA parameters and branding assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Credit Warrior Web',
    short_name: 'CreditWarrior',
    description: 'Gestión de tarjetas de crédito compartidas y cuotas multimoneda',
    start_url: '/',
    display: 'standalone',
    background_color: '#090A0F',
    theme_color: '#090A0F',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
