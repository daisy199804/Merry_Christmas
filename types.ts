export enum AppState {
  TREE = 'TREE',      // Combined cone shape
  SCATTER = 'SCATTER', // Floating randomly
  FOCUS = 'FOCUS',     // Zooming into a photo
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST',      // Trigger TREE
  OPEN = 'OPEN',      // Trigger SCATTER
  PINCH = 'PINCH',    // Trigger FOCUS
}

export interface ParticleData {
  id: number;
  type: 'sphere' | 'cube' | 'candy';
  positionTree: [number, number, number];
  positionScatter: [number, number, number];
  color: string;
  scale: number;
}

export interface PhotoData {
  id: string;
  url: string;
  positionTree: [number, number, number];
  positionScatter: [number, number, number];
  rotation: [number, number, number];
  aspectRatio: number;
}
