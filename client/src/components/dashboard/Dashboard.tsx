import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { WhiteboardDocument } from '../../types/whiteboard';
import {
  Plus,
  Play,
  Key,
  LogOut,
  FolderOpen,
  Calendar,
  Sparkles,
  Search,
  Sliders,
  CheckCircle,
  Copy,
  Trash2,
  ExternalLink,
  GraduationCap,
  Layers,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  onOpenBoard: (board: WhiteboardDocument) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenBoard }) => {
  const { user, logout } = useAuth();
  const { joinRoom } = useSocket();

  const [boards, setBoards] = useState<WhiteboardDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewBoardModalOpen, setIsNewBoardModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newGrade, setNewGrade] = useState<string>('Class 10');

  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinName, setJoinName] = useState<string>('');

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [mathpixAppId, setMathpixAppId] = useState<string>('');
  const [mathpixKey, setMathpixKey] = useState<string>('');
  const [openAiKey, setOpenAiKey] = useState<string>('');

  const gradesList = ['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level'];

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whiteboards', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBoards(data.whiteboards || []);
      }
    } catch (err) {
      console.error('Failed to fetch whiteboards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async () => {
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          gradeLevel: newGrade
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsNewBoardModalOpen(false);
        setNewTitle('');
        joinRoom(data.whiteboard.roomCode, user?.name, user?.role);
        onOpenBoard(data.whiteboard);
      }
    } catch (err) {
      alert('Error creating board');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    const cleanCode = joinCode.trim().toUpperCase();

    try {
      const res = await fetch(`/api/whiteboards/room/${cleanCode}`);
      if (res.ok) {
        const data = await res.json();
        setIsJoinModalOpen(false);
        joinRoom(cleanCode, joinName || user?.name || 'Student', user?.role || 'student');
        onOpenBoard(data.whiteboard);
      } else {
        alert('Could not find live classroom with code: ' + cleanCode);
      }
    } catch (err: any) {
      alert('Join error: ' + err.message);
    }
  };

  const handleDeleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this whiteboard?')) return;

    try {
      const res = await fetch(`/api/whiteboards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setBoards(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleSaveApiKeys = async () => {
    try {
      const res = await fetch('/api/ai/configure-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: geminiKey,
          openAiApiKey: openAiKey,
          mathpixAppId: mathpixAppId,
          mathpixAppKey: mathpixKey
        })
      });
      if (res.ok) {
        alert('API keys configured successfully!');
        setIsApiKeyModalOpen(false);
      }
    } catch (err: any) {
      alert('Failed to save API keys: ' + err.message);
    }
  };

  const filteredBoards = boards.filter(b => {
    const matchesGrade = selectedGrade === 'All' || b.gradeLevel === selectedGrade;
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.roomCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center space-x-2">
              <span>AI Digital Whiteboard</span>
              <span className="text-xs font-normal px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full">
                Mathematics & English
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Class 9-12 • O Level • A Level Mathematics</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Recognition Keys</span>
          </button>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-xl border border-sky-500/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-sky-400" />
            <span>Join Live Room</span>
          </button>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-200">{user?.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Banner with Call to Actions */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900/50 via-slate-800 to-indigo-950/60 border border-slate-700 p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-xs font-bold tracking-wide uppercase">
              Automatic Handwriting Recognition & Math Processing
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Teach Mathematics Naturally with AI Assistance
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Write with mouse, touchscreen, stylus, or graphic tablet. Convert rough formulas like <code className="bg-slate-800/80 px-1.5 py-0.5 rounded text-sky-300 font-mono">x2 + 5x + 6 = 0</code> into clean KaTeX notation and English sentences into neat classroom handwriting—while preserving your original strokes for instant recovery.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setIsNewBoardModalOpen(true)}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all scale-100 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Whiteboard</span>
              </button>
              <button
                onClick={() => {
                  setJoinCode('MATH-1001');
                  setIsJoinModalOpen(true);
                }}
                className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                <span>Open Demo Calculus Lesson (MATH-1001)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {gradesList.map(grade => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGrade === grade
                    ? 'bg-sky-500 text-slate-900 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search lessons or room code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>

        {/* Whiteboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoards.map(board => (
            <div
              key={board.id}
              onClick={() => {
                joinRoom(board.roomCode, user?.name, user?.role);
                onOpenBoard(board);
              }}
              className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-sky-500/5 hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[11px] font-semibold flex items-center space-x-1">
                    <GraduationCap className="w-3 h-3" />
                    <span>{board.gradeLevel}</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                    {board.roomCode}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2">
                  {board.title}
                </h3>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{board.pages.length} Pages</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleDeleteBoard(board.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
                    title="Delete whiteboard"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sky-400 group-hover:translate-x-1 transition-transform flex items-center font-semibold text-xs">
                    <span>Open</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create New Whiteboard Modal */}
      {isNewBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 text-slate-100">
            <h3 className="text-lg font-bold">Create New Mathematics Whiteboard</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold">Lesson Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Quadratic Formula & Discriminant Analysis"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">Target Grade / Curriculum:</label>
                <select
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
                >
                  <option value="Class 9">Class 9 Mathematics</option>
                  <option value="Class 10">Class 10 Mathematics</option>
                  <option value="Class 11">Class 11 Mathematics</option>
                  <option value="Class 12">Class 12 Advanced Mathematics</option>
                  <option value="O Level">Cambridge O Level Mathematics</option>
                  <option value="A Level">Cambridge A Level Further Mathematics</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsNewBoardModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Create Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 text-slate-100">
            <h3 className="text-lg font-bold">Join Live Classroom Whiteboard</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold">Room Join Code:</label>
                <input
                  type="text"
                  placeholder="e.g. MATH-1001"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono uppercase text-sky-400 font-bold focus:ring-1 focus:ring-sky-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">Your Display Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins (Student)"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinByCode}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Join Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Settings & Cloud Keys Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-slate-100">
            <div>
              <h3 className="text-lg font-bold">AI Handwriting Recognition Engine Keys</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure optional cloud OCR providers. The high-performance local offline engine is always active!
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Google Gemini Vision API Key (Optional):</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Mathpix App ID (Optional for Math OCR):</label>
                <input
                  type="text"
                  placeholder="e.g. your_app_id"
                  value={mathpixAppId}
                  onChange={(e) => setMathpixAppId(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Mathpix App Key (Optional):</label>
                <input
                  type="password"
                  placeholder="e.g. your_app_key"
                  value={mathpixKey}
                  onChange={(e) => setMathpixKey(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-slate-400 text-[11px] leading-relaxed">
                <span className="font-bold text-sky-400">Security guarantee:</span> Keys are stored exclusively in backend memory and are never exposed in frontend code.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                onClick={handleSaveApiKeys}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl shadow-md"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
