'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Clipboard',
    href: '/clipboard',
    icon: Icons.clipboard,
  },
  {
    name: 'Saved',
    href: '/saved',
    icon: Icons.bookmark,
  },
]

export function Sidebar() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { theme } = useStore()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile sidebar trigger */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="md:hidden fixed top-4 left-4 z-50"
            onClick={() => setIsOpen(true)}
          >
            <Icons.menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pr-0">
          <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-xl font-bold">ClipSync</h1>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                <Icons.close className="h-5 w-5" />
              </Button>
            </div>
            <Separator />
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                      router.pathname === item.href && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 space-y-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <Icons.logOut className="mr-2 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r bg-card">
        <div className="flex h-16 items-center border-b px-4">
          <h1 className="text-xl font-bold">ClipSync</h1>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <div className="space-y-1 px-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                  router.pathname === item.href && 'bg-accent text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t p-4 space-y-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <Icons.logOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}