# ClipSync - Multi-Device Async Clipboard Manager

A full-stack, self-hostable clipboard manager web app that syncs text, code snippets, screenshots, and PDFs across devices in real time.

## Features

- **Real-time Sync**: Instantly sync clips across all devices using Supabase Realtime
- **Multi-Type Support**: Text, code snippets, images, and PDFs
- **Smart Input**: Auto-detects code vs text, drag-and-drop file uploads
- **Organized Storage**: Date-wise grouping for clipboard, saved pages for organization
- **Syntax Highlighting**: Beautiful code display with language detection
- **Single-User Lock**: Private instance protection
- **Light/Dark Theme**: System preference with manual override
- **Responsive Design**: Mobile-first, works on all screen sizes
- **Secure**: Row Level Security, encrypted storage, no public APIs

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Rich Text**: Tiptap editor with syntax highlighting
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Deployment**: Vercel (serverless)
- **File Uploads**: Supabase Storage with private buckets
- **Drag & Drop**: @dnd-kit/core for reordering

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/clipsync.git
   cd clipsync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [Supabase](https://supabase.com)
   - Copy your project URL and API keys

4. **Environment Variables**
   Create a `.env.local` file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

5. **Database Setup**
   - Run the migrations in Supabase SQL Editor:
     ```sql
     -- Run the contents of supabase/migrations/001_initial_schema.sql
     -- Run the contents of supabase/migrations/002_cleanup_function.sql
     ```

6. **Storage Setup**
   - Go to Storage → Settings in Supabase Dashboard
   - Create a new bucket named `clips-files` (set to private)
   - Add the following policy:
     ```sql
     CREATE POLICY "Users can upload files" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'clips-files' AND auth.uid() = owner);
     
     CREATE POLICY "Users can read their files" ON storage.objects
     FOR SELECT USING (bucket_id = 'clips-files' AND auth.uid() = owner);
     
     CREATE POLICY "Users can delete their files" ON storage.objects
     FOR DELETE USING (bucket_id = 'clips-files' AND auth.uid() = owner);
     ```

7. **Enable Realtime**
   - Go to Database → Replication in Supabase Dashboard
   - Enable replication for `clips` and `saved_notes` tables

8. **Set up pg_cron for cleanup**
   - Go to Extensions in Supabase Dashboard
   - Enable `pg_cron` extension
   - Create a cron job to run daily cleanup:
     ```sql
     SELECT cron.schedule(
       'cleanup-old-clips',
       '0 2 * * *', -- Daily at 2 AM UTC
       'SELECT cleanup_old_files();'
     );
     ```

9. **Start development server**
   ```bash
   npm run dev
   ```

10. **Open your browser**
    Visit `http://localhost:3000` and sign up with your email

## Authentication

ClipSync uses Supabase Auth with:
- **Magic Link**: Email-based passwordless authentication
- **Google OAuth**: Optional Google sign-in
- **Single-User Lock**: After first signup, the instance becomes private

## Detailed Supabase Setup

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in project details:
   - **Name**: `clipsync`
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
4. Wait for project creation (2-5 minutes)

### Step 2: Get API Credentials

1. Go to your project settings
2. Navigate to **Settings → API**
3. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Configure Authentication

1. Go to **Authentication → Settings**
2. Set **Site URL** to `http://localhost:3000` (for development)
3. Add redirect URLs:
   - `http://localhost:3000/login`
   - `http://localhost:3000/`
4. Enable **Email** provider
5. (Optional) Configure Google OAuth:
   - Go to **External OAuth Providers**
   - Enable Google
   - Add your Google OAuth credentials

### Step 4: Set Up Database

1. Go to **SQL Editor**
2. Run the migration from `supabase/migrations/001_initial_schema.sql`
3. Run the cleanup function from `supabase/migrations/002_cleanup_function.sql`

### Step 5: Configure Storage

1. Go to **Storage → Settings**
2. Click **Create bucket**
3. Name: `clips-files`
4. Set to **Private**
5. Go to **Storage → Policies**
6. Create these policies:

**Upload Policy:**
```sql
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'clips-files' AND auth.uid() = owner);
```

**Read Policy:**
```sql
CREATE POLICY "Users can read their files" ON storage.objects
FOR SELECT USING (bucket_id = 'clips-files' AND auth.uid() = owner);
```

**Delete Policy:**
```sql
CREATE POLICY "Users can delete their files" ON storage.objects
FOR DELETE USING (bucket_id = 'clips-files' AND auth.uid() = owner);
```

### Step 6: Enable Realtime

1. Go to **Database → Replication**
2. Enable replication for:
   - `clips` table
   - `saved_notes` table
3. Set **Max replication lag** to 10 seconds

### Step 7: Set Up pg_cron

1. Go to **Database → Extensions**
2. Find and enable `pg_cron`
3. Go to **Database → SQL Editor**
4. Run the cleanup job setup:
```sql
SELECT cron.schedule(
  'cleanup-old-clips',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT cleanup_old_files();'
);
```

### Step 8: Configure Row Level Security

All tables should have RLS enabled with appropriate policies. The migration files include these policies, but verify:

1. **clips table**: Only owner can access
2. **saved_pages table**: Only owner can access
3. **saved_notes table**: Only owner can access
4. **config table**: Only authenticated users can read

### Step 9: Test Your Setup

1. Set environment variables in your `.env.local`
2. Run `npm run dev`
3. Visit `http://localhost:3000`
4. Try signing up with your email
5. Test file uploads and real-time sync

## Vercel Deployment Setup

### Step 1: Prepare for Production

1. **Update redirect URLs** in Supabase:
   - Replace `http://localhost:3000` with your Vercel URL
   - Example: `https://clipsync.vercel.app`

2. **Create production environment variables**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
   ```

### Step 2: Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/clipsync.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click **New Project**
   - Import your GitHub repository
   - Configure project settings:
     - **Framework Preset**: Next.js
     - **Root Directory**: `/` (root)
     - **Build Command**: `npm run build`
     - **Output Directory**: `.next`
     - **Development Command**: `npm run dev`

3. **Set Environment Variables**:
   - Go to **Settings → Environment Variables**
   - Add the three Supabase environment variables
   - Set **Environment** to **Production**

4. **Deploy**:
   - Click **Deploy**
   - Wait for deployment to complete
   - Note your production URL

### Step 3: Post-Deployment Configuration

1. **Update Supabase settings**:
   - Go to **Authentication → Settings**
   - Update **Site URL** to your Vercel URL
   - Update redirect URLs

2. **Run migrations**:
   - Go to **SQL Editor** in Supabase
   - Run the migration files if not already done

3. **Test production deployment**:
   - Visit your Vercel URL
   - Test authentication
   - Test file uploads
   - Test real-time sync

### Step 4: Monitoring and Maintenance

1. **Monitor usage**:
   - Check Supabase dashboard for API usage
   - Monitor storage usage
   - Check Vercel logs for errors

2. **Set up alerts**:
   - Configure Supabase usage alerts
   - Set up Vercel deployment notifications

3. **Regular maintenance**:
   - Monitor pg_cron job execution
   - Check for failed file uploads
   - Review security settings periodically

### Troubleshooting Deployment

**Environment Variables Not Set**:
- Verify all three Supabase variables are set in Vercel
- Check that variables are set to **Production** environment
- Redeploy after making changes

**Authentication Fails**:
- Verify redirect URLs match your Vercel domain
- Check that Supabase project URL is correct
- Ensure anon key is correct

**File Uploads Fail**:
- Verify storage bucket policies are correct
- Check that bucket is set to private
- Ensure file size limits are appropriate

**Real-time Sync Not Working**:
- Verify realtime is enabled for tables
- Check that RLS policies allow realtime subscriptions
- Ensure Supabase plan supports realtime features

**Build Errors**:
- Check that all dependencies are in package.json
- Verify TypeScript configuration
- Check for any hardcoded localhost URLs

## Database Schema

### Tables

- **`config`**: Single-user lock configuration
- **`clips`**: Clipboard entries with 7-day auto-expiry
- **`saved_pages`**: User-created pages for organization
- **`saved_notes`**: Notes within saved pages

All tables use Row Level Security (RLS) to ensure data isolation.

## File Storage

- Files are stored in Supabase Storage bucket `clips-files`
- Bucket is private (not public)
- Files are served via signed URLs (1-hour expiry)
- Automatic cleanup of old files via pg_cron

## Security Features

- **Row Level Security**: All database tables protected
- **Private Storage**: No public file access
- **Signed URLs**: Temporary access to files
- **Content Security Policy**: Prevents XSS attacks
- **Noindex Headers**: Prevents search engine indexing
- **Single-User Lock**: Private instance protection

## Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/clipsync.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [Vercel](https://vercel.com) and import your GitHub repository
   - Set environment variables in Vercel Dashboard
   - Deploy!

3. **Post-deployment setup**
   - Run database migrations in your Supabase project
   - Set up storage bucket and policies
   - Enable realtime for tables
   - Configure pg_cron cleanup job

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript check

### Project Structure

```
clipsync/
├── app/                    # Next.js App Router pages
│   ├── login/             # Authentication page
│   ├── clipboard/         # Main clipboard interface
│   ├── saved/             # Saved pages management
│   └── saved/[pageId]/    # Individual saved pages
├── components/            # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Core logic and utilities
├── types/                # TypeScript type definitions
├── supabase/             # Database migrations
└── public/               # Static assets
```

### Adding New Features

1. Follow the existing patterns for state management (Zustand)
2. Use shadcn/ui components for consistent UI
3. Add TypeScript types to `/types/index.ts`
4. Write database migrations for schema changes
5. Update RLS policies for new tables
6. Add tests for critical functionality

## Troubleshooting

### Common Issues

**Authentication fails**
- Check Supabase Auth settings
- Verify email redirect URLs
- Ensure single-user lock is configured correctly

**Files not uploading**
- Verify storage bucket exists and is private
- Check storage policies are correctly set
- Ensure file size is under 10MB limit

**Real-time sync not working**
- Verify realtime is enabled for tables
- Check Supabase project plan supports realtime
- Ensure RLS policies allow realtime subscriptions

**Build errors**
- Check all environment variables are set
- Verify Supabase client configuration
- Ensure all dependencies are installed

### Getting Help

- Check the [Supabase documentation](https://supabase.com/docs)
- Review [Next.js documentation](https://nextjs.org/docs)
- File issues on the GitHub repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

**Key terms:**
- ✅ **Free for individuals**: You can use this project freely for personal, educational, or non-commercial purposes
- ✅ **Attribution required**: You must give appropriate credit and indicate if changes were made
- ❌ **Commercial use prohibited**: You cannot use this project for any commercial purpose or generate revenue from it
- ❌ **No commercial licensing**: If you need to use this project commercially, please contact the author for a commercial license

For the full legal code and more details, see the [LICENSE](LICENSE) file or visit [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/).

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review Supabase and Next.js docs

---

**ClipSync** - Keep your clipboard organized across all devices.