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

// New Component: Golden Spiral Garland
const Garland: React.FC<{ appState: AppState }> = ({ appState }) => {
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const loops = 5.5;
    const height = CONFIG.TREE_HEIGHT;
    const radiusBase = CONFIG.TREE_RADIUS_BOTTOM + 0.4; // Sit slightly outside the branches
    
    // Create a tapered spiral path
    for (let t = 0; t <= 1; t += 0.005) {
      const y = height * (t - 0.5); // Bottom to top
      const r = radiusBase * (1 - t) + 0.1; // Taper radius
      const theta = t * Math.PI * 2 * loops;
      points.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // In Scatter mode, shrink the garland away. In Tree mode, show it.
    const targetScale = appState === AppState.TREE ? 1 : 0;
    damp3(ref.current.scale, [targetScale, targetScale, targetScale], 0.5, delta);
    
    // Gentle pulsing effect
    if (appState === AppState.TREE) {
       ref.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={ref}>
      <tubeGeometry args={[curve, 128, 0.12, 8, false]} />
      <meshStandardMaterial 
        color={COLORS.METALLIC_GOLD} 
        emissive={COLORS.METALLIC_GOLD}
        emissiveIntensity={0.6}
        metalness={1.0} 
        roughness={0.1} 
      />
    </mesh>
  );
};

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
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    // 1. Ornaments (Spheres, Cubes, Rings, Diamonds)
    for (let i = 0; i < count; i++) {
      const t = i / count; 
      const yTree = CONFIG.TREE_HEIGHT * (t - 0.5);
      
      const normalizedY = (yTree + CONFIG.TREE_HEIGHT / 2) / CONFIG.TREE_HEIGHT; 
      const maxRadiusAtY = CONFIG.TREE_RADIUS_BOTTOM * Math.pow((1 - normalizedY), 0.9) + 0.2;
      
      const theta = i * goldenAngle; 

      const isSurface = Math.random() > 0.25;
      const rScale = isSurface 
        ? 0.9 + Math.random() * 0.25
        : Math.random() * 0.8;
      
      const rCurrent = maxRadiusAtY * rScale;

      const xTree = Math.cos(theta) * rCurrent;
      const zTree = Math.sin(theta) * rCurrent;

      const rScatter = CONFIG.SCATTER_RADIUS * Math.cbrt(Math.random());
      const thetaScatter = Math.random() * 2 * Math.PI;
      const phiScatter = Math.acos(2 * Math.random() - 1);
      
      const xScatter = rScatter * Math.sin(phiScatter) * Math.cos(thetaScatter);
      const yScatter = rScatter * Math.sin(phiScatter) * Math.sin(thetaScatter);
      const zScatter = rScatter * Math.cos(phiScatter);

      // --- Shape Distribution Strategy ---
      const randShape = Math.random();
      let type: ParticleData['type'] = 'sphere';
      
      // More fancy shapes towards the surface
      if (isSurface) {
        if (randShape > 0.92) type = 'diamond'; // Rare fancy ornament
        else if (randShape > 0.84) type = 'ring'; // Gold rings
        else if (randShape > 0.6) type = 'sphere';
        else type = 'cube';
      } else {
        type = Math.random() > 0.5 ? 'sphere' : 'candy';
      }
      
      // --- Color Logic ---
      let color;
      const randColor = Math.random();

      // Force special shapes to be Gold
      if (type === 'diamond' || type === 'ring') {
        color = COLORS.METALLIC_GOLD;
      } else {
        if (randColor > 0.75) color = COLORS.METALLIC_GOLD; // Increased gold probability
        else if (randColor > 0.55) color = COLORS.CHRISTMAS_RED;
        else if (randColor > 0.25) color = COLORS.BRIGHT_GREEN;
        else color = COLORS.MATTE_GREEN;

        if (Math.random() > 0.95) color = COLORS.WHITE;
      }

      tempParticles.push({
        id: i,
        type,
        positionTree: [xTree, yTree, zTree],
        positionScatter: [xScatter, yScatter, zScatter],
        color,
        scale: Math.random() * 0.2 + 0.08,
      });
    }

    // 2. Photos Cloud positions
    photos.forEach((photoUrl, i) => {
      const theta = (i / photos.length) * Math.PI * 8;
      const yTree = (i / photos.length - 0.5) * CONFIG.TREE_HEIGHT * 0.7;
      const normalizedY = (yTree + CONFIG.TREE_HEIGHT / 2) / CONFIG.TREE_HEIGHT;
      const radiusAtY = (CONFIG.TREE_RADIUS_BOTTOM + 1.2) * (1 - normalizedY) + 0.5;

      const xTree = Math.cos(theta) * radiusAtY;
      const zTree = Math.sin(theta) * radiusAtY;

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

    if (appState === AppState.SCATTER) {
        const targetX = handPositionRef.current.y * 0.5;
        const targetY = handPositionRef.current.x * 0.5;
        damp3(state.camera.rotation, [targetX, targetY, 0], 0.5, delta);
    } else if (appState === AppState.TREE) {
        groupRef.current.rotation.y += delta * 0.15;
        damp3(state.camera.position, [0, 0, 18], 1, delta);
        damp3(state.camera.rotation, [0, 0, 0], 1, delta);
    } else if (appState === AppState.FOCUS) {
        damp3(state.camera.position, [0, 0, 8], 1, delta);
        damp3(state.camera.rotation, [0, 0, 0], 1, delta);
    }
  });

  return (
    <>
      <Environment preset="city" /> 
      <ambientLight intensity={0.5} color={COLORS.MATTE_GREEN} />
      {/* Warm lights to highlight gold */}
      <pointLight position={[10, 10, 10]} intensity={2.5} color="#ffaa00" />
      <pointLight position={[-10, 5, 10]} intensity={1.5} color="#ffddaa" />
      <spotLight position={[-10, 15, 0]} angle={0.3} penumbra={1} intensity={2} color={COLORS.CHRISTMAS_RED} castShadow />
      
      <pointLight position={[0, 0, -10]} intensity={1} color="#004400" />

      <group ref={groupRef}>
        {/* The Golden Garland */}
        <Garland appState={appState} />

        {/* Particles */}
        {particles.map((p) => (
          <Particle key={p.id} data={p} appState={appState} />
        ))}

        {/* Photos */}
        {photoPositions.map((p, i) => (
          <PhotoMesh key={p.id} data={p} index={i} appState={appState} isFocused={focusedPhotoIndex === i} />
        ))}
        
        {/* Top Star */}
        <Star appState={appState} />
      </group>
    </>
  );
};

const Particle: React.FC<{ data: ParticleData; appState: AppState }> = ({ data, appState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const target = appState === AppState.TREE ? data.positionTree : data.positionScatter;
    damp3(meshRef.current.position, target, 0.6 + Math.random() * 0.5, delta);
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.5;
  });

  // Helper to determine geometry based on type
  const renderGeometry = () => {
    switch (data.type) {
      case 'cube': return <boxGeometry args={[0.7, 0.7, 0.7]} />;
      case 'ring': return <torusGeometry args={[0.3, 0.12, 8, 16]} />;
      case 'diamond': return <octahedronGeometry args={[0.5, 0]} />;
      case 'candy': return <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />;
      case 'sphere':
      default: return <sphereGeometry args={[0.4, 16, 16]} />;
    }
  };

  return (
    <mesh ref={meshRef} scale={data.scale}>
      {renderGeometry()}
      <meshStandardMaterial 
        color={data.color} 
        metalness={data.type === 'ring' || data.type === 'diamond' ? 1.0 : 0.6} 
        roughness={data.type === 'ring' || data.type === 'diamond' ? 0.1 : 0.3} 
        emissive={data.color}
        emissiveIntensity={data.color === COLORS.METALLIC_GOLD ? 0.6 : 0.2}
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

  useFrame((state, delta) => {
    if (!ref.current) return;

    let targetPos = appState === AppState.TREE ? data.positionTree : data.positionScatter;
    let targetScale = 1.0;

    if (appState === AppState.FOCUS) {
      if (isFocused) {
        targetPos = [0, 0, 5]; 
        targetScale = 3.5;
      } else {
        const originalScatter = data.positionScatter;
        targetPos = [originalScatter[0] * 1.5, originalScatter[1] * 1.5, originalScatter[2] - 10];
      }
    } else if (appState === AppState.SCATTER) {
      ref.current.lookAt(state.camera.position);
    } else {
       ref.current.lookAt(0, ref.current.position.y, 0);
       ref.current.rotation.y += Math.PI; 
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
        scale={[1.5, 1.5]} 
        transparent
        opacity={appState === AppState.FOCUS && !isFocused ? 0.1 : 1}
      />
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
    ref.current.rotation.y += delta;
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial 
        color={COLORS.METALLIC_GOLD} 
        emissive={COLORS.METALLIC_GOLD} 
        emissiveIntensity={2} 
        toneMapped={false} 
      />
      <pointLight intensity={2} color="yellow" distance={8} decay={2} />
    </mesh>
  );
};