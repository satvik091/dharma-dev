CREATE TABLE public.verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_number int NOT NULL,
  chapter_title text NOT NULL,
  verse_ref text NOT NULL UNIQUE,
  verse_number int NOT NULL DEFAULT 0,
  translation text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verses TO anon;
GRANT SELECT ON public.verses TO authenticated;
GRANT ALL ON public.verses TO service_role;
ALTER TABLE public.verses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verses are publicly readable" ON public.verses FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_verses_chapter ON public.verses (chapter_number, verse_number);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verse_id uuid NOT NULL REFERENCES public.verses(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, verse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood text,
  body text NOT NULL,
  verse_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  theme text,
  verse_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat" ON public.chat_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());