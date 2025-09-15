"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner'; // Import toast for notifications

interface SessionContextType {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error.message);
          if (error.message.includes("Refresh Token Not Found")) {
            toast.error("Your session has expired. Please log in again.", { id: "session-expired" });
          } else {
            toast.error(`Authentication error: ${error.message}`, { id: "auth-error" });
          }
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user || null);
        }
      } catch (e: any) {
        console.error("Unexpected error getting session:", e.message);
        if (e.message.includes("Refresh Token Not Found")) {
          toast.error("Your session has expired. Please log in again.", { id: "session-expired" });
        } else {
          toast.error(`Authentication error: ${e.message}`, { id: "auth-error" });
        }
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};