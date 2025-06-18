import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  CollapsibleContent, 
  CollapsibleTrigger, 
  Collapsible 
} from '@/components/ui/collapsible';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CalendarPlus, Users, MessageSquare, FileText, ChevronDown, Plus, Calendar, Sparkles, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCollaborationOperations, CollaborationEvent } from '@/hooks/useCollaborationOperations';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface Event {
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

interface Team {
  id: string;
  name: string;
  members: string[];
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'completed';
  dueDate: string;
}

interface Discussion {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  avatar: string;
}

const sampleEvents: Event[] = [
  {
    id: '1',
    title: 'Annual Hackathon 2024',
    date: '2024-05-15',
    club: 'IEEE',
    description: 'A 48-hour hackathon focusing on sustainable technology solutions.',
    status: 'planning',
    teams: [
      {
        id: 't1',
        name: 'Logistics Team',
        members: ['Alex Johnson', 'Maria Garcia', 'Sam Lee'],
      },
      {
        id: 't2',
        name: 'Technical Support',
        members: ['Jamie Smith', 'Ryan Chen'],
      },
      {
        id: 't3',
        name: 'Judging Panel',
        members: ['Prof. Williams', 'Dr. Patel', 'Eng. Gonzalez'],
      },
    ],
    tasks: [
      {
        id: 'task1',
        title: 'Secure venue',
        assignee: 'Alex Johnson',
        status: 'completed',
        dueDate: '2024-03-15',
      },
      {
        id: 'task2',
        title: 'Contact sponsors',
        assignee: 'Maria Garcia',
        status: 'in-progress',
        dueDate: '2024-04-01',
      },
      {
        id: 'task3',
        title: 'Prepare technical infrastructure',
        assignee: 'Jamie Smith',
        status: 'todo',
        dueDate: '2024-04-30',
      },
    ],
    discussions: [
      {
        id: 'd1',
        user: 'Alex Johnson',
        message: "I've contacted the university about using the main hall. They need a formal request letter.",
        timestamp: '2024-03-10T14:32:00',
        avatar: '',
      },
      {
        id: 'd2',
        user: 'Maria Garcia',
        message: 'I have a list of potential sponsors we worked with last year. Should I reach out to all of them again?',
        timestamp: '2024-03-11T09:15:00',
        avatar: '',
      },
      {
        id: 'd3',
        user: 'Jamie Smith',
        message: "We'll need to ensure we have reliable Wi-Fi for at least 100 participants. I'll check with IT.",
        timestamp: '2024-03-12T11:20:00',
        avatar: '',
      },
    ],
  },
  {
    id: '2',
    title: 'Tech Workshop Series',
    date: '2024-04-10',
    club: 'ACM',
    description: 'A series of workshops covering web development, mobile app development, and cloud computing.',
    status: 'ongoing',
    teams: [
      {
        id: 't1',
        name: 'Workshop Leaders',
        members: ['Emily Wong', 'David Kumar', 'Lisa Chen'],
      },
      {
        id: 't2',
        name: 'Outreach Team',
        members: ['Michael Brown', 'Sarah Johnson'],
      },
    ],
    tasks: [
      {
        id: 'task1',
        title: 'Finalize workshop topics',
        assignee: 'Emily Wong',
        status: 'completed',
        dueDate: '2024-03-01',
      },
      {
        id: 'task2',
        title: 'Create promotional materials',
        assignee: 'Michael Brown',
        status: 'completed',
        dueDate: '2024-03-15',
      },
      {
        id: 'task3',
        title: 'Set up registration system',
        assignee: 'Sarah Johnson',
        status: 'in-progress',
        dueDate: '2024-03-25',
      },
    ],
    discussions: [
      {
        id: 'd1',
        user: 'Emily Wong',
        message: 'The web development workshop will focus on React and Node.js. Is that good with everyone?',
        timestamp: '2024-03-05T10:45:00',
        avatar: '',
      },
      {
        id: 'd2',
        user: 'Michael Brown',
        message: "I've created some flyer designs. Will share them for feedback soon.",
        timestamp: '2024-03-07T15:30:00',
        avatar: '',
      },
    ],
  },
];

const StatusBadge: React.FC<{ status: 'planning' | 'ongoing' | 'completed' }> = ({ status }) => {
  const classes = {
    planning: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
    ongoing: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
    completed: 'bg-green-900/40 text-green-300 border-green-500/30',
  };
  
  const labels = {
    planning: 'Planning',
    ongoing: 'Ongoing',
    completed: 'Completed',
  };
  
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border ${classes[status]}`}>
      {labels[status]}
    </span>
  );
};

const Collaboration: React.FC = () => {
  const { user, isClubHead } = useAuth();
  const { 
    events, 
    loading, 
    createEvent, 
    createTeam, 
    createTask, 
    updateTaskStatus, 
    sendMessage 
  } = useCollaborationOperations();
  
  const [selectedEvent, setSelectedEvent] = useState<CollaborationEvent | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      title: '',
      date: '',
      club: '',
      description: '',
      status: 'planning'
    }
  });

  const handleCreateEvent = async (data: any) => {
    if (!isClubHead()) {
      return;
    }

    setIsCreatingEvent(true);
    try {
      await createEvent(data);
      form.reset();
      setIsSheetOpen(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedEvent || !user) return;
    
    try {
      await sendMessage(selectedEvent.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'completed') => {
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-space-black">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <div className="text-purple-300 text-sm">Loading collaboration data...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-space-black">
      {/* Cosmic background with animated elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-space-black via-space-deepBlue to-space-navy opacity-90"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_20%,rgba(150,80,255,0.15),transparent)]"></div>
        <div className="absolute inset-0 stars-bg opacity-30"></div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-pink-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full bg-blue-500/5 blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
      </div>
      
      <Navbar />
      
      <main className="flex-grow py-12 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center px-3 py-1.5 mb-4 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm neo-border">
              <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Collaboration Space</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Event Collaboration Hub</h1>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Plan, organize, and execute successful events together with your club members.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gradient">Club Events</h2>
                {isClubHead() && (
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border border-purple-400/20">
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        New Event
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-space-navy border-l border-purple-500/20">
                      <SheetHeader>
                        <SheetTitle className="text-white">Create New Event</SheetTitle>
                        <SheetDescription className="text-gray-400">
                          Add the details for your new club event.
                        </SheetDescription>
                      </SheetHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateEvent)} className="py-6 space-y-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Event Title</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter event title" 
                                    className="bg-space-black/50 border-purple-500/20 focus:border-purple-500/50"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Event Date</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    className="bg-space-black/50 border-purple-500/20 focus:border-purple-500/50"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="club"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Location</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter event location" 
                                    className="bg-space-black/50 border-purple-500/20 focus:border-purple-500/50"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter event description" 
                                    className="min-h-[100px] bg-space-black/50 border-purple-500/20 focus:border-purple-500/50"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            disabled={isCreatingEvent}
                          >
                            {isCreatingEvent ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create Event'
                            )}
                          </Button>
                        </form>
                      </Form>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
              
              {!isClubHead() && (
                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-300 text-sm">
                    Only club heads can create new events. Contact your club head to create events.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {events.length === 0 ? (
                  <Card className="glass-card border-purple-500/20">
                    <CardContent className="text-center p-6">
                      <Calendar className="h-12 w-12 text-purple-500/30 mx-auto mb-4" />
                      <CardTitle className="text-lg mb-2 text-gradient">No Events Yet</CardTitle>
                      <CardDescription className="text-gray-400">
                        {isClubHead() ? 'Create your first event to start collaborating.' : 'No events available at the moment.'}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ) : events.map((event) => (
                  <Card 
                    key={event.id} 
                    className={`cursor-pointer hover-scale backdrop-blur-sm glass-card border-opacity-30 ${
                      selectedEvent?.id === event.id ? 'ring-2 ring-purple-500/50 neo-border' : 'border-purple-500/10'
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-white">{event.title}</CardTitle>
                        <StatusBadge status={event.status} />
                      </div>
                      <CardDescription className="flex items-center mt-1 text-gray-400">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-300 line-clamp-2">{event.description}</p>
                      <div className="mt-3 text-xs text-gray-400">
                        <div className="flex items-center">
                          <Users className="h-3.5 w-3.5 mr-1" />
                          {event.teams.reduce((acc, team) => acc + team.members.length, 0)} Members
                        </div>
                        <div className="flex items-center mt-1">
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          {event.discussions.length} Comments
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-3">
              {selectedEvent ? (
                <div className="space-y-6">
                  <Card className="glass-card border-purple-500/20 cosmic-glow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl text-gradient">{selectedEvent.title}</CardTitle>
                          <CardDescription className="mt-1 text-gray-400">
                            {selectedEvent.club} • {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                        <StatusBadge status={selectedEvent.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">{selectedEvent.description}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card border-purple-500/20">
                    <Collapsible>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="py-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Users className="mr-2 h-5 w-5 text-purple-400" />
                              <CardTitle className="text-lg text-white">Teams & Members</CardTitle>
                            </div>
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            {selectedEvent.teams.map((team) => (
                              <div key={team.id} className="border border-purple-500/20 rounded-lg p-4 bg-space-navy/30">
                                <h4 className="font-medium text-base mb-2 text-purple-300">{team.name}</h4>
                                <div className="space-y-2">
                                  {team.members.map((member) => (
                                    <div key={member.id} className="flex items-center gap-2 text-sm text-gray-300">
                                      <Avatar className="h-6 w-6 bg-space-navy border border-purple-500/30">
                                        <AvatarFallback className="bg-purple-900/50 text-purple-200">
                                          {member.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{member.name}</span>
                                    </div>
                                  ))}
                                </div>
                                {isClubHead() && (
                                  <Button variant="outline" size="sm" className="mt-3 border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Add Member
                                  </Button>
                                )}
                              </div>
                            ))}
                            {isClubHead() && (
                              <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Team
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                  
                  <Card className="glass-card border-purple-500/20">
                    <Collapsible>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="py-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <FileText className="mr-2 h-5 w-5 text-purple-400" />
                              <CardTitle className="text-lg text-white">Tasks</CardTitle>
                            </div>
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {selectedEvent.tasks.map((task) => (
                              <div 
                                key={task.id} 
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  task.status === 'completed' 
                                    ? 'bg-green-900/10 border-green-500/20' 
                                    : task.status === 'in-progress'
                                    ? 'bg-blue-900/10 border-blue-500/20'
                                    : 'bg-amber-900/10 border-amber-500/20'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="pt-0.5">
                                    <input 
                                      type="checkbox" 
                                      checked={task.status === 'completed'} 
                                      className="rounded text-purple-600 bg-space-navy border-purple-500/30 focus:ring-purple-500"
                                      onChange={(e) => {
                                        const newStatus = e.target.checked ? 'completed' : 'todo';
                                        handleTaskStatusChange(task.id, newStatus);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <p className={`font-medium text-gray-200 ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                                      {task.title}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      Assigned to: {task.assignee} • Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                                    task.status === 'todo' ? 'bg-amber-900/30 text-amber-300 border border-amber-500/30' : 
                                    task.status === 'in-progress' ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30' : 
                                    'bg-green-900/30 text-green-300 border border-green-500/30'
                                  }`}>
                                    {task.status === 'todo' ? 'To Do' : 
                                     task.status === 'in-progress' ? 'In Progress' : 
                                     'Completed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {isClubHead() && (
                              <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Task
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                  
                  <Card className="glass-card border-purple-500/20">
                    <CardHeader>
                      <div className="flex items-center">
                        <MessageSquare className="mr-2 h-5 w-5 text-purple-400" />
                        <CardTitle className="text-lg text-white">Discussion</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto scrollbar-none pr-2">
                        {selectedEvent.discussions.map((discussion) => (
                          <div key={discussion.id} className="flex gap-3">
                            <Avatar className="h-8 w-8 bg-space-navy border border-purple-500/30">
                              <AvatarFallback className="bg-purple-900/50 text-purple-200">
                                {discussion.user.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-baseline">
                                <p className="font-medium text-purple-300">{discussion.user}</p>
                                <span className="text-xs text-gray-500 ml-2">
                                  {new Date(discussion.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-300 mt-1">{discussion.message}</p>
                            </div>
                          </div>
                        ))}
                        {selectedEvent.discussions.length === 0 && (
                          <div className="text-center text-gray-400 py-8">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>No discussions yet. Start the conversation!</p>
                          </div>
                        )}
                      </div>
                      {user && (
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Type your message..." 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="bg-space-navy/50 border-purple-500/20 focus:border-purple-500/50"
                          />
                          <Button onClick={handleSendMessage} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                            Send
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="flex items-center justify-center h-96 glass-card border-purple-500/20 cosmic-glow">
                  <CardContent className="text-center p-6">
                    <Calendar className="h-16 w-16 text-purple-500/30 mx-auto mb-4" />
                    <CardTitle className="text-xl mb-2 text-gradient">No Event Selected</CardTitle>
                    <CardDescription className="text-gray-400">
                      Select an event from the list or create a new one to start collaborating.
                    </CardDescription>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Collaboration;
