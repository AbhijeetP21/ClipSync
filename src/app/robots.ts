import type { MetadataRoute } from 'next'

const baseUrl = 'https://clipsync.abhijeetpachpute.com'

// Served at /robots.txt. Allow the public pages, keep crawlers out of the
// authenticated app routes, and point to the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/clipboard', '/saved', '/auth/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
