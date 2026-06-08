'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Icons } from '@/components/icons'

const REPO_URL = 'https://github.com/AbhijeetP21/ClipSync'

const features = [
  {
    icon: Icons.refresh,
    title: 'Real-time sync',
    desc: 'Capture on one device and it appears on the others within a second. No pairing, just sign in.',
  },
  {
    icon: Icons.code,
    title: 'Text, code, images, PDFs',
    desc: 'Save any kind of snippet. Code keeps its language label, and files get inline previews.',
  },
  {
    icon: Icons.bookmark,
    title: 'Saved pages',
    desc: 'Organize the clips worth keeping into named pages, with drag-and-drop ordering.',
  },
  {
    icon: Icons.restore,
    title: 'Trash bin',
    desc: 'Deleted notes are recoverable for 7 days, files included, before they are purged automatically.',
  },
  {
    icon: Icons.lock,
    title: 'Private by design',
    desc: 'Each account is isolated at the database level. Files are served only through short-lived links.',
  },
  {
    icon: Icons.monitor,
    title: 'Yours, anywhere',
    desc: 'Works in any browser on any device, with light, dark, and system themes built in.',
  },
]

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  // Signed-in users skip the landing and go straight to the app.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/clipboard')
    }
  }, [isLoading, isAuthenticated, router])

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold">ClipSync</span>
        <div className="flex items-center gap-2">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              GitHub
            </Button>
          </a>
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Your clipboard, synced across every device
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          ClipSync keeps the text, code, images, and PDFs you copy in sync in real time. Stop
          messaging yourself to move things between your phone and your laptop.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              <Icons.clipboard className="mr-2 h-5 w-5" />
              Get started
            </Button>
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Icons.code className="mr-2 h-5 w-5" />
              View source
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="space-y-2 p-6">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>Built with Next.js, React, and Supabase.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
