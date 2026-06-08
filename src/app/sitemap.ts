import type { MetadataRoute } from 'next'

const baseUrl = 'https://clipsync.abhijeetpachpute.com'

// Served at /sitemap.xml. Only the public pages are listed; the app itself is
// behind authentication and is intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}
