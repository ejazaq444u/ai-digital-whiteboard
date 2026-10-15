import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, UserPlus, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['Class 10', 'Class 12', 'A Level']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const availableGrades = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level'];

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsSubmitting(true);
    await register(name, email, password, selectedGrades);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl shadow-xl shadow-sky-500/20 mb-1">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Teacher Registration
          </h2>
          <p className="text-xs text-slate-400">
            Create your account to start live mathematical teaching sessions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Full Name / Title:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="e.g. Dr. Arthur Cayley"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">Email Address:</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
              placeholder="arthur@cambridge.edu"
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

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Mathematics Classes Taught:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {availableGrades.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrade(g)}
                  className={`p-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedGrades.includes(g)
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Account...' : 'Complete Teacher Registration'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-1">
          Already registered?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:underline font-semibold"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
