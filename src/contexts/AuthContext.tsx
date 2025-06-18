
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AuthUser, EventData, ChapterData, ClubData, profileToAuthUser, userFromMetadata } from '@/utils/authUtils';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useUserOperations } from '@/hooks/useUserOperations';

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean | undefined;
  login: (email: string, password: string, role: 'member' | 'club_head' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Omit<AuthUser, 'id' | 'totalCredits' | 'joinDate'> & { password: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  giveCredits: (recipientId: string, amount: number, reason: string) => Promise<void>;
  createEvent: (eventData: EventData) => Promise<string>;
  addMemberToEvent: (eventId: string, memberId: string) => Promise<void>;
  createChapter: (chapterData: ChapterData) => Promise<string>;
  createClub: (clubData: ClubData) => Promise<string>;
  isClubHead: () => boolean;
  isAdmin: () => boolean;
  getProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  console.log("AuthProvider initialized");
  
  const getProfile = async () => {
    console.log("getProfile called, session:", session?.user?.id);
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        // Use user metadata as fallback
        setUser(userFromMetadata(session.user));
        return;
      }
      
      if (data) {
        console.log("Profile data fetched:", data);
        setUser(profileToAuthUser(data));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const { login, register, logout, resetPassword } = useAuthOperations();
  
  const { isClubHead, isAdmin, giveCredits, createEvent, addMemberToEvent, createChapter, createClub } = useUserOperations(user, getProfile);
  
  useEffect(() => {
    console.log("Setting up auth state listener");
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    async function checkExistingSession() {
      try {
        console.log("Checking for existing session");
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", initialSession ? "Session found" : "No session");
        
        if (initialSession) {
          setSession(initialSession);
          
          if (initialSession.user) {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialSession.user.id)
                .single();
              
              if (error) {
                console.error('Error fetching initial user profile:', error);
                // Use user metadata as fallback
                setUser(userFromMetadata(initialSession.user));
              } else if (data) {
                console.log("Initial profile data loaded:", data);
                setUser(profileToAuthUser(data));
              }
            } catch (error) {
              console.error('Error fetching initial user profile:', error);
              setUser(userFromMetadata(initialSession.user));
            }
          }
        } else {
          console.log("No initial session found");
          setUser(null);
        }
        
        console.log("Setting up auth state change listener");
        authSubscription = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state change event:", event);
            setSession(newSession);
            
            if (newSession?.user) {
              console.log("User authenticated:", newSession.user.email);
              try {
                const { data, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', newSession.user.id)
                  .single();
                
                if (error) {
                  console.error('Error fetching user profile on auth change:', error);
                  // Use user metadata as fallback
                  setUser(userFromMetadata(newSession.user));
                } else if (data) {
                  console.log("Profile data loaded:", data);
                  setUser(profileToAuthUser(data));
                }
              } catch (error) {
                console.error('Error fetching user profile on auth change:', error);
                setUser(userFromMetadata(newSession.user));
              }
            } else {
              console.log("User logged out or no session");
              setUser(null);
            }
          }
        ).data.subscription;
        
        setLoading(false);
        setAuthInitialized(true);
      } catch (error) {
        console.error('Error during auth initialization:', error);
        setLoading(false);
        setAuthInitialized(true);
      }
    }
    
    checkExistingSession();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    console.log("Auth state updated:", { 
      authenticated: !!user,
      loading,
      sessionExists: !!session,
      authInitialized
    });
  }, [user, loading, session, authInitialized]);

  if (loading) {
    console.log("Auth still loading, showing loading spinner");
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent mb-4"></div>
          <div className="text-purple-300 text-sm">Loading authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: user !== null ? true : authInitialized ? false : undefined, 
      login, 
      logout, 
      register, 
      resetPassword,
      giveCredits, 
      createEvent, 
      addMemberToEvent, 
      isClubHead,
      isAdmin,
      getProfile,
      createChapter,
      createClub
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
