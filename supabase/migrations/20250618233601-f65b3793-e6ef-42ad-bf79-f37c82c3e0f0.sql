
-- First, let's fix the infinite recursion in RLS policies for profiles table
-- This usually happens when a policy tries to reference the same table it's operating on

-- Create a security definer function to check roles safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create chapters and clubs tables
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID NOT NULL
);

CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID NOT NULL
);

CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create tables for collaboration features

-- Teams table for event collaboration
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Team members linking table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Tasks table for collaboration
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assignee UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Discussions table for event collaboration
CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Notifications table for club heads
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Now we can safely create the membership applications table
CREATE TABLE public.membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, club_id)
);

-- Enable RLS for all new tables
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chapters
CREATE POLICY "Admins can create chapters" 
  ON public.chapters 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view chapters" 
  ON public.chapters 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create RLS policies for clubs
CREATE POLICY "Admins can create clubs" 
  ON public.clubs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view clubs" 
  ON public.clubs 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create RLS policies for club members
CREATE POLICY "Club heads can add members" 
  ON public.club_members 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'club_head');

CREATE POLICY "Users can view club members" 
  ON public.club_members 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create RLS policies for teams table
CREATE POLICY "Club heads can create teams" 
  ON public.teams 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'club_head');

CREATE POLICY "Users can view teams" 
  ON public.teams 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create RLS policies for team_members table
CREATE POLICY "Club heads can add team members" 
  ON public.team_members 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'club_head');

CREATE POLICY "Users can view team members" 
  ON public.team_members 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create RLS policies for tasks table
CREATE POLICY "Club heads can create tasks" 
  ON public.tasks 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'club_head');

CREATE POLICY "Users can view tasks" 
  ON public.tasks 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Assignees can update tasks" 
  ON public.tasks 
  FOR UPDATE 
  TO authenticated
  USING (assignee = auth.uid() OR created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'club_head');

-- Create RLS policies for discussions table
CREATE POLICY "Users can create discussions" 
  ON public.discussions 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view discussions" 
  ON public.discussions 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create RLS policies for notifications table
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  TO authenticated
  USING (recipient_id = auth.uid());

-- Create RLS policies for membership applications
CREATE POLICY "Users can create their own membership applications" 
  ON public.membership_applications 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own membership applications" 
  ON public.membership_applications 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'club_head');

CREATE POLICY "Club heads can update membership applications" 
  ON public.membership_applications 
  FOR UPDATE 
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'club_head');

-- Add member levels table
CREATE TABLE public.member_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER NOT NULL
);

-- Insert default member levels
INSERT INTO public.member_levels (name, min_points, max_points)
VALUES 
  ('Bronze', 0, 49),
  ('Silver', 50, 149),
  ('Gold', 150, 299),
  ('Platinum', 300, 499),
  ('Diamond', 500, 999999);

ALTER TABLE public.member_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view member levels" 
  ON public.member_levels 
  FOR SELECT 
  TO authenticated 
  USING (true);
