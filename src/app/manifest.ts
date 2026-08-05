import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rehab.AI',
    short_name: 'Rehab.AI',
    description: 'Clinical-Grade Physiotherapy Self-Tracking',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F4EE',
    theme_color: '#3C6E5E',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
