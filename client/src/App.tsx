import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useWhiteboard } from './context/WhiteboardContext';
import { useSocket } from './context/SocketContext';
import { WhiteboardCanvas } from './components/whiteboard/WhiteboardCanvas';
import { Toolbar } from './components/whiteboard/Toolbar';
import { AiCorrectionBar } from './components/whiteboard/AiCorrectionBar';
import { CorrectionPreviewModal } from './components/whiteboard/CorrectionPreviewModal';
import { MathEditorModal } from './components/whiteboard/MathEditorModal';
import { PageThumbnailsBar } from './components/whiteboard/PageThumbnailsBar';
import { ExportModal } from './components/whiteboard/ExportModal';
import { UploadModal } from './components/whiteboard/UploadModal';
import { LiveClassroomHeader } from './components/whiteboard/LiveClassroomHeader';
import { Dashboard } from './components/dashboard/Dashboard';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { WhiteboardDocument } from './types/whiteboard';

export const App: React.FC = () => {
  const { user, loading, joinAsStudent } = useAuth();
  const { board, setBoard } = useWhiteboard();
  const { joinRoom } = useSocket();

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isMathEditorOpen, setIsMathEditorOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Check URL params for direct room link (e.g. ?room=MATH-1001)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      fetch(`/api/whiteboards/room/${roomParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.whiteboard) {
            setBoard(data.whiteboard);
            joinRoom(roomParam, user?.name || 'Student', user?.role || 'student');
          }
        })
        .catch(err => console.error('Error joining room from URL:', err));
    }
  }, [joinRoom, setBoard, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Initializing AI Whiteboard System...
      </div>
    );
  }

  // Not logged in and not in a guest session
  if (!user) {
    if (authView === 'login') {
      return (
        <Login
          onSwitchToRegister={() => setAuthView('register')}
          onJoinAsStudent={(studentName) => joinAsStudent(studentName)}
        />
      );
    }
    return <Register onSwitchToLogin={() => setAuthView('login')} />;
  }

  // Logged in, but haven't opened a whiteboard yet -> show Dashboard
  if (!board) {
    return (
      <Dashboard
        onOpenBoard={(selectedBoard: WhiteboardDocument) => {
          setBoard(selectedBoard);
          joinRoom(selectedBoard.roomCode, user.name, user.role);
        }}
      />
    );
  }

  // Active Whiteboard Workspace
  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden bg-slate-900 select-none font-sans">
      {/* 1. Top Classroom Navigation & Live Info Header */}
      <LiveClassroomHeader
        onBackToDashboard={() => setBoard(null)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* 2. Floating AI Handwriting Correction Option Bar (Top Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
        <AiCorrectionBar />
      </div>

      {/* 3. Floating Teaching Toolbar (Top Left or Side) */}
      <div className="absolute top-16 left-4 z-30">
        <Toolbar
          onOpenMathEditor={() => setIsMathEditorOpen(true)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />
      </div>

      {/* 4. Main Infinite Canvas Workspace */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <WhiteboardCanvas />
      </div>

      {/* 5. Bottom Left: Multi-page Thumbnails Bar */}
      <PageThumbnailsBar />

      {/* 6. Non-Destructive AI Correction Preview Card (Anchored bottom center) */}
      <CorrectionPreviewModal />

      {/* 7. Dedicated Manual Math & LaTeX Editor Modal */}
      <MathEditorModal
        isOpen={isMathEditorOpen}
        onClose={() => setIsMathEditorOpen(false)}
      />

      {/* 8. Export Modal (PDF / PNG / JPG / JSON) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* 9. Upload & PDF Annotation Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};
