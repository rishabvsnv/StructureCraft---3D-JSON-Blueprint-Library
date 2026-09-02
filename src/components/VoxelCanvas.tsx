"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export interface EnvironmentSettings {
  preset: "space" | "sunset" | "cyber" | "studio";
  bgColor: string;
  sunAngle: number; // 0 to 360 degrees
  sunElevation: number; // 10 to 90 degrees
  sunIntensity: number; // 0.1 to 2.5
  fogDensity: number; // 0.0 to 0.05
  bloomStrength: number; // 0.0 to 2.0
}

export interface VoxelCanvasHandle {
  setCameraView: (view: "iso" | "top" | "front" | "side") => void;
  resetCamera: () => void;
}

export interface SelectedVoxelInfo {
  x: number;
  y: number;
  z: number;
  paletteName: string;
  paletteColor: string;
}

interface VoxelCanvasProps {
  compilerData: {
    groups: Record<number, number[]>;
    palette: Array<{
      id: number;
      name: string;
      color: string;
      roughness?: number;
      emissive?: boolean;
      animated?: boolean;
    }>;
    dimensions: { x: number; y: number; z: number };
  } | null;
  buildProgress?: number;
  activePaletteId: number;
  sculptMode: boolean;
  environmentConfig: EnvironmentSettings;
  onSelectVoxel?: (info: SelectedVoxelInfo | null) => void;
  onAddVoxel?: (voxel: { x: number; y: number; z: number; paletteId: number }) => void;
  onDeleteVoxel?: (target: { x: number; y: number; z: number }) => void;
}

const VoxelCanvas = forwardRef<VoxelCanvasHandle, VoxelCanvasProps>(
  (
    {
      compilerData,
      buildProgress = 1.0,
      activePaletteId,
      sculptMode,
      environmentConfig,
      onSelectVoxel,
      onAddVoxel,
      onDeleteVoxel,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3());

    // Dynamic scene references for live tweaking without rebuilding the entire canvas
    const sceneRef = useRef<THREE.Scene | null>(null);
    const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
    const bloomPassRef = useRef<UnrealBloomPass | null>(null);

    useImperativeHandle(ref, () => ({
      setCameraView: (view) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls || !compilerData) return;

        const maxDim = Math.max(
          compilerData.dimensions.x,
          compilerData.dimensions.y,
          compilerData.dimensions.z
        );
        const center = centerRef.current;
        controls.target.copy(center);

        switch (view) {
          case "top":
            camera.position.set(center.x, maxDim * 2.8, center.z + 0.001);
            break;
          case "front":
            camera.position.set(center.x, center.y, center.z + maxDim * 2.2);
            break;
          case "side":
            camera.position.set(center.x + maxDim * 2.2, center.y, center.z);
            break;
          case "iso":
          default:
            camera.position.set(
              center.x + maxDim * 1.5,
              center.y + maxDim * 1.3,
              center.z + maxDim * 1.5
            );
            break;
        }
        controls.update();
      },
      resetCamera: () => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls || !compilerData) return;
        const maxDim = Math.max(
          compilerData.dimensions.x,
          compilerData.dimensions.y,
          compilerData.dimensions.z
        );
        const center = centerRef.current;
        camera.position.set(center.x + maxDim * 1.5, center.y + maxDim * 1.3, center.z + maxDim * 1.5);
        controls.target.copy(center);
        controls.update();
      },
    }));

    // Live environment updates without rebuilding meshes
    useEffect(() => {
      if (!sceneRef.current || !dirLightRef.current || !compilerData) return;

      const scene = sceneRef.current;
      const dirLight = dirLightRef.current;

      // Update background and atmospheric fog
      scene.background = new THREE.Color(environmentConfig.bgColor);
      if (environmentConfig.fogDensity > 0) {
        scene.fog = new THREE.FogExp2(environmentConfig.bgColor, environmentConfig.fogDensity);
      } else {
        scene.fog = null;
      }

      // Update Directional Sun position based on azimuth & elevation
      const maxDim = Math.max(
        compilerData.dimensions.x,
        compilerData.dimensions.y,
        compilerData.dimensions.z
      );
      const radAzimuth = (environmentConfig.sunAngle * Math.PI) / 180;
      const radElevation = (environmentConfig.sunElevation * Math.PI) / 180;
      const distance = maxDim * 2.5;

      const sunX = centerRef.current.x + distance * Math.cos(radElevation) * Math.sin(radAzimuth);
      const sunY = centerRef.current.y + distance * Math.sin(radElevation);
      const sunZ = centerRef.current.z + distance * Math.cos(radElevation) * Math.cos(radAzimuth);

      dirLight.position.set(sunX, sunY, sunZ);
      dirLight.intensity = environmentConfig.sunIntensity;

      // Update bloom strength
      if (bloomPassRef.current) {
        bloomPassRef.current.strength = environmentConfig.bloomStrength;
      }
    }, [environmentConfig, compilerData]);

    useEffect(() => {
      const container = mountRef.current;
      if (!container || !compilerData) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const centerX = compilerData.dimensions.x / 2;
      const centerY = compilerData.dimensions.y / 2;
      const centerZ = compilerData.dimensions.z / 2;
      centerRef.current.set(centerX, centerY, centerZ);

      const maxDim = Math.max(
        compilerData.dimensions.x,
        compilerData.dimensions.y,
        compilerData.dimensions.z
      );

      // 1. Scene, Camera & Renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(environmentConfig.bgColor);
      if (environmentConfig.fogDensity > 0) {
        scene.fog = new THREE.FogExp2(environmentConfig.bgColor, environmentConfig.fogDensity);
      }
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(centerX + maxDim * 1.5, centerY + maxDim * 1.3, centerZ + maxDim * 1.5);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(centerX, centerY, centerZ);
      controlsRef.current = controls;

      // 2. Post-Processing Bloom
      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        environmentConfig.bloomStrength,
        0.2,
        0.8
      );
      bloomPassRef.current = bloomPass;

      const composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);

      // 3. Dynamic Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, environmentConfig.sunIntensity);
      dirLightRef.current = dirLight;
      scene.add(dirLight);

      const grid = new THREE.GridHelper(
        Math.max(compilerData.dimensions.x, compilerData.dimensions.z) * 1.5,
        20,
        0x334155,
        0x1e293b
      );
      grid.position.set(centerX, -0.01, centerZ);
      scene.add(grid);

      // 4. Ghost Box for Sculpting
      const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
      const ghostMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
      ghostMesh.visible = false;
      scene.add(ghostMesh);

      // 5. Instanced Meshes
      const staticGroup = new THREE.Group();
      const dynamicGroup = new THREE.Group();
      dynamicGroup.position.set(centerX, centerY, centerZ);

      scene.add(staticGroup);
      scene.add(dynamicGroup);

      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const dummy = new THREE.Object3D();
      let hasAnimatedElements = false;

      let totalVoxelCount = 0;
      Object.values(compilerData.groups).forEach((coords) => {
        totalVoxelCount += coords.length / 3;
      });
      const maxVisibleVoxels = Math.floor(totalVoxelCount * buildProgress);
      let processedVoxels = 0;

      const interactiveMeshes: THREE.InstancedMesh[] = [];
      const meshMetadata = new Map<
        THREE.InstancedMesh,
        { paletteName: string; paletteColor: string; rawCoords: number[] }
      >();

      compilerData.palette.forEach((p) => {
        const rawCoords = compilerData.groups[p.id] || [];
        const availableInPalette = rawCoords.length / 3;
        if (availableInPalette === 0) return;

        const remainingQuota = Math.max(0, maxVisibleVoxels - processedVoxels);
        const countToRender = Math.min(availableInPalette, remainingQuota);
        processedVoxels += availableInPalette;
        if (countToRender === 0) return;

        const isAnimated = Boolean(p.animated);
        const isEmissive = Boolean(p.emissive);
        if (isAnimated) hasAnimatedElements = true;

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          roughness: p.roughness ?? 0.6,
          metalness: 0.15,
          emissive: isEmissive ? new THREE.Color(p.color) : new THREE.Color(0x000000),
          emissiveIntensity: isEmissive ? 1.0 : 0,
        });

        const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, countToRender);

        for (let i = 0; i < countToRender; i++) {
          const rawX = rawCoords[i * 3] + 0.5;
          const rawY = rawCoords[i * 3 + 1] + 0.5;
          const rawZ = rawCoords[i * 3 + 2] + 0.5;

          if (isAnimated) {
            dummy.position.set(rawX - centerX, rawY - centerY, rawZ - centerZ);
          } else {
            dummy.position.set(rawX, rawY, rawZ);
          }

          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        interactiveMeshes.push(instancedMesh);
        meshMetadata.set(instancedMesh, {
          paletteName: p.name,
          paletteColor: p.color,
          rawCoords,
        });

        if (isAnimated) {
          dynamicGroup.add(instancedMesh);
        } else {
          staticGroup.add(instancedMesh);
        }
      });

      // 6. Raycasting for Interaction
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const getRaycastHit = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        return raycaster.intersectObjects(interactiveMeshes, false);
      };

      const handlePointerMove = (e: MouseEvent) => {
        if (!sculptMode) {
          ghostMesh.visible = false;
          return;
        }

        const intersects = getRaycastHit(e);
        if (intersects.length > 0 && intersects[0].instanceId !== undefined && intersects[0].face) {
          const hit = intersects[0];
          const mesh = hit.object as THREE.InstancedMesh;
          const meta = meshMetadata.get(mesh);
          const id = hit.instanceId;

          if (meta && id !== undefined && hit.face) {
            const vx = meta.rawCoords[id * 3];
            const vy = meta.rawCoords[id * 3 + 1];
            const vz = meta.rawCoords[id * 3 + 2];

            if (e.shiftKey || e.altKey) {
              ghostMat.color.setHex(0xef4444);
              ghostMesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
            } else {
              ghostMat.color.setHex(0x38bdf8);
              const normal = hit.face.normal;
              ghostMesh.position.set(
                vx + normal.x + 0.5,
                vy + normal.y + 0.5,
                vz + normal.z + 0.5
              );
            }
            ghostMesh.visible = true;
            return;
          }
        }
        ghostMesh.visible = false;
      };

      const handleClick = (e: MouseEvent) => {
        const intersects = getRaycastHit(e);

        if (intersects.length > 0 && intersects[0].instanceId !== undefined && intersects[0].face) {
          const hit = intersects[0];
          const mesh = hit.object as THREE.InstancedMesh;
          const meta = meshMetadata.get(mesh);
          const id = hit.instanceId;

          if (meta && id !== undefined && hit.face) {
            const vx = meta.rawCoords[id * 3];
            const vy = meta.rawCoords[id * 3 + 1];
            const vz = meta.rawCoords[id * 3 + 2];

            if (sculptMode && (e.shiftKey || e.altKey)) {
              onDeleteVoxel?.({ x: vx, y: vy, z: vz });
              return;
            }

            if (sculptMode && !e.shiftKey && !e.altKey) {
              const normal = hit.face.normal;
              onAddVoxel?.({
                x: vx + Math.round(normal.x),
                y: vy + Math.round(normal.y),
                z: vz + Math.round(normal.z),
                paletteId: activePaletteId,
              });
              return;
            }

            onSelectVoxel?.({
              x: vx,
              y: vy,
              z: vz,
              paletteName: meta.paletteName,
              paletteColor: meta.paletteColor,
            });
            return;
          }
        }
        onSelectVoxel?.(null);
      };

      container.addEventListener("mousemove", handlePointerMove);
      container.addEventListener("click", handleClick);

      // 7. Render Loop
      let animationFrameId: number;
      const clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        if (hasAnimatedElements) {
          const elapsedTime = clock.getElapsedTime();
          dynamicGroup.rotation.z = elapsedTime * 0.9;
        }
        controls.update();
        composer.render();
      };
      animate();

      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        cancelAnimationFrame(animationFrameId);
        container.removeEventListener("mousemove", handlePointerMove);
        container.removeEventListener("click", handleClick);
        window.removeEventListener("resize", handleResize);
        composer.dispose();
        renderer.dispose();
        boxGeometry.dispose();
        ghostGeo.dispose();
        ghostMat.dispose();
        container.replaceChildren();
      };
    }, [compilerData, buildProgress, activePaletteId, sculptMode, onSelectVoxel, onAddVoxel, onDeleteVoxel]);

    return (
      <div
        ref={mountRef}
        className="w-100 h-100"
        style={{
          minHeight: "450px",
          cursor: sculptMode ? "crosshair" : "default",
        }}
      />
    );
  }
);

VoxelCanvas.displayName = "VoxelCanvas";
export default VoxelCanvas;