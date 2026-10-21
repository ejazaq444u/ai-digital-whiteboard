import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  gradeLevelsTaught?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: () => Promise<boolean>;
  register: (name: string, email: string, password: string, gradeLevels?: string[]) => Promise<boolean>;
  logout: () => void;
  joinAsStudent: (studentName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Check for offline/Hostinger saved session
      const offlineUser = localStorage.getItem('offline_user');
      if (offlineUser) {
        try {
          setUser(JSON.parse(offlineUser));
          setToken(storedToken);
          setLoading(false);
          return;
        } catch (e) {}
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            setUser(data.user);
            setToken(storedToken);
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Backend unavailable, running in local mode');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data.user);
            return true;
          }
        } catch (e) {}
      }
    } catch (err: any) {
      console.warn('[Backend unavailable, using static offline authentication]:', err);
    }

    // Hostinger Static Fallback: instant teacher login
    if (email) {
      const offlineUser: User = {
        id: 'usr_teacher_digiclass',
        name: email.split('@')[0] || 'Teacher',
        email: email,
        role: 'teacher',
        gradeLevelsTaught: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level']
      };
      const offlineToken = 'offline_token_' + Date.now();
      localStorage.setItem('token', offlineToken);
      localStorage.setItem('offline_user', JSON.stringify(offlineUser));
      setToken(offlineToken);
      setUser(offlineUser);
      return true;
    }
    return false;
  };

  const loginDemo = async (): Promise<boolean> => {
    return login('teacher@digiclass.fun', 'password123');
  };

  const register = async (name: string, email: string, password: string, gradeLevels?: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'teacher',
          gradeLevelsTaught: gradeLevels || ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level']
        })
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data.user);
            return true;
          }
        } catch (e) {}
      }
    } catch (err: any) {
      console.warn('Backend unavailable, creating local teacher profile');
    }

    // Hostinger Static Fallback
    const offlineUser: User = {
      id: `usr_${Date.now()}`,
      name: name || 'Teacher',
      email: email,
      role: 'teacher',
      gradeLevelsTaught: gradeLevels || ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level']
    };
    const offlineToken = 'offline_token_' + Date.now();
    localStorage.setItem('token', offlineToken);
    localStorage.setItem('offline_user', JSON.stringify(offlineUser));
    setToken(offlineToken);
    setUser(offlineUser);
    return true;
  };

  const joinAsStudent = (studentName: string) => {
    const studentUser: User = {
      id: `std_${Date.now()}`,
      name: studentName.trim() || 'Student',
      email: `${studentName.toLowerCase().replace(/\s+/g, '')}@digiclass.fun`,
      role: 'student'
    };
    setUser(studentUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('offline_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginDemo, register, logout, joinAsStudent }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
