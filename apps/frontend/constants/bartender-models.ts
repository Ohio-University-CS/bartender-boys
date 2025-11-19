import type { ImageSourcePropType } from 'react-native';

export type BartenderModelId = 'classic' | 'robo';

export type BartenderModelTransform = {
  position?: Partial<Record<'x' | 'y' | 'z', number>>;
  rotation?: Partial<Record<'x' | 'y' | 'z', number>>;
  scale?: number;
  bobAmplitude?: number;
};

export type BartenderModelDefinition = {
  id: BartenderModelId;
  label: string;
  asset: ImageSourcePropType;
  notes?: string;
  transform?: BartenderModelTransform;
};

const CLASSIC_MODEL_ASSET = require('../assets/models/luiz-h-c-nobre/source/bartender.glb');
const ROBO_MODEL_ASSET = require('../assets/models/robo_bartender.glb');

export const BARTENDER_MODEL_REGISTRY: BartenderModelDefinition[] = [
  {
    id: 'classic',
    label: 'Classic Luiz',
    asset: CLASSIC_MODEL_ASSET,
  },
  {
    id: 'robo',
    label: 'Robo Bartender',
    asset: ROBO_MODEL_ASSET,
    notes: 'Futuristic bartender model with mechanical flair.',
    transform: {
      position: { y: 0.32, z: -0.36 },
      scale: 0.9,
    },
  },
];

export const DEFAULT_BARTENDER_MODEL_ID: BartenderModelId = 'classic';

export function isBartenderModelId(value: string): value is BartenderModelId {
  return BARTENDER_MODEL_REGISTRY.some((entry) => entry.id === value);
}

export function getBartenderModelDefinition(id: BartenderModelId): BartenderModelDefinition {
  return BARTENDER_MODEL_REGISTRY.find((entry) => entry.id === id) ?? BARTENDER_MODEL_REGISTRY[0];
}

export function getBartenderModelAsset(id: BartenderModelId): ImageSourcePropType {
  return getBartenderModelDefinition(id).asset;
}

export function getBartenderModelLabel(id: BartenderModelId): string {
  return getBartenderModelDefinition(id).label;
}

export const BARTENDER_MODEL_OPTIONS = BARTENDER_MODEL_REGISTRY.map((entry) => ({
  id: entry.id,
  label: entry.label,
}));
