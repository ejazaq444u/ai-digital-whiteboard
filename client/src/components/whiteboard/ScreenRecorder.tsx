import React, { useState, useRef, useEffect } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import {
  Video,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Download,
  X,
  Sparkles,
  Monitor,
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const ScreenRecorder: React.FC = () => {
  const { board, activePage } = useWhiteboard();

  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
  const [seconds, setSeconds] = useState<number>(0);
  const [includeMic, setIncludeMic] = useState<boolean>(true);
  const [recordMode, setRecordMode] = useState<'canvas' | 'screen'>('canvas');
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Clean up recorded URL
  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      stopAllTracks();
    };
  }, [recordedUrl]);

  const stopAllTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Timer formatted as MM:SS
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async (mode: 'canvas' | 'screen') => {
    setIsPickerOpen(false);
    recordedChunksRef.current = [];
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }

    try {
      let videoStream: MediaStream;

      if (mode === 'canvas') {
        // FASTEST METHOD: Hardware-accelerated Canvas 60 FPS CaptureStream (Zero Lag!)
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) {
          alert('Canvas element not found for recording.');
          return;
        }
        // Capture canvas stream at high-performance 60 FPS
        videoStream = canvas.captureStream(60);
      } else {
        // Full Screen / App Window Capture via Display Media
        videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            frameRate: { ideal: 60, max: 60 }
          },
          audio: true
        });
      }

      // Merge Microphone Audio if enabled
      let combinedStream = videoStream;

      if (includeMic) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });

          // Combine video and audio tracks
          const tracks = [...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()];
          combinedStream = new MediaStream(tracks);
        } catch (audioErr: any) {
          console.warn('[ScreenRecorder] Could not capture microphone:', audioErr.message);
          // Continues recording video even if mic permission is denied
        }
      }

      mediaStreamRef.current = combinedStream;

      // Select best supported MIME type for hardware encoding
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      const selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 4000000 // 4 Mbps high bitrate for crisp text/math
      };
      if (selectedMime) {
        recorderOptions.mimeType = selectedMime;
      }

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm'
        });
        const url = URL.createObjectURL(finalBlob);
        setRecordedBlob(finalBlob);
        setRecordedUrl(url);
        setStatus('finished');
        stopAllTracks();
        clearInterval(timerIntervalRef.current);
      };

      // Handle user clicking "Stop Sharing" on browser banner
      const videoTrack = combinedStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopRecording();
        };
      }

      // Collect data slices every 1s
      recorder.start(1000);
      setStatus('recording');
      setSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('[ScreenRecorder Error]:', err);
      if (err.name !== 'NotAllowedError') {
        alert('Could not start screen recorder: ' + err.message);
      }
      setStatus('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      timerIntervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerIntervalRef.current);
  };

  const handleDownload = () => {
    if (!recordedUrl) return;
    const cleanTitle = (board?.title || 'Lesson').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${cleanTitle}_${dateStr}_Recording.webm`;

    const a = document.createElement('a');
    a.href = recordedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDiscard = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    setStatus('idle');
    setSeconds(0);
  };

  return (
    <>
      {/* 1. Header Toolbar Control Pill */}
      {status === 'idle' ? (
        <button
          onClick={() => setIsPickerOpen(true)}
          title="Start Fast Screen / Canvas Recording with Voice"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-sm group"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 group-hover:scale-125 transition-transform animate-pulse" />
          <span className="hidden sm:inline">Record Lesson</span>
        </button>
      ) : (
        /* Active Recording Controls */
        <div className="flex items-center space-x-1.5 bg-rose-950/80 border border-rose-500/60 px-3 py-1 rounded-xl text-xs shadow-lg shadow-rose-950/40 animate-in fade-in">
          {/* Pulsing indicator & timer */}
          <div className="flex items-center space-x-1.5 pr-2 border-r border-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
            <span className="font-mono font-bold text-rose-200">{formatTime(seconds)}</span>
          </div>

          {/* Pause / Resume */}
          {status === 'recording' ? (
            <button
              onClick={pauseRecording}
              className="p-1 hover:bg-rose-900/60 text-rose-300 rounded transition-colors"
              title="Pause Recording"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={resumeRecording}
              className="p-1 hover:bg-rose-900/60 text-emerald-300 rounded transition-colors"
              title="Resume Recording"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            className="flex items-center space-x-1 px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold transition-colors shadow"
            title="Stop & Save Recording"
          >
            <Square className="w-3 h-3 fill-current" />
            <span className="text-[11px]">Finish</span>
          </button>
        </div>
      )}

      {/* 2. Recording Mode Selector Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Fastest Lesson Screen Recorder</h3>
                  <p className="text-xs text-slate-400">High-FPS hardware-accelerated video capture</p>
                </div>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recording Options */}
            <div className="space-y-3">
              {/* Option 1: Ultra-Fast Canvas Stream (Recommended) */}
              <button
                onClick={() => { setRecordMode('canvas'); startRecording('canvas'); }}
                className="w-full p-4 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-left transition-all group flex items-start space-x-3.5"
              >
                <div className="p-2 bg-sky-500 text-slate-900 rounded-xl group-hover:scale-105 transition-transform mt-0.5">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-sky-200">Whiteboard Canvas + Voice</span>
                    <span className="text-[10px] uppercase font-extrabold bg-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                      ⚡ Fastest (0 Lag)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Captures purely the whiteboard at 60 FPS directly from GPU. Starts instantly without browser dialogs or OS clutter!
                  </p>
                </div>
              </button>

              {/* Option 2: Full Screen / Window Capture */}
              <button
                onClick={() => { setRecordMode('screen'); startRecording('screen'); }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-900 text-left transition-all group flex items-start space-x-3.5"
              >
                <div className="p-2 bg-slate-700 text-slate-300 rounded-xl group-hover:scale-105 transition-transform mt-0.5">
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-slate-200">Entire Screen or App Window</div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Captures your entire desktop monitor, browser tabs, and system audio using standard screen sharing.
                  </p>
                </div>
              </button>
            </div>

            {/* Microphone Toggle */}
            <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                {includeMic ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-slate-500" />}
                <span className="font-semibold text-slate-300">Record Teacher Voice (Microphone):</span>
              </div>
              <button
                onClick={() => setIncludeMic(!includeMic)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  includeMic ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {includeMic ? 'Enabled' : 'Muted'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Recording Finished Preview & Instant Download Modal */}
      {status === 'finished' && recordedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">Lesson Recording Complete!</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Duration: {formatTime(seconds)} • Size: {recordedBlob ? (recordedBlob.size / 1024 / 1024).toFixed(2) : 0} MB
                  </p>
                </div>
              </div>
              <button onClick={handleDiscard} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Preview */}
            <div className="p-6 space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 shadow-inner max-h-72 flex items-center justify-center">
                <video
                  src={recordedUrl}
                  controls
                  autoPlay
                  className="w-full max-h-72 object-contain"
                />
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
                <span>Format: <strong>High-Definition WebM (60 FPS)</strong></span>
                <span className="text-emerald-400 font-bold">Ready to Save</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Discard & Record Again
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all scale-100 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File (.webm)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
