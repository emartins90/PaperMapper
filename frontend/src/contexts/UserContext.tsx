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
    throw new Error('useUser must be used within a UserProvider');
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
      // We have a logged-in user, but we need to get their ID from the backend
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, []);

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
          id: userData.id.toString(), // Convert to string for PostHog
          email: userData.email,
          name: userData.email.split('@')[0], // Use email prefix as name
        };
        setUser(userWithId);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user identification with PostHog
  useEffect(() => {
    if (user) {
      // Check cookie consent before identifying user
      const consent = localStorage.getItem('cookie-consent');
      if (consent === 'accepted') {
        posthog.identify(user.id, {
          email: user.email,
          name: user.name,
        });
        console.log('User identified in PostHog:', user.id);
      } else {
        console.log('User not identified - no analytics consent');
      }
    }
  }, [user]);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    
    // If user is being cleared (logout), reset PostHog
    if (!newUser) {
      posthog.reset(true); // Reset device_id too
      console.log('User reset in PostHog');
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