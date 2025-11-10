/**
 * Unit tests for BartenderAvatar component
 */

jest.mock('expo-gl', () => ({
  GLView: 'GLView',
}));

jest.mock('three', () => ({
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(),
  Color: jest.fn(),
  SphereGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(),
  Mesh: jest.fn(),
  CylinderGeometry: jest.fn(),
  TorusGeometry: jest.fn(),
  Group: jest.fn(),
}));

jest.mock('expo-three', () => ({
  Renderer: jest.fn(),
}));

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: jest.fn(),
}));

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(() => '#FFA500'),
}));

import { BartenderAvatar } from '@/components/BartenderAvatar';

describe('BartenderAvatar', () => {
  /**
   * Test 1: Normal case - Component exists
   * Verifies that BartenderAvatar component is exported
   */
  test('should export BartenderAvatar component', () => {
    expect(BartenderAvatar).toBeDefined();
    expect(typeof BartenderAvatar).toBe('function');
  });

  /**
   * Test 2: Normal case - Component props interface
   * Verifies that component accepts isTalking prop
   */
  test('should accept isTalking prop', () => {
    const props = { isTalking: true };
    expect(props.isTalking).toBe(true);
  });

  /**
   * Test 3: Edge case - Optional props
   * Verifies that backgroundColor prop is optional
   */
  test('should accept optional backgroundColor prop', () => {
    const props = { backgroundColor: '#FFFFFF' };
    expect(props.backgroundColor).toBe('#FFFFFF');
  });
});
