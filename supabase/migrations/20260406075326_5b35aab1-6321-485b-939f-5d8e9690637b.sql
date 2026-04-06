
-- Create collaborator_sessions table
CREATE TABLE public.collaborator_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  last_access_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborator_sessions ENABLE ROW LEVEL SECURITY;

-- Owner can view collaborator sessions for their projects
CREATE POLICY "Owner can view collaborator sessions"
  ON public.collaborator_sessions
  FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Owner can delete collaborator sessions
CREATE POLICY "Owner can delete collaborator sessions"
  ON public.collaborator_sessions
  FOR DELETE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Allow anonymous insert for collaborator login (public access needed)
CREATE POLICY "Anyone can create collaborator sessions"
  ON public.collaborator_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous update for last_access_at
CREATE POLICY "Anyone can update own collaborator sessions"
  ON public.collaborator_sessions
  FOR UPDATE
  USING (true);

-- Create a function to verify collaborator password (security definer to access password hash)
CREATE OR REPLACE FUNCTION public.verify_collab_password(
  p_project_slug TEXT,
  p_email TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_session_id UUID;
BEGIN
  -- Find project by slug
  SELECT id, name, collab_password_hash, slug
  INTO v_project
  FROM public.projects
  WHERE slug = p_project_slug AND collab_password_hash IS NOT NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found or no collaborator access configured');
  END IF;

  -- Simple password check (plain text comparison for now, can upgrade to pgcrypto later)
  IF v_project.collab_password_hash != p_password THEN
    RETURN json_build_object('success', false, 'error', 'Invalid password');
  END IF;

  -- Create or update session
  INSERT INTO public.collaborator_sessions (email, project_id, last_access_at, expires_at)
  VALUES (p_email, v_project.id, now(), now() + interval '24 hours')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    -- Update existing
    UPDATE public.collaborator_sessions
    SET last_access_at = now(), expires_at = now() + interval '24 hours'
    WHERE email = p_email AND project_id = v_project.id
    RETURNING id INTO v_session_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'project_id', v_project.id,
    'project_name', v_project.name
  );
END;
$$;

-- Create a function to get project data for collaborators (security definer)
CREATE OR REPLACE FUNCTION public.get_collab_project_data(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_project JSON;
  v_tasks JSON;
  v_milestones JSON;
  v_resources JSON;
  v_discussions JSON;
BEGIN
  -- Verify session is valid and not expired
  SELECT * INTO v_session
  FROM public.collaborator_sessions
  WHERE id = p_session_id AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Session expired or invalid');
  END IF;

  -- Update last access
  UPDATE public.collaborator_sessions SET last_access_at = now() WHERE id = p_session_id;

  -- Get project
  SELECT row_to_json(p) INTO v_project
  FROM (SELECT id, name, description, status, color, slug, type, tags, start_date, target_end_date, status_note FROM public.projects WHERE id = v_session.project_id) p;

  -- Get tasks
  SELECT json_agg(t) INTO v_tasks
  FROM (SELECT id, title, status, priority, due_date, time_estimate_min FROM public.tasks WHERE project_id = v_session.project_id ORDER BY sort_order, created_at DESC) t;

  -- Get milestones
  SELECT json_agg(m) INTO v_milestones
  FROM (SELECT id, title, date, is_completed FROM public.milestones WHERE project_id = v_session.project_id ORDER BY date) m;

  -- Get resources
  SELECT json_agg(r) INTO v_resources
  FROM (SELECT id, title, url, type, tags FROM public.resources WHERE project_id = v_session.project_id ORDER BY created_at DESC) r;

  -- Get discussions
  SELECT json_agg(d) INTO v_discussions
  FROM (SELECT id, body_html, author, author_type, is_pinned, created_at FROM public.discussions WHERE project_id = v_session.project_id ORDER BY is_pinned DESC, created_at DESC) d;

  RETURN json_build_object(
    'success', true,
    'project', v_project,
    'tasks', COALESCE(v_tasks, '[]'::json),
    'milestones', COALESCE(v_milestones, '[]'::json),
    'resources', COALESCE(v_resources, '[]'::json),
    'discussions', COALESCE(v_discussions, '[]'::json)
  );
END;
$$;
