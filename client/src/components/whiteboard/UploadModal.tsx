import React, { useState } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import { UploadCloud, FileText, Image as ImageIcon, X, Check } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { addObject } = useWhiteboard();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (selected.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
        reader.readAsDataURL(selected);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();

      // Add object to whiteboard page
      addObject({
        id: `media_${Date.now()}`,
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        x: 100,
        y: 100,
        width: 600,
        height: 450,
        imageUrl: data.url,
        text: file.name,
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">PDF & Image Annotation</h3>
              <p className="text-xs text-slate-400">Import curriculum worksheets, past papers & diagrams</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-900/40 relative">
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-h-36 rounded-lg object-contain shadow-md" />
            ) : file ? (
              <div className="flex flex-col items-center space-y-2">
                <FileText className="w-10 h-10 text-sky-400" />
                <span className="text-xs font-mono text-slate-200">{file.name}</span>
                <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <UploadCloud className="w-10 h-10 text-slate-500" />
                <span className="text-xs font-semibold text-slate-300">Click or drag & drop files here</span>
                <span className="text-[11px] text-slate-500">Supports PDF past papers, worksheets, PNG, JPG</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium rounded-xl hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isUploading ? 'Uploading...' : 'Place onto Whiteboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
