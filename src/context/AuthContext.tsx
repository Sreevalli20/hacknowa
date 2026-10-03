import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, SavedReportItem } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (settings: Partial<UserProfile['settings']>) => Promise<void>;
  savedReports: SavedReportItem[];
  fetchSavedReports: () => Promise<void>;
  saveInvestigationReport: (reportData: {
    result: any;
    title?: string;
    notes?: string;
    tags?: string[];
  }) => Promise<SavedReportItem>;
  deleteSavedReport: (reportId: string) => Promise<void>;
  updateSavedReport: (
    reportId: string,
    updates: Partial<Pick<SavedReportItem, 'title' | 'notes' | 'tags' | 'status'>>
  ) => Promise<SavedReportItem>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'tracezero_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedReports, setSavedReports] = useState<SavedReportItem[]>([]);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
            setToken(null);
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Fetch saved reports whenever user is authenticated
  const fetchSavedReports = async () => {
    if (!token) {
      setSavedReports([]);
      return;
    }
    try {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved reports:', err);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchSavedReports();
    } else {
      setSavedReports([]);
    }
  }, [user, token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create account.');
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // continue logout client-side regardless
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSavedReports([]);
  };

  const updateSettings = async (settings: Partial<UserProfile['settings']>) => {
    if (!token) throw new Error('Not authenticated.');
    const res = await fetch('/api/auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings.');
    }

    const data = await res.json();
    setUser(data.user);
  };

  const saveInvestigationReport = async (reportData: {
    result: any;
    title?: string;
    notes?: string;
    tags?: string[];
  }): Promise<SavedReportItem> => {
    if (!token) throw new Error('You must be signed in to save investigation reports.');

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reportData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save investigation report.');
    }

    const data = await res.json();
    setSavedReports((prev) => [data.report, ...prev]);
    return data.report;
  };

  const deleteSavedReport = async (reportId: string) => {
    if (!token) throw new Error('Not authenticated.');
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete report.');
    }

    setSavedReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const updateSavedReport = async (
    reportId: string,
    updates: Partial<Pick<SavedReportItem, 'title' | 'notes' | 'tags' | 'status'>>
  ): Promise<SavedReportItem> => {
    if (!token) throw new Error('Not authenticated.');
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update report.');
    }

    const data = await res.json();
    setSavedReports((prev) =>
      prev.map((r) => (r.id === reportId ? data.report : r))
    );
    return data.report;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        updateSettings,
        savedReports,
        fetchSavedReports,
        saveInvestigationReport,
        deleteSavedReport,
        updateSavedReport,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
