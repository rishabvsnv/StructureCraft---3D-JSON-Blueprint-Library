"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export interface VoxelCanvasHandle {
  setCameraView: (view: "iso" | "top" | "front" | "side") => void;
  resetCamera: () => void;
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
  buildProgress?: number; // 0.0 to 1.0
}

const VoxelCanvas = forwardRef<VoxelCanvasHandle, VoxelCanvasProps>(
  ({ compilerData, buildProgress = 1.0 }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3());

    // Camera preset switcher methods
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

      // 1. Scene & Camera
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#08090d");

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

      // 2. Bloom Post-Processing
      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.85,
        0.4,
        0.35
      );

      const composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);

      // 3. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(maxDim * 2, maxDim * 3, maxDim * 1.5);
      scene.add(dirLight);

      // 4. Ground Grid
      const grid = new THREE.GridHelper(
        Math.max(compilerData.dimensions.x, compilerData.dimensions.z) * 1.5,
        20,
        0x334155,
        0x1e293b
      );
      grid.position.set(centerX, -0.01, centerZ);
      scene.add(grid);

      // 5. Structure Groups with Build Progress Filter
      const staticGroup = new THREE.Group();
      const dynamicGroup = new THREE.Group();
      dynamicGroup.position.set(centerX, centerY, centerZ);

      scene.add(staticGroup);
      scene.add(dynamicGroup);

      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const dummy = new THREE.Object3D();
      let hasAnimatedElements = false;

      // Compute total voxels across all palettes to filter by buildProgress
      let totalVoxelCount = 0;
      Object.values(compilerData.groups).forEach((coords) => {
        totalVoxelCount += coords.length / 3;
      });
      const maxVisibleVoxels = Math.floor(totalVoxelCount * buildProgress);

      let processedVoxels = 0;

      compilerData.palette.forEach((p) => {
        const rawCoords = compilerData.groups[p.id] || [];
        const availableInPalette = rawCoords.length / 3;
        if (availableInPalette === 0) return;

        // Determine how many voxels in this palette can be drawn
        const remainingQuota = Math.max(0, maxVisibleVoxels - processedVoxels);
        const countToRender = Math.min(availableInPalette, remainingQuota);
        processedVoxels += availableInPalette;

        if (countToRender === 0) return;

        const isAnimated = Boolean(p.animated);
        const isEmissive = Boolean(p.emissive);

        if (isAnimated) hasAnimatedElements = true;

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          roughness: p.roughness ?? 0.5,
          metalness: 0.1,
          emissive: isEmissive ? new THREE.Color(p.color) : new THREE.Color(0x000000),
          emissiveIntensity: isEmissive ? 2.2 : 0,
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

        if (isAnimated) {
          dynamicGroup.add(instancedMesh);
        } else {
          staticGroup.add(instancedMesh);
        }
      });

      // 6. Animation Loop
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

      // 7. Resize Handler
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
        window.removeEventListener("resize", handleResize);
        composer.dispose();
        renderer.dispose();
        boxGeometry.dispose();
        container.replaceChildren();
      };
    }, [compilerData, buildProgress]);

    return <div ref={mountRef} className="w-100 h-100" style={{ minHeight: "450px" }} />;
  }
);

VoxelCanvas.displayName = "VoxelCanvas";
export default VoxelCanvas;