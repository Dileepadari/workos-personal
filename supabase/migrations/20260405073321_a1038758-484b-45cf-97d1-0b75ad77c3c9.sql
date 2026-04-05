
-- Add missing columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS collab_password_hash TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS target_end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS repo_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status_note TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);

-- Add missing columns to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_estimate_min INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_label TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own milestones" ON public.milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own milestones" ON public.milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones" ON public.milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own milestones" ON public.milestones FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  type TEXT NOT NULL DEFAULT 'link',
  file_path TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own resources" ON public.resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own resources" ON public.resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resources" ON public.resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resources" ON public.resources FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discussions table
CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  body_html TEXT NOT NULL,
  author TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'owner',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own discussions" ON public.discussions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own discussions" ON public.discussions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own discussions" ON public.discussions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own discussions" ON public.discussions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attendees TEXT,
  agenda_html TEXT,
  notes_html TEXT,
  action_items TEXT,
  gcal_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meetings" ON public.meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own meetings" ON public.meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meetings" ON public.meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meetings" ON public.meetings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Links (Link Vault) table
CREATE TABLE public.links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  short_key TEXT,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  category TEXT DEFAULT 'other',
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own links" ON public.links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own links" ON public.links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own links" ON public.links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own links" ON public.links FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_links_short_key ON public.links(short_key);
CREATE INDEX idx_links_tags ON public.links USING GIN(tags);

-- Daily Log table
CREATE TABLE public.daily_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes_html TEXT,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  wins TEXT[] DEFAULT '{}',
  blockers TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.daily_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.daily_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own logs" ON public.daily_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.daily_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.daily_log FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_daily_log_updated_at BEFORE UPDATE ON public.daily_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_milestones_project ON public.milestones(project_id);
CREATE INDEX idx_resources_project ON public.resources(project_id);
CREATE INDEX idx_discussions_project ON public.discussions(project_id);
CREATE INDEX idx_meetings_project ON public.meetings(project_id);
CREATE INDEX idx_meetings_scheduled ON public.meetings(scheduled_at);
CREATE INDEX idx_daily_log_date ON public.daily_log(date);
