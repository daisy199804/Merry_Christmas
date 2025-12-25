import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Loader } from '@react-three/drei';
import { AppState, GestureType, PhotoData } from './types';
import { Experience } from './components/Experience';
import { HandManager } from './components/HandManager';
import { InterfaceOverlay } from './components/InterfaceOverlay';

// Placeholder images
const DEFAULT_PHOTOS = [
  'https://picsum.photos/400/600',
  'https://picsum.photos/400/400',
  'https://picsum.photos/500/400',
  'https://picsum.photos/400/500',
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const [focusedPhotoIndex, setFocusedPhotoIndex] = useState<number | null>(null);
  
  // Hand tracking data for camera movement
  const handPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleGestureDetected = useCallback((gesture: GestureType, handX: number, handY: number) => {
    setCurrentGesture(gesture);
    handPositionRef.current = { x: handX, y: handY };

    // State machine logic based on gesture
    setAppState((prev) => {
      // Priority: FIST forces TREE
      if (gesture === GestureType.FIST && prev !== AppState.TREE) {
        return AppState.TREE;
      }
      
      // OPEN forces SCATTER (unless we are locked in FOCUS, but let's allow backing out)
      if (gesture === GestureType.OPEN && prev !== AppState.SCATTER) {
        setFocusedPhotoIndex(null); // Reset focus
        return AppState.SCATTER;
      }

      // PINCH triggers FOCUS if we are currently SCATTERED
      if (gesture === GestureType.PINCH && prev === AppState.SCATTER) {
        // Pick a random photo to focus on for the demo, or cycle them
        // In a real app, we'd raycast from hand position
        setFocusedPhotoIndex((prevIndex) => (prevIndex === null ? 0 : (prevIndex + 1) % photos.length));
        return AppState.FOCUS;
      }

      return prev;
    });
  }, [photos.length]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPhotos((prev) => [...prev, url]);
    }
  };

  const handleRemovePhoto = () => {
    if (focusedPhotoIndex !== null) {
      // Release object URL if it's a blob to prevent memory leaks
      if (photos[focusedPhotoIndex].startsWith('blob:')) {
        URL.revokeObjectURL(photos[focusedPhotoIndex]);
      }
      
      setPhotos((prev) => prev.filter((_, i) => i !== focusedPhotoIndex));
      setFocusedPhotoIndex(null);
      setAppState(AppState.SCATTER); // Return to scatter mode after deletion
    }
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden font-sans">
      
      {/* 3D Scene Layer */}
      <Canvas
        shadows
        camera={{ position: [0, 0, 18], fov: 45 }}
        gl={{ antialias: false }} // Post-processing handles AA usually, better perf
        dpr={[1, 2]}
      >
        <color attach="background" args={['#051005']} />
        
        <Experience 
          appState={appState} 
          photos={photos} 
          focusedPhotoIndex={focusedPhotoIndex}
          handPositionRef={handPositionRef}
        />

        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.6} />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>
      </Canvas>

      <Loader />

      {/* Logic Layer: Webcam & Gestures */}
      <HandManager onGestureDetected={handleGestureDetected} />

      {/* UI Layer */}
      <InterfaceOverlay 
        appState={appState} 
        currentGesture={currentGesture} 
        onFileUpload={handlePhotoUpload} 
        photoCount={photos.length}
        isFocusMode={appState === AppState.FOCUS && focusedPhotoIndex !== null}
        onRemovePhoto={handleRemovePhoto}
      />
    </div>
  );
};

export default App;