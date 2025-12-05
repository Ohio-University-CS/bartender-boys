import type { ImageSourcePropType } from 'react-native';

export type BartenderModelId = 'classic' | 'luisa' | 'matt' | 'robo' | 'ironman' | 'martin' | 'mike' | 'noir' | 'elizabeth' | 'makayla';

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
const LUISA_MODEL_ASSET = require('../assets/models/Luisa.glb');
const MATT_MODEL_ASSET = require('../assets/models/MiiMatt.glb');
const ROBO_MODEL_ASSET = require('../assets/models/robo_bartender.glb');
const IRON_MAN_MODEL_ASSET = require('../assets/models/IronMan.glb');
const MARTIN_MODEL_ASSET = require('../assets/models/Martin.glb.glb');
const MIKE_MODEL_ASSET = require('../assets/models/mike.glb.glb');
const NOIR_MODEL_ASSET = require('../assets/models/noir.glb.glb');
const ELIZABETH_MODEL_ASSET = require('../assets/models/elizabeth.glb');
const MAKAYLA_MODEL_ASSET = require('../assets/models/Makayla.glb');

export const BARTENDER_MODEL_REGISTRY: BartenderModelDefinition[] = [
  {
    id: 'classic',
    label: 'Classic Luiz',
    asset: CLASSIC_MODEL_ASSET,
  },
  {
    id: 'luisa',
    label: 'Classic Luisa',
    asset: LUISA_MODEL_ASSET,
    notes: 'Default bartender variant with Luisa styling.',
    transform: {
      position: { y: -0.28, z: -0.14 },
      scale: 1.22,
    },
  },
  {
    id: 'matt',
    label: 'Matt',
    asset: MATT_MODEL_ASSET,
    notes: 'Mii-styled bartender with standout energy.',
    transform: {
      position: { y: 0.26, z: -0.3 },
      scale: 0.88,
      bobAmplitude: 0.05,
    },
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
  {
    id: 'ironman',
    label: 'Metal Man',
    asset: IRON_MAN_MODEL_ASSET,
    notes: 'Armored bartender inspired by the legendary suit.',
    transform: {
      position: { y: 0.3, z: -0.28 },
      rotation: { y: Math.PI * 0.02 },
      scale: 0.9,
      bobAmplitude: 0.04,
    },
  },
  {
    id: 'martin',
    label: 'Martin',
    asset: MARTIN_MODEL_ASSET,
    notes: 'Stylized bartender with a refined presence.',
    transform: {
      position: { y: -0.05, z: -0.1 },
      scale: 1.0,
    },
  },
  {
    id: 'mike',
    label: 'Mike',
    asset: MIKE_MODEL_ASSET,
    notes: 'Casual bartender with approachable energy.',
    transform: {
      position: { y: -0.05, z: -0.18 },
      scale: 0.95,
    },
  },
  {
    id: 'noir',
    label: 'Noir',
    asset: NOIR_MODEL_ASSET,
    notes: 'Dark, moody bartender with classic vibes.',
    transform: {
      position: { y: -0.05, z: -0.2 },
      scale: 0.9,
    },
  },
  {
    id: 'elizabeth',
    label: 'Elizabeth',
    asset: ELIZABETH_MODEL_ASSET,
    notes: 'Refined bartender with elegant styling.',
    transform: {
      position: { y: -0.05, z: -0.1 },
      scale: 1.0,
    },
  },
  {
    id: 'makayla',
    label: 'Makayla',
    asset: MAKAYLA_MODEL_ASSET,
    notes: 'Upbeat bartender with lively stance.',
    transform: {
      position: { y: -0.05, z: -0.12 },
      scale: 1.0,
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
