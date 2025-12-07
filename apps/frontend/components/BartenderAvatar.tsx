import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import { loadAsync as loadModelAsync } from 'expo-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { BartenderModelDefinition } from '@/constants/bartender-models';

type BartenderAvatarProps = {
  /** Is the bartender currently talking? */
  isTalking?: boolean;
  /** Path to custom 3D model (GLB/GLTF) - place file in assets/models/ */
  modelPath?: ImageSourcePropType; // e.g., require('../assets/models/bartender.glb')
  /** Optional model metadata with transform guidance */
  modelDefinition?: BartenderModelDefinition;
  /** Background color for the GL canvas */
  backgroundColor?: string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEFAULT_MODEL = require('../assets/models/luiz-h-c-nobre/source/bartender.glb');

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
  modelDefinition,
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
  const positionOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const rotationOffsetRef = useRef(new THREE.Euler(0, 0, 0));
  const baseScaleRef = useRef(new THREE.Vector3(1, 1, 1));
  const bobAmplitudeRef = useRef<number | null>(null);
  const loadTokenRef = useRef(0);
  const isMountedRef = useRef(true);
  const glContextRef = useRef<any>(null);

  const resetTransformDefaults = () => {
    positionOffsetRef.current.set(0, 0, 0);
    rotationOffsetRef.current.set(0, 0, 0);
    baseScaleRef.current.set(1, 1, 1);
    bobAmplitudeRef.current = null;
  };

  const removeCurrentMesh = () => {
    resetTransformDefaults();
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
    bobAmplitudeRef.current = 0.08;
  };

  const loadCustomModel = async (
    scene: THREE.Scene,
    moduleRef: ImageSourcePropType,
    definition: BartenderModelDefinition | undefined,
    token: number,
  ) => {
    try {
      // Check if component is still mounted and context is valid
      if (!isMountedRef.current || !glContextRef.current || !rendererRef.current) {
        console.log('[BartenderAvatar] Skipping model load, component unmounted or context lost');
        return;
      }

      const asset = Asset.fromModule(moduleRef as number);
      console.log('[BartenderAvatar] resolved asset metadata', asset);
      await asset.downloadAsync();

      if (loadTokenRef.current !== token || !isMountedRef.current) {
        console.log('[BartenderAvatar] Skipping model load, a newer request is in flight or component unmounted');
        return;
      }

      let gltf: GLTF;
      if (Platform.OS === 'web') {
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error('Unable to resolve model URI');
        }
        const loader = new GLTFLoader();
        gltf = (await loader.loadAsync(uri)) as GLTF;
      } else {
        gltf = (await loadModelAsync(asset)) as GLTF;
      }
      if (!gltf) {
        throw new Error('GLTF result missing');
      }
      if (!sceneRef.current || !gltf.scene) {
        throw new Error('Model scene missing');
      }

      if (loadTokenRef.current !== token || !isMountedRef.current || !rendererRef.current) {
        console.log('[BartenderAvatar] Skipping model load, GLTF parse superseded or context lost');
        return;
      }

      removeCurrentMesh();

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

      const transform = definition?.transform;
      const positionTransform = transform?.position ?? {};
      const rotationTransform = transform?.rotation ?? {};
      const scaleFactor = transform?.scale ?? 1;
      positionOffsetRef.current.set(
        positionTransform.x ?? 0,
        positionTransform.y ?? 0,
        positionTransform.z ?? 0,
      );
      rotationOffsetRef.current.set(
        rotationTransform.x ?? 0,
        rotationTransform.y ?? 0,
        rotationTransform.z ?? 0,
      );
      baseScaleRef.current.set(scaleFactor, scaleFactor, scaleFactor);
      bobAmplitudeRef.current = transform?.bobAmplitude ?? 0.05;

      pivot.scale.set(
        baseScaleRef.current.x,
        baseScaleRef.current.y,
        baseScaleRef.current.z,
      );

      if (loadTokenRef.current !== token || !isMountedRef.current || !rendererRef.current) {
        console.log('[BartenderAvatar] Skipping model load, transform application superseded or context lost');
        return;
      }

      meshRef.current = pivot;
      meshRef.current.rotation.set(
        rotationOffsetRef.current.x,
        rotationOffsetRef.current.y,
        rotationOffsetRef.current.z,
      );
      meshRef.current.position.set(
        positionOffsetRef.current.x,
        positionOffsetRef.current.y,
        positionOffsetRef.current.z,
      );

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
    if (!isMountedRef.current) {
      return;
    }

    glContextRef.current = gl;
    
    // Check if GL context is valid
    if (!gl || gl.isContextLost && gl.isContextLost()) {
      console.warn('[BartenderAvatar] GL context is lost');
      return;
    }

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

    const resolvedModel = (modelDefinition?.asset ?? modelPath ?? DEFAULT_MODEL) as ImageSourcePropType;
    if (resolvedModel) {
      const token = ++loadTokenRef.current;
      await loadCustomModel(scene, resolvedModel, modelDefinition, token);
    } else {
      attachPlaceholderModel(scene);
    }

    const render = () => {
      // Check if component is still mounted and context is valid
      if (!isMountedRef.current || !rendererRef.current || !glContextRef.current) {
        return;
      }

      // Check if GL context is lost
      if (gl.isContextLost && gl.isContextLost()) {
        console.warn('[BartenderAvatar] GL context lost, stopping render loop');
        return;
      }

      animationFrameRef.current = requestAnimationFrame(render);

      const delta = clockRef.current?.getDelta() ?? 0.016;
      timeRef.current += delta;

      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (meshRef.current) {
        const basePosition = positionOffsetRef.current;
        const bobAmplitude =
          bobAmplitudeRef.current ?? (hasCustomModelRef.current ? 0.05 : 0.08);
        const bobOffset = Math.sin(timeRef.current * 0.5) * bobAmplitude;

        meshRef.current.position.set(
          basePosition.x,
          basePosition.y + bobOffset,
          basePosition.z,
        );

        const talkingNow = talkingRef.current;
        const hasTalkingClip = Boolean(talkingActionRef.current);
        const baseRotation = rotationOffsetRef.current;
        const baseScale = baseScaleRef.current;

        meshRef.current.rotation.x += (baseRotation.x - meshRef.current.rotation.x) * 0.1;
        meshRef.current.rotation.z += (baseRotation.z - meshRef.current.rotation.z) * 0.1;

        if (!hasTalkingClip) {
          const talkRotationOffset = talkingNow ? Math.sin(timeRef.current * 5) * 0.1 : 0;
          const targetRotationY = baseRotation.y + talkRotationOffset;
          meshRef.current.rotation.y += (targetRotationY - meshRef.current.rotation.y) * 0.1;

          const pulseY = Math.abs(Math.sin(timeRef.current * 8));
          const pulseXZ = Math.abs(Math.sin(timeRef.current * 6));
          const targetScaleY = talkingNow ? baseScale.y * (1 + pulseY * 0.12) : baseScale.y;
          const targetScaleXZ = talkingNow ? baseScale.x * (1 - pulseXZ * 0.05) : baseScale.x;
          meshRef.current.scale.y += (targetScaleY - meshRef.current.scale.y) * 0.1;
          meshRef.current.scale.x += (targetScaleXZ - meshRef.current.scale.x) * 0.1;
          meshRef.current.scale.z += (targetScaleXZ - meshRef.current.scale.z) * 0.1;
        } else {
          meshRef.current.rotation.y += (baseRotation.y - meshRef.current.rotation.y) * 0.1;
          meshRef.current.scale.x += (baseScale.x - meshRef.current.scale.x) * 0.1;
          meshRef.current.scale.y += (baseScale.y - meshRef.current.scale.y) * 0.1;
          meshRef.current.scale.z += (baseScale.z - meshRef.current.scale.z) * 0.1;
        }
      }

      try {
        renderer.render(scene, camera);
        gl.endFrameEXP();
      } catch (error) {
        // If rendering fails (e.g., context lost), stop the render loop
        console.warn('[BartenderAvatar] Render error, stopping loop:', error);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    };

    render();
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Cleanup Three.js resources
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      
      if (meshRef.current) {
        meshRef.current.traverse((child: any) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat: any) => {
                  if (mat.map) mat.map.dispose();
                  if (mat.normalMap) mat.normalMap.dispose();
                  if (mat.roughnessMap) mat.roughnessMap.dispose();
                  if (mat.metalnessMap) mat.metalnessMap.dispose();
                  mat.dispose();
                });
              } else {
                if (child.material.map) child.material.map.dispose();
                if (child.material.normalMap) child.material.normalMap.dispose();
                if (child.material.roughnessMap) child.material.roughnessMap.dispose();
                if (child.material.metalnessMap) child.material.metalnessMap.dispose();
                child.material.dispose();
              }
            }
          }
        });
        if (sceneRef.current && meshRef.current) {
          sceneRef.current.remove(meshRef.current);
        }
        meshRef.current = null;
      }
      
      rendererRef.current = null;
      glContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    talkingRef.current = isTalking;
  }, [isTalking]);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    const scene = sceneRef.current;
    const assetModule = (modelDefinition?.asset ?? modelPath ?? DEFAULT_MODEL) as ImageSourcePropType;
    const token = ++loadTokenRef.current;

    if (!assetModule) {
      attachPlaceholderModel(scene);
      return;
    }

    loadCustomModel(scene, assetModule, modelDefinition, token).catch((error) => {
      console.warn('[BartenderAvatar] Failed to swap model', error);
      attachPlaceholderModel(scene);
    });
  }, [modelDefinition?.id, modelPath]);

  

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
  width: Platform.OS === 'web' ? '70%' : '65%', // Reduce overall footprint for more chat space
  aspectRatio: 1, // Square container for circular appearance
  maxWidth: Platform.OS === 'web' ? 360 : 210, // Reduce max size for more vertical room
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
