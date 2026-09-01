"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface VoxelCanvasProps {
  compilerData: {
    groups: Record<number, number[]>;
    palette: Array<{ id: number; name: string; color: string; roughness?: number }>;
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#121418");

    const maxDim = Math.max(
      compilerData.dimensions.x,
      compilerData.dimensions.y,
      compilerData.dimensions.z
    );
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(maxDim * 1.8, maxDim * 1.5, maxDim * 1.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(
      compilerData.dimensions.x / 2,
      compilerData.dimensions.y / 2,
      compilerData.dimensions.z / 2
    );

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(maxDim * 2, maxDim * 3, maxDim * 1.5);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(
      Math.max(compilerData.dimensions.x, compilerData.dimensions.z) * 1.5,
      20,
      0x555566,
      0x2a2d34
    );
    grid.position.set(compilerData.dimensions.x / 2, -0.01, compilerData.dimensions.z / 2);
    scene.add(grid);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();

    compilerData.palette.forEach((p) => {
      const coords = compilerData.groups[p.id] || [];
      const count = coords.length / 3;
      if (count === 0) return;

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        roughness: p.roughness ?? 0.4,
      });

      const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, count);

      for (let i = 0; i < count; i++) {
        dummy.position.set(
          coords[i * 3] + 0.5,
          coords[i * 3 + 1] + 0.5,
          coords[i * 3 + 2] + 0.5
        );
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      scene.add(instancedMesh);
    });

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      boxGeometry.dispose();
      container.replaceChildren();
    };
  }, [compilerData]);

  return <div ref={mountRef} className="w-100 h-100" style={{ minHeight: "450px" }} />;
}