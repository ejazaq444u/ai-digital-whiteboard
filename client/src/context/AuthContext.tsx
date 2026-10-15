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
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
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
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      alert(data.error || 'Login failed');
      return false;
    } catch (err: any) {
      alert('Network error during login: ' + err.message);
      return false;
    }
  };

  const loginDemo = async (): Promise<boolean> => {
    return login('teacher@mathboard.ai', 'password123');
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
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      alert(data.error || 'Registration failed');
      return false;
    } catch (err: any) {
      alert('Network error during registration: ' + err.message);
      return false;
    }
  };

  const joinAsStudent = (studentName: string) => {
    const studentUser: User = {
      id: `std_${Date.now()}`,
      name: studentName.trim() || 'Student',
      email: `${studentName.toLowerCase().replace(/\s+/g, '')}@student.ai`,
      role: 'student'
    };
    setUser(studentUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
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
