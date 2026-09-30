-- MyStudyAI starter data (Supabase CLI runs this after migrations on `supabase db reset`).
-- Safe to run again.

insert into public.communities (slug, name, description, emoji) values
  ('computer-science', 'Computer Science', 'A community for programming and algorithms enthusiasts', '💻'),
  ('mathematics', 'Mathematics', 'Calculus, algebra, statistics and problem solving', '📐'),
  ('medical-students', 'Medical Students', 'Anatomy, physiology and exam prep for future doctors', '🩺'),
  ('language-learning', 'Language Learning', 'Spanish, French, Japanese and more', '🌍'),
  ('exam-prep', 'Exam Prep', 'SAT, GRE, GMAT and professional exam strategies', '📝'),
  ('science-lab', 'Science Lab', 'Physics, chemistry and biology discussions', '🔬')
on conflict (slug) do nothing;
