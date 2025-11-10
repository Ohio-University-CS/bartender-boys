declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import {
    AnimationClip,
    Camera,
    Group,
    Loader,
    LoadingManager,
    Scene,
  } from 'three';

  export interface GLTF {
    animations: AnimationClip[];
    scene: Group;
    scenes: Group[];
    cameras: Camera[];
    asset: {
      version: string;
      generator: string;
    };
  }

  export class GLTFLoader extends Loader<GLTF> {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: unknown) => void
    ): void;
    loadAsync(
      url: string,
      onProgress?: (event: ProgressEvent<EventTarget>) => void
    ): Promise<GLTF>;
    setPath(path: string): this;
    setResourcePath(resourcePath: string): this;
  }
}
