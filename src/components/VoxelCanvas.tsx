"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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
}

export default function VoxelCanvas({ compilerData }: VoxelCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !compilerData) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Dimensions & Pivot Center
    const centerX = compilerData.dimensions.x / 2;
    const centerY = compilerData.dimensions.y / 2;
    const centerZ = compilerData.dimensions.z / 2;
    const maxDim = Math.max(
      compilerData.dimensions.x,
      compilerData.dimensions.y,
      compilerData.dimensions.z
    );

    // 2. Scene, Camera & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#08090d");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(maxDim * 1.8, maxDim * 1.4, maxDim * 1.8);

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

    // 3. Post-Processing: High-Threshold Unreal Bloom
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5,   // Bloom strength
      0.4,   // Bloom radius
      0.85   // High threshold: prevents white stone from glowing
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 4. Balanced Scene Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(maxDim * 2, maxDim * 3, maxDim * 1.5);
    scene.add(dirLight);

    // 5. Ground Grid
    const grid = new THREE.GridHelper(
      Math.max(compilerData.dimensions.x, compilerData.dimensions.z) * 1.5,
      20,
      0x334155,
      0x1e293b
    );
    grid.position.set(centerX, -0.01, centerZ);
    scene.add(grid);

    // 6. Mesh Groups (Static vs Dynamic)
    const staticGroup = new THREE.Group();
    const dynamicGroup = new THREE.Group();
    dynamicGroup.position.set(centerX, centerY, centerZ);

    scene.add(staticGroup);
    scene.add(dynamicGroup);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();
    let hasAnimatedElements = false;

    compilerData.palette.forEach((p) => {
      const coords = compilerData.groups[p.id] || [];
      const count = coords.length / 3;
      if (count === 0) return;

      const isAnimated = Boolean(p.animated);
      const isEmissive = Boolean(p.emissive);

      if (isAnimated) {
        hasAnimatedElements = true;
      }

      // Material definition: only emissive: true gets the high bloom intensity
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        roughness: p.roughness ?? 0.6,
        metalness: 0.1,
        emissive: isEmissive ? new THREE.Color(p.color) : new THREE.Color(0x000000),
        emissiveIntensity: isEmissive ? 4.0 : 0,
      });

      const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, count);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      for (let i = 0; i < count; i++) {
        const rawX = coords[i * 3] + 0.5;
        const rawY = coords[i * 3 + 1] + 0.5;
        const rawZ = coords[i * 3 + 2] + 0.5;

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

    // 8. Resize Handler
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

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      composer.dispose();
      renderer.dispose();
      boxGeometry.dispose();
      container.replaceChildren();
    };
  }, [compilerData]);

  return <div ref={mountRef} className="w-100 h-100" style={{ minHeight: "450px" }} />;
}