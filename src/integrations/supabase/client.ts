
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tkrbxuxenksffwbcfzfz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcmJ4dXhlbmtzZmZ3YmNmemZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDU5MjEsImV4cCI6MjA1ODIyMTkyMX0.EZgBj1NSjxO_SpnmlVI3RjrDjbKFvER9TQ9vxrvRkLY';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ieee-app-auth',
  },
});

export type Tables = {
  events: {
    id: string;
    name: string;
    description: string;
    date: string;
    location: string;
    credits: number;
    created_by: string;
    created_at: string;
  };
  event_participants: {
    id: string;
    event_id: string;
    user_id: string;
    registered_at: string;
    attended: boolean;
  };
  credit_transactions: {
    id: string;
    recipient_id: string;
    awarded_by: string | null;
    amount: number;
    reason: string;
    event_id: string | null;
    created_at: string;
  };
  profiles: {
    id: string;
    name: string;
    email: string;
    student_id: string | null;
    role: string;
    club: string | null;
    chapter: string | null;
    total_credits: number;
    join_date: string;
    phone_number: string | null;
    city: string | null;
    state: string | null;
    college: string | null;
    admin: boolean | null;
    member_level: string | null;
  };
  chapters: {
    id: string;
    name: string;
    created_at: string;
    created_by: string;
  };
  clubs: {
    id: string;
    name: string;
    chapter_id: string;
    created_at: string;
    created_by: string;
  };
  club_members: {
    id: string;
    club_id: string;
    user_id: string;
    joined_at: string;
  };
  member_levels: {
    id: number;
    name: string;
    min_points: number;
    max_points: number;
  };
  teams: {
    id: string;
    name: string;
    event_id: string;
    created_by: string;
    created_at: string;
  };
  team_members: {
    id: string;
    team_id: string;
    user_id: string;
    joined_at: string;
  };
  tasks: {
    id: string;
    title: string;
    description: string | null;
    event_id: string;
    team_id: string | null;
    assignee: string | null;
    status: string;
    due_date: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
  discussions: {
    id: string;
    event_id: string;
    user_id: string;
    message: string;
    created_at: string;
  };
  notifications: {
    id: string;
    recipient_id: string;
    title: string;
    message: string;
    type: string;
    related_id: string | null;
    read: boolean;
    created_at: string;
  };
  membership_applications: {
    id: string;
    user_id: string;
    club_id: string;
    status: string;
    message: string | null;
    submitted_at: string;
    updated_at: string;
  };
};
