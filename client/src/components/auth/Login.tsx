import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogIn, UserCheck, GraduationCap, ArrowRight } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
  onJoinAsStudent: (studentName: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onJoinAsStudent }) => {
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState<string>('teacher@mathboard.ai');
  const [password, setPassword] = useState<string>('password123');
  const [studentName, setStudentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    await loginDemo();
    setIsSubmitting(false);
  };

  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    onJoinAsStudent(studentName.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl shadow-xl shadow-sky-500/20 mb-1">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">DigiClass</span>
          </h2>
          <p className="text-xs text-sky-400 font-mono font-medium">digiclass.fun</p>
          <p className="text-xs text-slate-400">
            AI Digital Whiteboard for Online Mathematics & English Teaching
          </p>
        </div>

        {/* Quick Demo Login Pill */}
        <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-sky-400">
            <UserCheck className="w-4 h-4" />
            <span>Instant Access:</span>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isSubmitting}
            className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Sign in as Demo Teacher (Class 9-12 / O & A Level)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Standard Teacher Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Teacher Email:</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="teacher@school.edu"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">Password:</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-1.5"
          >
            <LogIn className="w-4 h-4 text-sky-400" />
            <span>{isSubmitting ? 'Signing in...' : 'Sign In as Teacher'}</span>
          </button>
        </form>

        {/* Student Direct Join Option */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">Are you a Student joining a class?</span>
          </div>
          <form onSubmit={handleStudentJoin} className="flex gap-2">
            <input
              type="text"
              placeholder="Your Student Name..."
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Enter
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-1">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-sky-400 hover:underline font-semibold"
          >
            Register as Teacher
          </button>
        </div>
      </div>
    </div>
  );
};
