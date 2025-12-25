import React, { useEffect, useRef, useState } from 'react';
import { GestureType } from '../types';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

interface HandManagerProps {
  onGestureDetected: (gesture: GestureType, x: number, y: number) => void;
}

export const HandManager: React.FC<HandManagerProps> = ({ onGestureDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const lastGestureRef = useRef<GestureType>(GestureType.NONE);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let camera: any = null;
    let hands: any = null;

    const onResults = (results: any) => {
      setLoading(false);
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // 1. Calculate Hand Position (Center of Palm approx)
        // Landmarks: 0 (Wrist), 9 (Middle MCP)
        const palmX = (landmarks[0].x + landmarks[9].x) / 2;
        const palmY = (landmarks[0].y + landmarks[9].y) / 2;
        
        // Normalize -1 to 1 for 3D usage (MediaPipe is 0 to 1)
        // Invert X because webcam is mirrored
        const normalizedX = (0.5 - palmX) * 4; 
        const normalizedY = (0.5 - palmY) * 2;

        // 2. Recognize Gestures
        const gesture = detectGesture(landmarks);
        
        // Debounce simple filter could go here, but passing raw for responsiveness
        onGestureDetected(gesture, normalizedX, normalizedY);
        lastGestureRef.current = gesture;
      } else {
        onGestureDetected(GestureType.NONE, 0, 0);
      }
    };

    const initializeMediaPipe = async () => {
      if (!window.Hands) {
         console.error('MediaPipe Hands not loaded via CDN');
         return;
      }

      hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);

      if (window.Camera && videoElement) {
        camera = new window.Camera(videoElement, {
          onFrame: async () => {
            await hands.send({ image: videoElement });
          },
          width: 640,
          height: 480,
        });
        camera.start();
      }
    };

    initializeMediaPipe();

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, [onGestureDetected]);

  return (
    <>
      <video
        ref={videoRef}
        className="fixed bottom-4 right-4 w-48 h-36 object-cover rounded-lg border-2 border-green-800 z-50 opacity-80 mix-blend-screen scale-x-[-1]"
        playsInline
      />
      {loading && (
        <div className="fixed bottom-20 right-4 text-green-500 text-sm animate-pulse">
          Initializing Vision AI...
        </div>
      )}
    </>
  );
};

// Helper: Gesture Detection Logic
function detectGesture(landmarks: any[]): GestureType {
  // Finger Tips: 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
  // Finger PIP (Joints): 6, 10, 14, 18
  // Thumb Tip: 4
  
  const isFingerOpen = (tipIdx: number, pipIdx: number) => {
    return landmarks[tipIdx].y < landmarks[pipIdx].y; // Y increases downwards
  };

  const indexOpen = isFingerOpen(8, 6);
  const middleOpen = isFingerOpen(12, 10);
  const ringOpen = isFingerOpen(16, 14);
  const pinkyOpen = isFingerOpen(20, 18);

  // Distance between Thumb Tip (4) and Index Tip (8)
  const pinchDistance = Math.hypot(
    landmarks[4].x - landmarks[8].x,
    landmarks[4].y - landmarks[8].y
  );

  // FIST: All fingers closed
  if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    return GestureType.FIST;
  }

  // PINCH: Thumb and Index close together
  if (pinchDistance < 0.05) {
    return GestureType.PINCH;
  }

  // OPEN: At least 3 fingers open
  if ((indexOpen && middleOpen && ringOpen) || (middleOpen && ringOpen && pinkyOpen)) {
    return GestureType.OPEN;
  }

  return GestureType.NONE;
}
