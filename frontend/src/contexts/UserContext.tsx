"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { posthog } from '@/lib/posthog';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    // Return a default context instead of throwing error
    return {
      user: null,
      setUser: () => {},
      isLoading: false,
    };
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user data on mount
  useEffect(() => {
    const email = localStorage.getItem('email');
    const token = localStorage.getItem('token');
    
    if (email && token === 'cookie-auth') {
      // We have a logged-in user, fetch their real ID from the backend
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch user data when user changes (to get real ID)
  useEffect(() => {
    if (user && user.id === user.email) {
      // User ID is still the email (temporary), fetch real ID
      fetchUserData();
    }
  }, [user]);

  // Fetch user data from backend
  const fetchUserData = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/users/me`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const userData = await response.json();
        const userWithId: User = {
          id: userData.id.toString(), // Use actual user ID from database
          email: userData.email,
          name: userData.email.split('@')[0], // Use email prefix as name
        };
        setUser(userWithId);
      } else {
        console.error('Failed to fetch user data, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user identification with PostHog
  useEffect(() => {
    if (user && typeof posthog !== 'undefined') {
      try {
        // Check cookie consent before identifying user
        const consent = localStorage.getItem('cookie-consent');
        if (consent === 'accepted') {
          // Only identify if we have a real user ID (not email)
          if (user.id !== user.email) {
            posthog.identify(user.id, {
              email: user.email,
              name: user.name,
            });
          } else {
          }
        } else {
        }
      } catch (error) {
        console.error('Error identifying user in PostHog:', error);
      }
    }
  }, [user]);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    
    // If user is being cleared (logout), reset PostHog
    if (!newUser && typeof posthog !== 'undefined') {
      try {
        posthog.reset(true); // Reset device_id too
      } catch (error) {
      }
    }
    
    // If new user has email as ID, immediately fetch real ID
    if (newUser && newUser.id === newUser.email) {
      fetchUserData();
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser: handleSetUser,
      isLoading,
    }}>
      {children}
    </UserContext.Provider>
  );
} 