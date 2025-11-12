import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { useThemeColor } from '@/hooks/use-theme-color';

type BartenderAvatarProps = {
  /** Is the bartender currently talking? */
  isTalking?: boolean;
  /** Path to custom 3D model (GLB/GLTF) - place file in assets/models/ */
  modelPath?: any; // e.g., require('../assets/models/bartender.glb')
  /** Background color for the GL canvas */
  backgroundColor?: string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEFAULT_MODEL = require('../assets/models/luiz-h-c-nobre/source/model (10).glb');

/**
 * 3D Bartender Avatar Component
 * 
 * Features:
 * - Displays the bartender GLB with bundled textures
 * - Animates when isTalking is true
 * - Circular avatar presentation like ChatGPT
 * - Upper body shot with close camera positioning
 * - Responsive: full-width on mobile, larger centered circle on web
 * 
 * To use your own model:
 * 1. Place your .glb or .gltf file in assets/models/
 * 2. Pass it via modelPath prop: modelPath={require('../assets/models/bartender.glb')}
 */
export function BartenderAvatar({
  isTalking = false,
  modelPath,
  backgroundColor,
}: BartenderAvatarProps) {
  const accent = useThemeColor({}, 'tint');
  const fallbackBackground = useThemeColor({}, 'surface');
  const canvasColor = backgroundColor ?? fallbackBackground;
  const animationFrameRef = useRef<number | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const talkingActionRef = useRef<THREE.AnimationAction | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const timeRef = useRef<number>(0);
  const hasCustomModelRef = useRef(false);
  const talkingRef = useRef(isTalking);
  const isWeb = Platform.OS === 'web';

  const removeCurrentMesh = () => {
    if (sceneRef.current && meshRef.current) {
      sceneRef.current.remove(meshRef.current);
    }
    meshRef.current = null;
    mixerRef.current = null;
    idleActionRef.current = null;
    talkingActionRef.current = null;
    hasCustomModelRef.current = false;
  };

  const attachPlaceholderModel = (scene: THREE.Scene) => {
    removeCurrentMesh();

    const group = new THREE.Group();

    const headGeometry = new THREE.SphereGeometry(0.65, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.7,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    group.add(head);

    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1.7, 0.6);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1.7, 0.6);
    group.add(rightEye);

    const smileGeometry = new THREE.TorusGeometry(0.2, 0.03, 8, 16, Math.PI);
    const smileMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const smile = new THREE.Mesh(smileGeometry, smileMaterial);
    smile.position.set(0, 1.45, 0.58);
    smile.rotation.z = Math.PI;
    group.add(smile);

    const neckGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 16);
    const neckMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = 1.15;
    group.add(neck);

    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.7, 1.3, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa500,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    group.add(body);

    const shoulderGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.position.set(-0.65, 0.9, 0);
    group.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.position.set(0.65, 0.9, 0);
    group.add(rightShoulder);

    const armGeometry = new THREE.CylinderGeometry(0.15, 0.13, 1.0, 16);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.75, 0.4, 0);
    leftArm.rotation.z = 0.2;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.75, 0.4, 0);
    rightArm.rotation.z = -0.2;
    group.add(rightArm);

    group.position.y = -0.3;
    group.scale.set(1, 1, 1);

    meshRef.current = group;
    scene.add(group);
    hasCustomModelRef.current = false;
  };

  const loadCustomModel = async (scene: THREE.Scene, moduleRef: any) => {
    try {
      const asset = Asset.fromModule(moduleRef);
      console.log('[BartenderAvatar] resolved asset metadata', asset);
      if (Platform.OS !== 'web') {
        await asset.downloadAsync();
      }
      const uri = asset.localUri ?? asset.uri;
      if (!uri) {
        throw new Error('Unable to resolve model URI');
      }
      console.log('[BartenderAvatar] asset uri', uri, 'local?', asset.localUri);

      const loader = new GLTFLoader();
      if (asset.localUri) {
        const resourcePath = asset.localUri.replace(/[^/]*$/, '');
        loader.setResourcePath(resourcePath);
        loader.setPath(resourcePath);
      }

      const gltf: GLTF = await loader.loadAsync(uri);
      if (!sceneRef.current || !gltf.scene) {
        throw new Error('Model scene missing');
      }

      const pivot = new THREE.Group();
      const model = gltf.scene;
      pivot.add(model);

      model.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      const originalBox = new THREE.Box3().setFromObject(model);
      const size = originalBox.getSize(new THREE.Vector3());
      const height = size.y || 1;
      const targetHeight = 1.7;
      const scale = targetHeight / height;
      model.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(model);
      const center = scaledBox.getCenter(new THREE.Vector3());
      model.position.sub(center);
  model.position.y += targetHeight * 0.5;

      removeCurrentMesh();
      meshRef.current = pivot;
      scene.add(pivot);
      hasCustomModelRef.current = true;
      console.log('[BartenderAvatar] Loaded model successfully');

      if (gltf.animations && gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;

        const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('idle'));
        if (idleClip) {
          const idleAction = mixer.clipAction(idleClip);
          idleAction.play();
          idleActionRef.current = idleAction;
        }

        const talkClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('talk'));
        if (talkClip) {
          const talkingAction = mixer.clipAction(talkClip);
          talkingAction.loop = THREE.LoopRepeat;
          talkingActionRef.current = talkingAction;
        }
      }
    } catch (error) {
      console.warn('[BartenderAvatar] Failed to load custom model', error);
      attachPlaceholderModel(scene);
    }
  };

  const onContextCreate = async (gl: any) => {
    const renderer = new Renderer({ gl });
    rendererRef.current = renderer;
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(new THREE.Color(canvasColor), 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(canvasColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
  camera.fov = 26;
    camera.updateProjectionMatrix();
    camera.position.set(0, 1.55, 1.55);
    camera.lookAt(0, 1.5, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 4, 3);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffa500, 0.3);
    backLight.position.set(-2, 2, -2);
    scene.add(backLight);

    clockRef.current = new THREE.Clock();

    const resolvedModel = modelPath ?? DEFAULT_MODEL;
    if (resolvedModel) {
      await loadCustomModel(scene, resolvedModel);
    } else {
      attachPlaceholderModel(scene);
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      const delta = clockRef.current?.getDelta() ?? 0.016;
      timeRef.current += delta;

      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (meshRef.current) {
        const bobAmplitude = hasCustomModelRef.current ? 0.05 : 0.08;
        meshRef.current.position.y = Math.sin(timeRef.current * 0.5) * bobAmplitude;

        const talkingNow = talkingRef.current;
        const hasTalkingClip = Boolean(talkingActionRef.current);
        if (!hasTalkingClip) {
          const targetRotation = talkingNow ? Math.sin(timeRef.current * 5) * 0.1 : 0;
          meshRef.current.rotation.y += (targetRotation - meshRef.current.rotation.y) * 0.1;

          const targetScaleY = talkingNow ? 1 + Math.abs(Math.sin(timeRef.current * 8)) * 0.12 : 1;
          const targetScaleXZ = talkingNow ? 1 - Math.abs(Math.sin(timeRef.current * 6)) * 0.05 : 1;
          meshRef.current.scale.y += (targetScaleY - meshRef.current.scale.y) * 0.1;
          meshRef.current.scale.x += (targetScaleXZ - meshRef.current.scale.x) * 0.1;
          meshRef.current.scale.z += (targetScaleXZ - meshRef.current.scale.z) * 0.1;
        } else {
          meshRef.current.rotation.y *= 0.9;
          meshRef.current.scale.x += (1 - meshRef.current.scale.x) * 0.1;
          meshRef.current.scale.y += (1 - meshRef.current.scale.y) * 0.1;
          meshRef.current.scale.z += (1 - meshRef.current.scale.z) * 0.1;
        }
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    talkingRef.current = isTalking;
  }, [isTalking]);

  useEffect(() => {
    if (mixerRef.current) {
      const idleAction = idleActionRef.current;
      const talkingAction = talkingActionRef.current;

      if (talkingAction) {
        if (isTalking) {
          if (idleAction) {
            idleAction.fadeOut(0.2);
          }
          talkingAction.reset().fadeIn(0.2).play();
        } else {
          talkingAction.fadeOut(0.2);
          if (idleAction) {
            idleAction.reset().fadeIn(0.2).play();
          }
        }
      }
    }
  }, [isTalking]);

  useEffect(() => {
    const color = new THREE.Color(canvasColor);
    if (sceneRef.current) {
      sceneRef.current.background = color;
    }
    if (rendererRef.current) {
      rendererRef.current.setClearColor(color, 1);
    }
  }, [canvasColor]);

  return (
  <View style={[styles.outerContainer, { backgroundColor: canvasColor }]}>
      <View style={[styles.container, isWeb && styles.containerWeb, { borderColor: accent }]}>
        <GLView
          style={styles.glView}
          onContextCreate={onContextCreate}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: Platform.OS === 'web' ? '100%' : '85%', // Smaller on mobile to prevent cutoff
    aspectRatio: 1, // Square container for circular appearance
    maxWidth: Platform.OS === 'web' ? '100%' : 280, // Max size limit on mobile
    backgroundColor: 'transparent',
    borderRadius: 9999, // Fully circular
    overflow: 'hidden',
    borderWidth: Platform.OS === 'web' ? 3 : 2, // Thinner border on mobile
  },
  containerWeb: {
    maxWidth: 500, // Larger on web, centered
    width: '90%',
  },
  glView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
