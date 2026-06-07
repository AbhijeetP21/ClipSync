'use client'

import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'

export function ThemeToggle() {
  const { theme, setTheme } = useStore()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Icons.sun className="h-5 w-5" />
      case 'dark':
        return <Icons.moon className="h-5 w-5" />
      default:
        return <Icons.monitor className="h-5 w-5" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      default:
        return 'System'
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start"
    >
      {getThemeIcon()}
      <span className="ml-2">{getThemeLabel()}</span>
    </Button>
  )
}