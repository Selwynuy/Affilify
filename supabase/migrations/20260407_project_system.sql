-- Project system: named projects, folders, version history, duplicate/remix

-- ─── project_folders ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_folders (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_folders_user_idx ON public.project_folders (user_id, created_at DESC);

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_folders"
  ON public.project_folders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── projects: add workspace columns ──────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS name              TEXT        NOT NULL DEFAULT 'Untitled Project'
                                                         CHECK (char_length(name) BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS folder_id         UUID        REFERENCES public.project_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_project_id UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thumbnail_url     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS projects_user_folder_idx ON public.projects (user_id, folder_id, updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();

-- ─── project_images: add generation_round ────────────────────────────────────

ALTER TABLE public.project_images
  ADD COLUMN IF NOT EXISTS generation_round INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS project_images_project_round_idx
  ON public.project_images (project_id, kind, generation_round DESC);

-- ─── RPC: duplicate_project ───────────────────────────────────────────────────
-- Copies avatar config, name, and (optionally) folder assignment.
-- Product images are NOT copied — they are transient. New product uploads
-- will be needed before generating again.

CREATE OR REPLACE FUNCTION public.duplicate_project(
  p_project_id UUID,
  p_user_id    UUID,
  p_new_name   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src         public.projects%rowtype;
  new_id      UUID;
  resolved_name TEXT;
BEGIN
  SELECT * INTO src
  FROM public.projects
  WHERE id = p_project_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  resolved_name := COALESCE(p_new_name, src.name || ' (copy)');
  IF char_length(resolved_name) > 120 THEN
    resolved_name := LEFT(src.name, 112) || ' (copy)';
  END IF;

  INSERT INTO public.projects (user_id, status, avatar, name, folder_id, parent_project_id, thumbnail_url)
  VALUES (p_user_id, 'draft', src.avatar, resolved_name, src.folder_id, src.id, src.thumbnail_url)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_project(UUID, UUID, TEXT) TO authenticated, service_role;

-- ─── RPC: get_next_generation_round ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_next_generation_round(p_project_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(generation_round), 0) + 1
  FROM public.project_images
  WHERE project_id = p_project_id AND kind = 'generated';
$$;

GRANT EXECUTE ON FUNCTION public.get_next_generation_round(UUID) TO authenticated, service_role;
