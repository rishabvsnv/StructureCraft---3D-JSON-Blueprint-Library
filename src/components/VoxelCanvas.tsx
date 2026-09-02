"use client";

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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
  onSelectVoxel?: (info: SelectedVoxelInfo | null) => void;
  onAddVoxel?: (voxel: {
    x: number;
    y: number;
    z: number;
    paletteId: number;
  }) => void;
  onDeleteVoxel?: (target: { x: number; y: number; z: number }) => void;
}

const VoxelCanvas = forwardRef<VoxelCanvasHandle, VoxelCanvasProps>(
  (
    {
      compilerData,
      buildProgress = 1.0,
      activePaletteId,
      sculptMode,
      onSelectVoxel,
      onAddVoxel,
      onDeleteVoxel,
    },
    ref,
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3());

    useImperativeHandle(ref, () => ({
      setCameraView: (view) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls || !compilerData) return;

        const maxDim = Math.max(
          compilerData.dimensions.x,
          compilerData.dimensions.y,
          compilerData.dimensions.z,
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
              center.z + maxDim * 1.5,
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
          compilerData.dimensions.z,
        );
        const center = centerRef.current;
        camera.position.set(
          center.x + maxDim * 1.5,
          center.y + maxDim * 1.3,
          center.z + maxDim * 1.5,
        );
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
        compilerData.dimensions.z,
      );

      // 1. Scene, Camera & Renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#08090d");

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(
        centerX + maxDim * 1.5,
        centerY + maxDim * 1.3,
        centerZ + maxDim * 1.5,
      );
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

      // 2. Post-Processing: Tight Bloom to eliminate noise blowout
      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.4, // Tamed bloom strength
        0.2, // Controlled radius
        0.8, // High threshold to protect standard matte tiles
      );
      const composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);

      // 3. Lighting & Base Grid
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(maxDim * 2, maxDim * 3, maxDim * 1.5);
      scene.add(dirLight);

      const grid = new THREE.GridHelper(
        Math.max(compilerData.dimensions.x, compilerData.dimensions.z) * 1.5,
        20,
        0x334155,
        0x1e293b,
      );
      grid.position.set(centerX, -0.01, centerZ);
      scene.add(grid);

      // 4. Ghost Wireframe Box for Sculpt Preview
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

      // 5. Instanced Meshes & Metadata
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
          emissive: isEmissive
            ? new THREE.Color(p.color)
            : new THREE.Color(0x000000),
          emissiveIntensity: isEmissive ? 1.0 : 0, // Controlled emissive strength
        });

        const instancedMesh = new THREE.InstancedMesh(
          boxGeometry,
          material,
          countToRender,
        );

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

      // 6. Raycasting for Cursor Preview & Mouse Interaction
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
        if (
          intersects.length > 0 &&
          intersects[0].instanceId !== undefined &&
          intersects[0].face
        ) {
          const hit = intersects[0];
          const mesh = hit.object as THREE.InstancedMesh;
          const meta = meshMetadata.get(mesh);
          const id = hit.instanceId;

          if (meta && id !== undefined && hit.face) {
            const vx = meta.rawCoords[id * 3];
            const vy = meta.rawCoords[id * 3 + 1];
            const vz = meta.rawCoords[id * 3 + 2];

            if (e.shiftKey || e.altKey) {
              ghostMat.color.setHex(0xef4444); // Red wireframe for delete
              ghostMesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
            } else {
              ghostMat.color.setHex(0x38bdf8); // Cyan wireframe for place
              const normal = hit.face.normal;
              ghostMesh.position.set(
                vx + normal.x + 0.5,
                vy + normal.y + 0.5,
                vz + normal.z + 0.5,
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

        if (
          intersects.length > 0 &&
          intersects[0].instanceId !== undefined &&
          intersects[0].face
        ) {
          const hit = intersects[0];
          const mesh = hit.object as THREE.InstancedMesh;
          const meta = meshMetadata.get(mesh);
          const id = hit.instanceId;

          if (meta && id !== undefined && hit.face) {
            const vx = meta.rawCoords[id * 3];
            const vy = meta.rawCoords[id * 3 + 1];
            const vz = meta.rawCoords[id * 3 + 2];

            // SCULPT: DELETE BLOCK
            if (sculptMode && (e.shiftKey || e.altKey)) {
              onDeleteVoxel?.({ x: vx, y: vy, z: vz });
              return;
            }

            // SCULPT: ADD BLOCK
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

            // INSPECT VOXEL (Sculpt mode inactive)
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

      // 8. Resize Listener
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
    }, [
      compilerData,
      buildProgress,
      activePaletteId,
      sculptMode,
      onSelectVoxel,
      onAddVoxel,
      onDeleteVoxel,
    ]);

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
  },
);

VoxelCanvas.displayName = "VoxelCanvas";
export default VoxelCanvas;
