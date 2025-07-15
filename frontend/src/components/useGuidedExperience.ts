import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useGuidedExperience() {
  const [guided, setGuided] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get token helper
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("token");
    }
    return null;
  };

  // Load the guided experience setting from the backend
  const loadGuidedExperience = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        // If no token, default to true and don't show loading
        setGuided(true);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/users/me/guided-experience`, {
        credentials: "include", // Send cookies with request
      });

      if (response.ok) {
        const data = await response.json();
        setGuided(data.guided);
      } else {
        // If there's an error, default to true
        setGuided(true);
        console.warn('Failed to load guided experience setting, defaulting to true');
      }
    } catch (err) {
      // If there's an error, default to true
      setGuided(true);
      setError('Failed to load guided experience setting');
      console.error('Error loading guided experience setting:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update the guided experience setting in the backend
  const updateGuidedExperience = useCallback(async (newGuided: boolean) => {
    try {
      setError(null);
      
      const token = getToken();
      if (!token) {
        // If no token, just update local state
        setGuided(newGuided);
        return;
      }

      const response = await fetch(`${API_URL}/users/me/guided-experience`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include", // Send cookies with request
        body: JSON.stringify({ guided: newGuided }),
      });

      if (response.ok) {
        const data = await response.json();
        setGuided(data.guided);
      } else {
        setError('Failed to update guided experience setting');
        console.error('Failed to update guided experience setting');
      }
    } catch (err) {
      setError('Failed to update guided experience setting');
      console.error('Error updating guided experience setting:', err);
    }
  }, []);

  // Load the setting when the hook is first used
  useEffect(() => {
    loadGuidedExperience();
  }, [loadGuidedExperience]);

  return {
    guided,
    setGuided: updateGuidedExperience,
    loading,
    error,
    refetch: loadGuidedExperience,
  };
} 