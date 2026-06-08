'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSavedPages } from '@/hooks/useSavedPages'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Icons } from '@/components/icons'

const EMOJI_OPTIONS = [
  '📄', '📝', '📋', '📚', '📖', '📁', '📂', '🗂️', '📌', '🔖',
  '💡', '🎯', '⭐', '🔥', '🚀', '⚡', '🔧', '⚙️', '🛠️', '✅'
]

export default function SavedPagesPage() {
  const { pages, createPage, deletePage } = useSavedPages()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pageName, setPageName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📄')

  const handleCreatePage = async () => {
    if (!pageName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a page name.',
        variant: 'destructive',
      })
      return
    }

    const result = await createPage(pageName.trim(), selectedEmoji)
    if (result) {
      toast({
        title: 'Page Created',
        description: 'Your saved page has been created.',
      })
      setPageName('')
      setSelectedEmoji('📄')
      setIsDialogOpen(false)
    } else {
      toast({
        title: 'Error',
        description: 'Failed to create page. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePage = async (pageId: string, pageName: string) => {
    const confirmed = confirm(`Are you sure you want to delete "${pageName}"? This will also delete all notes inside.`)
    if (confirmed) {
      const success = await deletePage(pageId)
      if (success) {
        toast({
          title: 'Page Deleted',
          description: 'Your saved page has been deleted.',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete page. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 pl-16 border-b md:pl-4">
        <div>
          <h1 className="text-2xl font-bold">Saved Pages</h1>
          <p className="text-sm text-muted-foreground">
            Organize your clips into pages for easy access
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              New Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
              <DialogDescription>
                Choose a name and emoji for your new saved page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="page-name">Page Name</Label>
                <Input
                  id="page-name"
                  placeholder="Enter page name..."
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji</Label>
                <div className="grid grid-cols-10 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant={selectedEmoji === emoji ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedEmoji(emoji)}
                      className="text-lg"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreatePage}>
                <Icons.plus className="mr-2 h-4 w-4" />
                Create Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pages Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {pages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icons.bookmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">No saved pages yet</p>
              <p className="text-sm">Create your first saved page to organize your clips.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map((page) => (
                <Link key={page.id} href={`/saved/${page.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{page.emoji}</span>
                          <div>
                            <CardTitle>{page.name}</CardTitle>
                            <CardDescription>
                              {page.notes_count || 0} notes
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeletePage(page.id, page.name)
                          }}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Icons.trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        Click to view and manage notes in this page
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}