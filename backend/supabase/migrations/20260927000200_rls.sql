-- =====================================================================
-- MyStudyAI - Row Level Security
-- Every student can only reach their own rows; social tables are readable by signed-in students.
-- quiz_answer_keys has NO policies: only the backend (service role) can read correct answers.
-- Idempotent: safe to run more than once.
-- =====================================================================

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'materials', 'analysis_results', 'notes', 'quizzes', 'quiz_questions', 'quiz_answer_keys',
                           'quiz_attempts', 'chat_history', 'study_sessions', 'study_tasks', 'flashcard_decks', 'flashcards',
                           'communities', 'community_members', 'posts', 'post_likes', 'post_comments', 'game_scores', 'follows'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Helper: (re)create a policy
create or replace function public._mystudyai_policy(tbl text, name text, cmd text, expr text, check_expr text default null) returns void
language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', name, tbl);
  if cmd = 'insert' then
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', name, tbl, expr);
  elsif cmd = 'update' then
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', name, tbl, expr, coalesce(check_expr, expr));
  else
    execute format('create policy %I on public.%I for %s to authenticated using (%s)', name, tbl, cmd, expr);
  end if;
end $$;

-- Own rows only: full access
do $$
declare t text;
begin
  foreach t in array array['materials', 'notes', 'chat_history', 'study_sessions', 'study_tasks', 'flashcard_decks', 'flashcards'] loop
    perform public._mystudyai_policy(t, 'own_select', 'select', 'user_id = auth.uid()');
    perform public._mystudyai_policy(t, 'own_insert', 'insert', 'user_id = auth.uid()');
    perform public._mystudyai_policy(t, 'own_update', 'update', 'user_id = auth.uid()');
    perform public._mystudyai_policy(t, 'own_delete', 'delete', 'user_id = auth.uid()');
  end loop;
end $$;

-- Written by the AI backend (service role); students can read / delete their own
select public._mystudyai_policy('analysis_results', 'own_select', 'select', 'user_id = auth.uid()');
select public._mystudyai_policy('quizzes', 'own_select', 'select', 'user_id = auth.uid()');
select public._mystudyai_policy('quizzes', 'own_delete', 'delete', 'user_id = auth.uid()');
select public._mystudyai_policy('quiz_questions', 'own_select', 'select', 'user_id = auth.uid()');
select public._mystudyai_policy('quiz_attempts', 'own_select', 'select', 'user_id = auth.uid()');
-- quiz_answer_keys: no policies at all -> only the backend can read the correct answers

-- Profiles: everyone signed in can see names/avatars (for Socials); only you can edit yours
select public._mystudyai_policy('profiles', 'read_all', 'select', 'true');
select public._mystudyai_policy('profiles', 'own_update', 'update', 'id = auth.uid()');
select public._mystudyai_policy('profiles', 'own_insert', 'insert', 'id = auth.uid()');

-- Social + games: readable by every signed-in student, writable only as yourself
select public._mystudyai_policy('communities', 'read_all', 'select', 'true');
do $$
declare t text;
begin
  foreach t in array array['community_members', 'posts', 'post_likes', 'post_comments', 'game_scores'] loop
    perform public._mystudyai_policy(t, 'read_all', 'select', 'true');
    perform public._mystudyai_policy(t, 'own_insert', 'insert', 'user_id = auth.uid()');
    perform public._mystudyai_policy(t, 'own_delete', 'delete', 'user_id = auth.uid()');
  end loop;
end $$;

-- Follows: everyone signed in can see who follows whom; you can only follow/unfollow as yourself
select public._mystudyai_policy('follows', 'read_all', 'select', 'true');
select public._mystudyai_policy('follows', 'own_insert', 'insert', 'follower_id = auth.uid()');
select public._mystudyai_policy('follows', 'own_delete', 'delete', 'follower_id = auth.uid()');

-- Clean up the helper
drop function if exists public._mystudyai_policy(text, text, text, text, text);
