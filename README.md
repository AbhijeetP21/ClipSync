# ClipSync - Multi-Device Clipboard Manager

A full-stack, self-hostable clipboard manager that syncs text, code snippets, images, and PDFs across devices in real time. Each user gets their own private clipboard, isolated by Postgres Row Level Security.

Live demo: https://clipsync.abhijeetpachpute.com

## Features

- Real-time sync across devices using Supabase Realtime
- Multi-type clips: plain text, code snippets, images, and PDFs
- File uploads to private storage, with in-app image and PDF previews and downloads via short-lived signed URLs
- Saved pages: organize clips into named pages, and save any clip to a page (the file is copied so the original and the saved note are independent)
- Trash bin for saved notes: deleting a note moves it to trash for 7 days, where it can be restored or permanently deleted, after which it is purged automatically. Files are preserved while in trash
- Drag-and-drop reordering of saved notes
- Multi-user: anyone can sign in and gets their own private clipboard
- Authentication via passwordless magic link and Google OAuth
- Light, dark, and system themes
- Keyboard shortcut: Ctrl+Enter (Cmd+Enter on macOS) to submit a clip
- Responsive, mobile-first layout

## Tech Stack

- Framework: Next.js 16 (App Router), React 19, TypeScript
- Styling: Tailwind CSS v4 with shadcn/ui components
- State management: Zustand
- Backend: Supabase (Auth, Postgres, Storage, Realtime)
- Drag and drop: dnd-kit
- Notifications: Sonner
- Deployment: Vercel

## How It Works

- Authentication is handled by Supabase Auth. Every clip, page, and note row carries a `user_id`, and Row Level Security policies (`auth.uid() = user_id`) ensure each user can only read and write their own data.
- Files are stored in a private Supabase Storage bucket named `clips-files`, namespaced per user. They are never public; the app generates short-lived signed URLs for previews and downloads.
- Realtime subscriptions keep clips and saved notes in sync across a user's devices. Signing in with the same account on another device shows the same clipboard.

## Prerequisites

- Node.js 20 or newer
- A Supabase project
- npm

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/AbhijeetP21/ClipSync.git
cd ClipSync
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Notes:
- The browser key is the new Supabase publishable key (`sb_publishable_...`). The app also accepts the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a fallback.
- The service role key is not used by the application code, so you do not need to set it.

### 3. Set up the database

In the Supabase dashboard, open the SQL Editor and run the migrations in order:

1. `supabase/migrations/001_initial_schema.sql` - creates the `config`, `clips`, `saved_pages`, and `saved_notes` tables with Row Level Security and policies
2. `supabase/migrations/002_cleanup_function.sql` - creates optional cleanup helper functions
3. `supabase/migrations/003_trash_bin.sql` - adds the `deleted_at` column used by the saved-notes trash bin

### 4. Set up storage

1. Go to Storage and create a new bucket named `clips-files`. Keep it private.
2. In the SQL Editor, add the access policies:

```sql
create policy "Users can upload files"
on storage.objects for insert
with check (bucket_id = 'clips-files' and auth.uid() = owner);

create policy "Users can read their files"
on storage.objects for select
using (bucket_id = 'clips-files' and auth.uid() = owner);

create policy "Users can delete their files"
on storage.objects for delete
using (bucket_id = 'clips-files' and auth.uid() = owner);
```

### 5. Enable Realtime

In Database, open Publications and enable the `supabase_realtime` publication for the `clips` and `saved_notes` tables.

### 6. Configure authentication

1. In Authentication, under URL Configuration, set the Site URL to `http://localhost:3000` for local development and add `http://localhost:3000/**` to the redirect allow list.
2. Enable the Email provider for magic-link sign-in.
3. To enable Google sign-in, configure the Google provider with a Client ID and Client Secret from the Google Cloud Console, and add the Supabase callback URL (`https://your-project.supabase.co/auth/v1/callback`) to the authorized redirect URIs in Google Cloud Console.

By default, Supabase's built-in email sender is heavily rate limited and intended only for testing. For reliable magic-link delivery to any recipient, configure custom SMTP (for example, Resend) with a verified sending domain.

### 7. Run the development server

```bash
npm run dev
```

Open http://localhost:3000.

## Project Structure

```
ClipSync/
├── src/
│   ├── app/                 # Next.js App Router routes
│   │   ├── login/           # Sign-in page
│   │   ├── auth/callback/   # OAuth and magic-link callback
│   │   ├── clipboard/       # Main clipboard view
│   │   └── saved/           # Saved pages and per-page view
│   ├── components/          # UI components
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # Data hooks (useAuth, useClips, useSavedPages)
│   ├── lib/                 # Supabase client, Zustand store, realtime helpers, utils
│   └── types/               # TypeScript type definitions
├── supabase/migrations/     # SQL migrations
└── public/                  # Static assets
```

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - start the production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run the TypeScript compiler without emitting

## Deployment to Vercel

1. Push the repository to GitHub and import it into Vercel. The Next.js preset is detected automatically.
2. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel project settings.
3. Deploy, then note the production URL.
4. In Supabase, under Authentication and URL Configuration, set the Site URL to your Vercel URL and add `https://your-app.vercel.app/**` to the redirect allow list. The Google redirect URI stays the Supabase callback and does not change.

After the first import, every push to the production branch triggers an automatic deployment.

## Security Notes

- Row Level Security is enabled on all tables, so users can only access their own data.
- The storage bucket is private. Files are served only through short-lived signed URLs.
- A Content Security Policy and other security headers are set in `next.config.ts`.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license.

- Free for personal, educational, and other non-commercial use
- Attribution required
- Commercial use is not permitted without a separate license from the author

See the [LICENSE](LICENSE) file or https://creativecommons.org/licenses/by-nc/4.0/ for the full terms.
