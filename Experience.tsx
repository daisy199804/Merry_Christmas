import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Image, Text } from '@react-three/drei';
import * as THREE from 'three';
import { damp3, dampQ, damp } from 'maath/easing';
import { AppState, ParticleData, PhotoData } from '../types';
import { COLORS, CONFIG } from '../constants';

interface ExperienceProps {
  appState: AppState;
  photos: string[];
  focusedPhotoIndex: number | null;
  handPositionRef: React.MutableRefObject<{ x: number; y: number }>;
}

export const Experience: React.FC<ExperienceProps> = ({ 
  appState, 
  photos, 
  focusedPhotoIndex,
  handPositionRef 
}) => {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Generate Geometry Data
  const { particles, photoPositions } = useMemo(() => {
    const tempParticles: ParticleData[] = [];
    const tempPhotoPositions: PhotoData[] = [];
    const count = CONFIG.PARTICLE_COUNT;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.3999 radians

    // 1. Ornaments (Spheres, Cubes)
    for (let i = 0; i < count; i++) {
      // Y Position: Linear distribution from bottom to top to ensure no vertical gaps
      const t = i / count; 
      const yTree = CONFIG.TREE_HEIGHT * (t - 0.5); // Range: -Height/2 to Height/2
      
      // Cone radius at this specific height
      const normalizedY = (yTree + CONFIG.TREE_HEIGHT / 2) / CONFIG.TREE_HEIGHT; 
      // Add slight curve to the cone shape (pow 0.8) for a fuller bottom look
      const maxRadiusAtY = CONFIG.TREE_RADIUS_BOTTOM * Math.pow((1 - normalizedY), 0.9) + 0.2;
      
      // Phyllotaxis (Spiral) Pattern for perfect radial distribution
      const theta = i * goldenAngle; 

      // Radius Depth:
      // Most particles on surface (0.8-1.0), some inside for volume (0.0-0.8)
      // This prevents the "hollow shell" look
      const isSurface = Math.random() > 0.2;
      const rScale = isSurface 
        ? 0.9 + Math.random() * 0.2  // Surface variation
        : Math.random() * 0.8;       // Inner volume
      
      const rCurrent = maxRadiusAtY * rScale;

      const xTree = Math.cos(theta) * rCurrent;
      const zTree = Math.sin(theta) * rCurrent;

      // Random Scatter Position
      const rScatter = CONFIG.SCATTER_RADIUS * Math.cbrt(Math.random());
      const thetaScatter = Math.random() * 2 * Math.PI;
      const phiScatter = Math.acos(2 * Math.random() - 1);
      
      const xScatter = rScatter * Math.sin(phiScatter) * Math.cos(thetaScatter);
      const yScatter = rScatter * Math.sin(phiScatter) * Math.sin(thetaScatter);
      const zScatter = rScatter * Math.cos(phiScatter);

      const type = Math.random() > 0.65 ? 'sphere' : (Math.random() > 0.5 ? 'cube' : 'candy');
      
      // Color Logic
      const randColor = Math.random();
      let color;
      if (randColor > 0.8) color = COLORS.METALLIC_GOLD;
      else if (randColor > 0.55) color = COLORS.CHRISTMAS_RED;
      else if (randColor > 0.25) color = COLORS.BRIGHT_GREEN; // More bright green
      else color = COLORS.MATTE_GREEN; // Add darker green base

      // Add occasional white "snow" particles
      if (Math.random() > 0.92) color = COLORS.WHITE;

      tempParticles.push({
        id: i,
        type,
        positionTree: [xTree, yTree, zTree],
        positionScatter: [xScatter, yScatter, zScatter],
        color,
        scale: Math.random() * 0.2 + 0.08, // Slightly smaller variance
      });
    }

    // 2. Photos Cloud positions
    photos.forEach((photoUrl, i) => {
      // Tree: Spiral around the outside
      const theta = (i / photos.length) * Math.PI * 8;
      const yTree = (i / photos.length - 0.5) * CONFIG.TREE_HEIGHT * 0.7; // Keep photos more central vertically
      const normalizedY = (yTree + CONFIG.TREE_HEIGHT / 2) / CONFIG.TREE_HEIGHT;
      const radiusAtY = (CONFIG.TREE_RADIUS_BOTTOM + 1.2) * (1 - normalizedY) + 0.5;

      const xTree = Math.cos(theta) * radiusAtY;
      const zTree = Math.sin(theta) * radiusAtY;

      // Scatter: Random
      const xScatter = (Math.random() - 0.5) * 16;
      const yScatter = (Math.random() - 0.5) * 12;
      const zScatter = (Math.random() - 0.5) * 8;

      tempPhotoPositions.push({
        id: `photo-${i}`,
        url: photoUrl,
        positionTree: [xTree, yTree, zTree],
        positionScatter: [xScatter, yScatter, zScatter],
        rotation: [0, Math.random() * 0.5, 0],
        aspectRatio: 1, 
      });
    });

    return { particles: tempParticles, photoPositions: tempPhotoPositions };
  }, [photos]);

  // Animation Loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Camera rotation based on hand in SCATTER mode
    if (appState === AppState.SCATTER) {
        const targetX = handPositionRef.current.y * 0.5; // Look up/down
        const targetY = handPositionRef.current.x * 0.5; // Rotate around Y
        damp3(state.camera.rotation, [targetX, targetY, 0], 0.5, delta);
    } else if (appState === AppState.TREE) {
        // Auto rotate tree slowly
        groupRef.current.rotation.y += delta * 0.15; // Slightly slower rotation for majesty
        damp3(state.camera.position, [0, 0, 18], 1, delta);
        damp3(state.camera.rotation, [0, 0, 0], 1, delta);
    } else if (appState === AppState.FOCUS) {
        damp3(state.camera.position, [0, 0, 8], 1, delta);
        damp3(state.camera.rotation, [0, 0, 0], 1, delta);
    }
  });

  return (
    <>
      <Environment preset="forest" /> {/* Changed to forest for better reflections */}
      <ambientLight intensity={0.4} color={COLORS.MATTE_GREEN} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={COLORS.METALLIC_GOLD} />
      <spotLight position={[-10, 15, 0]} angle={0.3} penumbra={1} intensity={2} color={COLORS.CHRISTMAS_RED} castShadow />
      
      {/* Backlight for depth */}
      <pointLight position={[0, 0, -10]} intensity={1} color="#004400" />

      <group ref={groupRef}>
        {/* Render Particles */}
        {particles.map((p) => (
          <Particle 
            key={p.id} 
            data={p} 
            appState={appState} 
          />
        ))}

        {/* Render Photos */}
        {photoPositions.map((p, i) => (
          <PhotoMesh 
            key={p.id} 
            data={p} 
            index={i}
            appState={appState} 
            isFocused={focusedPhotoIndex === i}
          />
        ))}
        
        {/* Central Star at top of tree */}
        <Star appState={appState} />
      </group>
    </>
  );
};

const Particle: React.FC<{ data: ParticleData; appState: AppState }> = ({ data, appState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Determine target position
    const target = appState === AppState.TREE ? data.positionTree : data.positionScatter;
    
    // Smooth transition
    damp3(meshRef.current.position, target, 0.6 + Math.random() * 0.5, delta);
    
    // Gentle floating
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.5;
  });

  // Optimize: Re-use geometries implicitly by type is tricky in map, 
  // but for 1200 simple meshes React Three Fiber should handle it okay on desktop.
  
  return (
    <mesh ref={meshRef} scale={data.scale}>
      {data.type === 'sphere' ? (
        <sphereGeometry args={[1, 8, 8]} /> // Reduced polygon count for performance
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshStandardMaterial 
        color={data.color} 
        metalness={0.8} 
        roughness={0.2} 
        emissive={data.color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

const PhotoMesh: React.FC<{ 
  data: PhotoData; 
  appState: AppState; 
  isFocused: boolean;
  index: number;
}> = ({ data, appState, isFocused, index }) => {
  const ref = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;

    let targetPos = appState === AppState.TREE ? data.positionTree : data.positionScatter;
    let targetScale = 1.0;
    let targetRot = [0, 0, 0] as [number, number, number];

    if (appState === AppState.FOCUS) {
      if (isFocused) {
        // Bring to front center
        targetPos = [0, 0, 5]; 
        targetScale = 3.5;
        targetRot = [0, 0, 0];
      } else {
        // Push others back and fade
        const originalScatter = data.positionScatter;
        targetPos = [originalScatter[0] * 1.5, originalScatter[1] * 1.5, originalScatter[2] - 10];
      }
    } else if (appState === AppState.SCATTER) {
      // Look at camera roughly
      ref.current.lookAt(state.camera.position);
    } else {
       // Tree mode: face outward from center
       ref.current.lookAt(0, ref.current.position.y, 0);
       ref.current.rotation.y += Math.PI; // Flip to face out
    }

    damp3(ref.current.position, targetPos, 0.5, delta);
    damp(ref.current.scale, 'x', targetScale, 0.5, delta);
    damp(ref.current.scale, 'y', targetScale, 0.5, delta);
    
    if (appState === AppState.FOCUS && isFocused) {
       damp3(ref.current.rotation, [0, 0, 0], 0.5, delta);
    }
  });

  return (
    <group ref={ref}>
      <Image 
        url={data.url} 
        scale={[1.5, 1.5]} // Base size
        transparent
        opacity={appState === AppState.FOCUS && !isFocused ? 0.1 : 1}
      />
      {/* Frame border */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshStandardMaterial color={COLORS.METALLIC_GOLD} metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
};

const Star: React.FC<{ appState: AppState }> = ({ appState }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const targetY = appState === AppState.TREE ? CONFIG.TREE_HEIGHT / 2 + 1 : 10;
    damp3(ref.current.position, [0, targetY, 0], 1, delta);
    ref.current.rotation.z += delta;
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshBasicMaterial color={COLORS.METALLIC_GOLD} toneMapped={false} />
      <pointLight intensity={2} color="yellow" distance={5} />
    </mesh>
  );
};