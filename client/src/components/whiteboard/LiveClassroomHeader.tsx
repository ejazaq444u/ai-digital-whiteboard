import React, { useState } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Copy,
  Check,
  Save,
  Download,
  Shield,
  ArrowLeft,
  Share2,
  Lock,
  Unlock,
  GraduationCap
} from 'lucide-react';
import { ScreenRecorder } from './ScreenRecorder';

interface LiveClassroomHeaderProps {
  onBackToDashboard: () => void;
  onOpenExportModal: () => void;
}

export const LiveClassroomHeader: React.FC<LiveClassroomHeaderProps> = ({
  onBackToDashboard,
  onOpenExportModal
}) => {
  const { user } = useAuth();
  const { board, setBoard, saveBoard, isSaving, lastSavedAt } = useWhiteboard();
  const { participants, emitUpdatePermissions } = useSocket();

  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState<boolean>(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState<boolean>(false);

  if (!board) return null;

  const isTeacher = user?.role === 'teacher';

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(board.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}?room=${board.roomCode}`;
    navigator.clipboard.writeText(url);
    alert(`Live Classroom link copied to clipboard!\n${url}`);
  };

  const handleToggleStudentDrawing = () => {
    if (!isTeacher) return;
    const current = board.permissions.allowStudentDrawing;
    const updated = {
      ...board.permissions,
      allowStudentDrawing: !current
    };
    setBoard(prev => prev ? { ...prev, permissions: updated } : prev);
    emitUpdatePermissions(board.roomCode, updated);
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 select-none">
      {/* Left: Back + Board Title + Grade */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBackToDashboard}
          className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          title="Return to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 rounded-lg">
            <span className="font-extrabold text-xs tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">DigiClass</span>
            <span className="text-[10px] text-slate-400 font-mono">.fun</span>
          </span>
          <input
            type="text"
            value={board.title}
            onChange={(e) => setBoard(b => b ? { ...b, title: e.target.value } : b)}
            className="bg-transparent hover:bg-slate-800/60 focus:bg-slate-800 text-slate-100 font-bold text-sm px-2 py-1 rounded-lg border border-transparent focus:border-slate-700 outline-none w-64 md:w-80 truncate"
            title="Click to rename lesson"
          />
          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-md flex items-center space-x-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{board.gradeLevel}</span>
          </span>
        </div>
      </div>

      {/* Center: Live Room Join Code Badge */}
      <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Live Room:</span>
        <button
          onClick={handleCopyRoomCode}
          className="flex items-center space-x-1 font-mono font-bold text-sky-400 hover:text-sky-300 text-sm px-1.5 py-0.5 rounded bg-slate-900/60 hover:bg-slate-900 transition-colors"
          title="Click to copy Room Code"
        >
          <span>{board.roomCode}</span>
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleCopyShareLink}
          className="p-1 hover:bg-slate-700 text-slate-400 hover:text-sky-400 rounded transition-colors"
          title="Share link with students"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Collaborators + Save + Export */}
      <div className="flex items-center space-x-2">
        {/* Collaborators Button */}
        <div className="relative">
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{participants.length || 1} online</span>
          </button>

          {isParticipantsOpen && (
            <div className="absolute right-0 top-12 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-300 animate-in fade-in">
              <div className="font-bold text-slate-100 pb-2 border-b border-slate-700 mb-2">
                Connected Students & Teachers
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {participants.length > 0 ? (
                  participants.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="truncate">{p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${p.role === 'teacher' ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {p.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">Waiting for students to join...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Permissions toggle for teacher */}
        {isTeacher && (
          <button
            onClick={handleToggleStudentDrawing}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              board.permissions.allowStudentDrawing
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={board.permissions.allowStudentDrawing ? 'Students can draw' : 'Student drawing locked'}
          >
            {board.permissions.allowStudentDrawing ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{board.permissions.allowStudentDrawing ? 'Students: Write' : 'Students: View Only'}</span>
          </button>
        )}

        {/* High-Speed Screen & Canvas Lesson Recorder */}
        <ScreenRecorder />

        {/* Save Button */}
        <button
          onClick={saveBoard}
          disabled={isSaving}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          title={lastSavedAt ? `Last saved at ${lastSavedAt}` : 'Save lesson'}
        >
          <Save className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
