import React from 'react';
import { Upload, Hand, Grip, ZoomIn, Trash2 } from 'lucide-react';
import { AppState, GestureType } from '../types';

interface InterfaceOverlayProps {
  appState: AppState;
  currentGesture: GestureType;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoCount: number;
  isFocusMode: boolean;
  onRemovePhoto: () => void;
}

export const InterfaceOverlay: React.FC<InterfaceOverlayProps> = ({ 
  appState, 
  currentGesture, 
  onFileUpload,
  photoCount,
  isFocusMode,
  onRemovePhoto
}) => {
  
  // Visual helper for active gesture
  const getGestureColor = (target: GestureType) => 
    currentGesture === target ? 'text-yellow-400 scale-110 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]' : 'text-white/50';

  return (
    <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-10">
      
      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div>
          <h1 className="text-4xl font-serif text-yellow-500 tracking-wider drop-shadow-lg">
            NOEL <span className="text-red-600">MAGIC</span>
          </h1>
          <p className="text-green-200/80 text-sm mt-1 uppercase tracking-widest">
            Interactive 3D Gesture Experience
          </p>
        </div>

        {/* Upload Control */}
        <label className="flex items-center gap-3 bg-green-900/40 backdrop-blur-md px-6 py-3 rounded-full border border-green-700/50 hover:bg-green-800/60 transition cursor-pointer group">
          <Upload size={18} className="text-yellow-500 group-hover:scale-110 transition" />
          <span className="text-xs font-bold text-green-100 tracking-widest">ADD MEMORY ({photoCount})</span>
          <input type="file" onChange={onFileUpload} className="hidden" accept="image/*" />
        </label>
      </div>

      {/* State Indicator */}
      <div className="absolute top-1/2 left-8 transform -translate-y-1/2 space-y-2">
        <div className={`w-1 h-16 rounded-full transition-all duration-500 ${appState === AppState.TREE ? 'bg-yellow-500 shadow-[0_0_20px_orange]' : 'bg-gray-800'}`} />
        <div className={`w-1 h-16 rounded-full transition-all duration-500 ${appState === AppState.SCATTER ? 'bg-green-500 shadow-[0_0_20px_green]' : 'bg-gray-800'}`} />
        <div className={`w-1 h-16 rounded-full transition-all duration-500 ${appState === AppState.FOCUS ? 'bg-red-500 shadow-[0_0_20px_red]' : 'bg-gray-800'}`} />
      </div>

      {/* Delete Button (Only in Focus Mode) */}
      {isFocusMode && (
         <div className="absolute top-1/2 right-8 transform -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-2 animate-in fade-in slide-in-from-right-10 duration-500">
            <button 
              onClick={onRemovePhoto}
              className="bg-red-900/30 backdrop-blur-md p-4 rounded-full border border-red-500/30 hover:bg-red-800/50 transition-all hover:scale-110 group shadow-[0_0_20px_rgba(200,0,0,0.2)]"
            >
              <Trash2 size={24} className="text-red-500 group-hover:text-red-200" />
            </button>
            <span className="text-[10px] font-bold tracking-widest uppercase text-red-500/50">Remove</span>
         </div>
       )}

      {/* Footer / Instructions */}
      <div className="flex flex-col items-center gap-6">
        
        {/* Gesture Guide */}
        <div className="flex gap-12 bg-black/60 backdrop-blur-md px-10 py-4 rounded-2xl border border-white/10">
          
          <div className={`flex flex-col items-center gap-2 transition-all ${getGestureColor(GestureType.FIST)}`}>
            <div className="bg-white/10 p-3 rounded-full">
              <Grip size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Fist • Tree</span>
          </div>

          <div className={`flex flex-col items-center gap-2 transition-all ${getGestureColor(GestureType.OPEN)}`}>
            <div className="bg-white/10 p-3 rounded-full">
              <Hand size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Open • Scatter</span>
          </div>

          <div className={`flex flex-col items-center gap-2 transition-all ${getGestureColor(GestureType.PINCH)}`}>
            <div className="bg-white/10 p-3 rounded-full">
              <ZoomIn size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Pinch • Focus</span>
          </div>

        </div>

        <div className="text-white/30 text-xs">
          Use your hand in front of the camera to control the magic.
        </div>
      </div>
    </div>
  );
};