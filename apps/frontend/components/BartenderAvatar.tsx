import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer } from 'expo-three';

type BartenderAvatarProps = {
  /** Is the bartender currently talking? */
  isTalking?: boolean;
  /** Path to custom 3D model (GLB/GLTF) - place file in assets/models/ */
  modelPath?: any; // e.g., require('../assets/models/bartender.glb')
  /** Background color for the GL canvas */
  backgroundColor?: string;
};

/**
 * 3D Bartender Avatar Component
 * 
 * Features:
 * - Displays a 3D model (currently a placeholder cube, easily replaceable)
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
  backgroundColor = '#0a0a0a',
}: BartenderAvatarProps) {
  const animationFrameRef = useRef<number | null>(null);
  const sceneRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const timeRef = useRef<number>(0);
  const isWeb = Platform.OS === 'web';

  const onContextCreate = async (gl: any) => {
  // Setup renderer
  const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setClearColor(new THREE.Color(backgroundColor), 1);

    // Setup scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // Setup camera - closer for upper body shot
    const camera = new THREE.PerspectiveCamera(
      45,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.4, 3.0); // Pulled back slightly from 2.2 to 3.0
    camera.lookAt(0, 1.2, 0);

    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 4, 3);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffa500, 0.3);
    backLight.position.set(-2, 2, -2);
    scene.add(backLight);

    // Create placeholder model (you can replace this with GLB/GLTF loader)
    if (modelPath) {
      // TODO: Load custom model using GLTFLoader when you add your model
      // For now, we'll use a placeholder
      createPlaceholderModel(scene);
    } else {
      createPlaceholderModel(scene);
    }

    // Animation loop
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      
      timeRef.current += 0.016; // ~60fps

      // Animate the model
      if (meshRef.current) {
        // Idle animation - very slow gentle bob
        meshRef.current.position.y = Math.sin(timeRef.current * 0.5) * 0.08; // Slowed from 1.5 to 0.5
        
        // Talking animation - more energetic movement
        if (isTalking) {
          meshRef.current.rotation.y = Math.sin(timeRef.current * 5) * 0.1;
          meshRef.current.scale.y = 1 + Math.abs(Math.sin(timeRef.current * 8)) * 0.15;
        } else {
          // Smooth return to idle
          meshRef.current.rotation.y *= 0.95;
          meshRef.current.scale.y += (1 - meshRef.current.scale.y) * 0.1;
        }
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  const createPlaceholderModel = (scene: any) => {
    // Create a simple placeholder "bartender" - upper body focus
    const group = new THREE.Group();
    
    // Head - larger and more prominent
    const headGeometry = new THREE.SphereGeometry(0.65, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffdbac, // Skin tone
      roughness: 0.7,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    group.add(head);

    // Simple smiley face - Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1.7, 0.6);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1.7, 0.6);
    group.add(rightEye);

    // Simple smile
    const smileGeometry = new THREE.TorusGeometry(0.2, 0.03, 8, 16, Math.PI);
    const smileMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const smile = new THREE.Mesh(smileGeometry, smileMaterial);
    smile.position.set(0, 1.45, 0.58);
    smile.rotation.z = Math.PI;
    group.add(smile);

    // Neck
    const neckGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 16);
    const neckMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = 1.15;
    group.add(neck);

    // Body (torso) - larger and more prominent
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.7, 1.3, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffa500, // Orange shirt (bartender uniform)
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    group.add(body);

    // Shoulders
    const shoulderGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.position.set(-0.65, 0.9, 0);
    group.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.position.set(0.65, 0.9, 0);
    group.add(rightShoulder);

    // Arms - more prominent
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

    // Position the entire group - centered for upper body view
    group.position.y = -0.3;
    
    meshRef.current = group;
    scene.add(group);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(backgroundColor);
    }
  }, [backgroundColor]);

  return (
    <View style={[styles.outerContainer, { backgroundColor }]}>
      <View style={[styles.container, isWeb && styles.containerWeb]}>
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
    borderColor: '#FFA500',
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
