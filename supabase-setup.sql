-- הרץ את זה ב-Supabase SQL Editor

-- טבלת פרופילי משתמשים
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  created_at timestamp with time zone default now(),
  lang text default 'he'
);

-- טבלת תשובות האונבורדינג
create table if not exists onboarding (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  status text,        -- מצב זוגי
  important text,     -- מה חשוב בזוגיות
  blocker text,       -- מה עצר
  improve text,       -- מה לשפר
  comfort int,        -- ציון נוחות 1-10
  completed_at timestamp with time zone default now()
);

-- טבלת היסטוריית שיחות
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  messages jsonb not null default '[]',
  updated_at timestamp with time zone default now()
);

-- Row Level Security - כל משתמש רואה רק את שלו
alter table profiles enable row level security;
alter table onboarding enable row level security;
alter table conversations enable row level security;

create policy "Users see own profile"
  on profiles for all using (auth.uid() = id);

create policy "Users see own onboarding"
  on onboarding for all using (auth.uid() = user_id);

create policy "Users see own conversations"
  on conversations for all using (auth.uid() = user_id);

-- יצירת פרופיל אוטומטית עם הרשמה
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
