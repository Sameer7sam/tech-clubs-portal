
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CollaborationEvent {
  id: string;
  title: string;
  date: string;
  club: string;
  description: string;
  status: 'planning' | 'ongoing' | 'completed';
  teams: Team[];
  tasks: Task[];
  discussions: Discussion[];
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  event_id: string;
}

export interface TeamMember {
  id: string;
  name: string;
  user_id: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  assignee_id?: string;
  status: 'todo' | 'in-progress' | 'completed';
  dueDate: string;
  description?: string;
}

export interface Discussion {
  id: string;
  user: string;
  user_id: string;
  message: string;
  timestamp: string;
  avatar: string;
}

export const useCollaborationOperations = () => {
  const { user, isClubHead } = useAuth();
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events with collaboration data
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;

      if (!eventsData) {
        setEvents([]);
        return;
      }

      // Fetch related data for each event
      const enrichedEvents = await Promise.all(
        eventsData.map(async (event) => {
          // Fetch teams for this event
          const { data: teamsData } = await supabase
            .from('teams')
            .select('*')
            .eq('event_id', event.id);

          // Fetch team members for all teams
          const teams: Team[] = await Promise.all(
            (teamsData || []).map(async (team) => {
              const { data: membersData } = await supabase
                .from('team_members')
                .select(`
                  id,
                  user_id,
                  profiles!inner(name)
                `)
                .eq('team_id', team.id);

              const members: TeamMember[] = (membersData || []).map(member => ({
                id: member.id,
                name: (member.profiles as any)?.name || 'Unknown',
                user_id: member.user_id
              }));

              return {
                id: team.id,
                name: team.name,
                members,
                event_id: team.event_id
              };
            })
          );

          // Fetch tasks for this event
          const { data: tasksData } = await supabase
            .from('tasks')
            .select(`
              id,
              title,
              status,
              due_date,
              description,
              assignee,
              profiles!tasks_assignee_fkey(name)
            `)
            .eq('event_id', event.id);

          const tasks: Task[] = (tasksData || []).map(task => ({
            id: task.id,
            title: task.title,
            assignee: (task.profiles as any)?.name || 'Unassigned',
            assignee_id: task.assignee,
            status: task.status as 'todo' | 'in-progress' | 'completed',
            dueDate: task.due_date || '',
            description: task.description || ''
          }));

          // Fetch discussions for this event
          const { data: discussionsData } = await supabase
            .from('discussions')
            .select(`
              id,
              message,
              created_at,
              user_id,
              profiles!inner(name)
            `)
            .eq('event_id', event.id)
            .order('created_at', { ascending: true });

          const discussions: Discussion[] = (discussionsData || []).map(discussion => ({
            id: discussion.id,
            user: (discussion.profiles as any)?.name || 'Unknown',
            user_id: discussion.user_id,
            message: discussion.message,
            timestamp: discussion.created_at,
            avatar: ''
          }));

          return {
            id: event.id,
            title: event.name,
            date: event.date,
            club: event.created_by, // This should be enhanced to show actual club name
            description: event.description,
            status: 'planning' as const, // This should be determined by event date/status
            teams,
            tasks,
            discussions
          };
        })
      );

      setEvents(enrichedEvents);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Create new event
  const createEvent = async (eventData: {
    title: string;
    date: string;
    club: string;
    description: string;
    status: string;
  }) => {
    if (!isClubHead() || !user) {
      toast.error('Only club heads can create events');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          name: eventData.title,
          description: eventData.description,
          date: eventData.date,
          location: eventData.club, // Using club as location for now
          credits: 10, // Default credits
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Event created successfully!');
      await fetchEvents(); // Refresh events list
      return data.id;
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
      throw error;
    }
  };

  // Create new team
  const createTeam = async (eventId: string, teamName: string) => {
    if (!isClubHead() || !user) {
      toast.error('Only club heads can create teams');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          event_id: eventId,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Team created successfully!');
      await fetchEvents();
      return data.id;
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
      throw error;
    }
  };

  // Add member to team
  const addMemberToTeam = async (teamId: string, userId: string) => {
    if (!isClubHead()) {
      toast.error('Only club heads can add team members');
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already a member of this team');
          return;
        }
        throw error;
      }

      toast.success('Member added to team successfully!');
      await fetchEvents();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error('Failed to add team member');
      throw error;
    }
  };

  // Create new task
  const createTask = async (eventId: string, taskData: {
    title: string;
    description?: string;
    assignee?: string;
    dueDate?: string;
    teamId?: string;
  }) => {
    if (!isClubHead() || !user) {
      toast.error('Only club heads can create tasks');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          event_id: eventId,
          team_id: taskData.teamId,
          assignee: taskData.assignee,
          due_date: taskData.dueDate,
          created_by: user.id,
          status: 'todo'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Task created successfully!');
      await fetchEvents();
      return data.id;
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      throw error;
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: 'todo' | 'in-progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task updated successfully!');
      await fetchEvents();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  };

  // Send message to discussion
  const sendMessage = async (eventId: string, message: string) => {
    if (!user) {
      toast.error('You must be logged in to send messages');
      return;
    }

    try {
      const { error } = await supabase
        .from('discussions')
        .insert({
          event_id: eventId,
          user_id: user.id,
          message: message
        });

      if (error) throw error;

      await fetchEvents(); // Refresh to show new message
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    createEvent,
    createTeam,
    addMemberToTeam,
    createTask,
    updateTaskStatus,
    sendMessage,
    refreshEvents: fetchEvents
  };
};
