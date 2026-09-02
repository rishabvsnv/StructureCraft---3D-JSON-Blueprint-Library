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

export type ShaderEffectType = "none" | "pulse" | "hologram" | "digital-rain";

export interface PaletteItem {
  id: number;
  name: string;
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: boolean;
  emissiveIntensity?: number;
  animated?: boolean;
  shaderFx?: ShaderEffectType;
}

export interface EnvironmentSettings {
  preset: "space" | "sunset" | "cyber" | "studio";
  bgColor: string;
  sunAngle: number;
  sunElevation: number;
  sunIntensity: number;
  fogDensity: number;
  bloomStrength: number;
}

export interface VoxelCanvasHandle {
  setCameraView: (view: "iso" | "top" | "front" | "side") => void;
  resetCamera: () => void;
  enterFPV: () => void;
  exitFPV: () => void;
}

export interface SelectedVoxelInfo {
  x: number;
  y: number;
  z: number;
  paletteId: number;
  paletteName: string;
  paletteColor: string;
}

export interface DroneTelemetry {
  position: { x: number; y: number; z: number };
  yaw: number;
}

interface VoxelCanvasProps {
  compilerData: {
    groups: Record<number, number[]>;
    palette: PaletteItem[];
    dimensions: { x: number; y: number; z: number };
  } | null;
  buildProgress?: number;
  activePaletteId: number;
  sculptMode: boolean;
  walkthroughMode: boolean;
  environmentConfig: EnvironmentSettings;
  onWalkthroughChange?: (active: boolean) => void;
  onSelectVoxel?: (info: SelectedVoxelInfo | null) => void;
  onAddVoxel?: (voxel: {
    x: number;
    y: number;
    z: number;
    paletteId: number;
  }) => void;
  onDeleteVoxel?: (target: { x: number; y: number; z: number }) => void;
  onTelemetryUpdate?: (telemetry: DroneTelemetry) => void;
}

const VoxelCanvas = forwardRef<VoxelCanvasHandle, VoxelCanvasProps>(
  (
    {
      compilerData,
      buildProgress = 1.0,
      activePaletteId,
      sculptMode,
      walkthroughMode,
      environmentConfig,
      onWalkthroughChange,
      onSelectVoxel,
      onAddVoxel,
      onDeleteVoxel,
      onTelemetryUpdate,
    },
    ref,
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3());

    const sceneRef = useRef<THREE.Scene | null>(null);
    const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
    const bloomPassRef = useRef<UnrealBloomPass | null>(null);

    // Dynamic Shader Uniforms (shared time value)
    const shaderUniformsRef = useRef<{ uTime: { value: number } }>({
      uTime: { value: 0 },
    });

    const walkthroughModeRef = useRef(walkthroughMode);
    walkthroughModeRef.current = walkthroughMode;

    const sculptModeRef = useRef(sculptMode);
    sculptModeRef.current = sculptMode;

    const activePaletteIdRef = useRef(activePaletteId);
    activePaletteIdRef.current = activePaletteId;

    const onWalkthroughChangeRef = useRef(onWalkthroughChange);
    onWalkthroughChangeRef.current = onWalkthroughChange;

    const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
    onTelemetryUpdateRef.current = onTelemetryUpdate;

    const keysPressed = useRef<Record<string, boolean>>({});
    const droneVelocity = useRef<THREE.Vector3>(new THREE.Vector3());
    const cameraPitch = useRef(0);
    const cameraYaw = useRef(0);

    useImperativeHandle(ref, () => ({
      setCameraView: (view) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls || !compilerData || walkthroughModeRef.current)
          return;

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
      enterFPV: () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        const dom = rendererRef.current?.domElement;
        if (dom) {
          const camera = cameraRef.current;
          if (camera) {
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            cameraYaw.current = Math.atan2(-dir.x, -dir.z);
            cameraPitch.current = Math.asin(
              Math.max(-0.99, Math.min(0.99, dir.y)),
            );
          }
          dom.focus?.();
          dom.requestPointerLock?.();
        }
      },
      exitFPV: () => {
        if (document.exitPointerLock) {
          document.exitPointerLock();
        }
      },
    }));

    useEffect(() => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !walkthroughMode;
      }
    }, [walkthroughMode]);

    useEffect(() => {
      if (!sceneRef.current || !dirLightRef.current || !compilerData) return;
      const scene = sceneRef.current;
      const dirLight = dirLightRef.current;

      scene.background = new THREE.Color(environmentConfig.bgColor);
      scene.fog =
        environmentConfig.fogDensity > 0
          ? new THREE.FogExp2(
              environmentConfig.bgColor,
              environmentConfig.fogDensity,
            )
          : null;

      const maxDim = Math.max(
        compilerData.dimensions.x,
        compilerData.dimensions.y,
        compilerData.dimensions.z,
      );
      const radAzimuth = (environmentConfig.sunAngle * Math.PI) / 180;
      const radElevation = (environmentConfig.sunElevation * Math.PI) / 180;
      const dist = maxDim * 2.5;

      dirLight.position.set(
        centerRef.current.x +
          dist * Math.cos(radElevation) * Math.sin(radAzimuth),
        centerRef.current.y + dist * Math.sin(radElevation),
        centerRef.current.z +
          dist * Math.cos(radElevation) * Math.cos(radAzimuth),
      );
      dirLight.intensity = environmentConfig.sunIntensity;

      if (bloomPassRef.current) {
        bloomPassRef.current.strength = environmentConfig.bloomStrength;
      }
    }, [environmentConfig, compilerData]);

    // Primary scene setup
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

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(environmentConfig.bgColor);
      if (environmentConfig.fogDensity > 0) {
        scene.fog = new THREE.FogExp2(
          environmentConfig.bgColor,
          environmentConfig.fogDensity,
        );
      }
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
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
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(centerX, centerY, centerZ);
      controls.enabled = !walkthroughModeRef.current;
      controlsRef.current = controls;

      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        environmentConfig.bloomStrength,
        0.2,
        0.8,
      );
      bloomPassRef.current = bloomPass;

      const composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(
        0xffffff,
        environmentConfig.sunIntensity,
      );
      dirLightRef.current = dirLight;
      scene.add(dirLight);

      const grid = new THREE.GridHelper(
        Math.max(compilerData.dimensions.x, compilerData.dimensions.z) * 1.5,
        20,
        0x334155,
        0x1e293b,
      );
      grid.position.set(centerX, -0.01, centerZ);
      scene.add(grid);

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
        {
          paletteId: number;
          paletteName: string;
          paletteColor: string;
          rawCoords: number[];
        }
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

        const emissivePower = p.emissiveIntensity ?? 1.0;
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          roughness: p.roughness ?? 0.6,
          metalness: p.metalness ?? 0.15,
          emissive: isEmissive
            ? new THREE.Color(p.color)
            : new THREE.Color(0x000000),
          emissiveIntensity: isEmissive ? emissivePower : 0,
        });

        // Inject Custom Shader FX via onBeforeCompile
        if (p.shaderFx && p.shaderFx !== "none") {
          material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = shaderUniformsRef.current.uTime;

            if (p.shaderFx === "pulse") {
              shader.fragmentShader = `
                uniform float uTime;
                ${shader.fragmentShader}
              `.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>
                 float pulseVal = (sin(uTime * 4.0) * 0.5 + 0.5);
                 gl_FragColor.rgb += gl_FragColor.rgb * pulseVal * 0.7;
                `,
              );
            } else if (p.shaderFx === "hologram") {
              shader.fragmentShader = `
                uniform float uTime;
                ${shader.fragmentShader}
              `.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>
                 float scanline = sin(gl_FragCoord.y * 0.8 + uTime * 6.0) * 0.5 + 0.5;
                 gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 0.9, 1.0), 0.35);
                 gl_FragColor.rgb *= (0.7 + 0.3 * scanline);
                `,
              );
            } else if (p.shaderFx === "digital-rain") {
              shader.fragmentShader = `
                uniform float uTime;
                ${shader.fragmentShader}
              `.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>
                 float matrix = step(0.85, fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453 + uTime * 2.0));
                 gl_FragColor.rgb += vec3(0.0, 0.8, 0.2) * matrix * 0.9;
                `,
              );
            }
          };
        }

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
          paletteId: p.id,
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
        if (
          walkthroughModeRef.current &&
          document.pointerLockElement === renderer.domElement
        ) {
          const sensitivity = 0.0022;
          cameraYaw.current -= e.movementX * sensitivity;
          cameraPitch.current -= e.movementY * sensitivity;

          cameraPitch.current = Math.max(
            -1.48,
            Math.min(1.48, cameraPitch.current),
          );

          const euler = new THREE.Euler(
            cameraPitch.current,
            cameraYaw.current,
            0,
            "YXZ",
          );
          camera.quaternion.setFromEuler(euler);
          return;
        }

        if (!sculptModeRef.current) {
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
              ghostMat.color.setHex(0xef4444);
              ghostMesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
            } else {
              ghostMat.color.setHex(0x38bdf8);
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
        if (walkthroughModeRef.current) return;

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

            if (sculptModeRef.current && (e.shiftKey || e.altKey)) {
              onDeleteVoxel?.({ x: vx, y: vy, z: vz });
              return;
            }

            if (sculptModeRef.current && !e.shiftKey && !e.altKey) {
              const normal = hit.face.normal;
              onAddVoxel?.({
                x: vx + Math.round(normal.x),
                y: vy + Math.round(normal.y),
                z: vz + Math.round(normal.z),
                paletteId: activePaletteIdRef.current,
              });
              return;
            }

            onSelectVoxel?.({
              x: vx,
              y: vy,
              z: vz,
              paletteId: meta.paletteId,
              paletteName: meta.paletteName,
              paletteColor: meta.paletteColor,
            });
            return;
          }
        }
        onSelectVoxel?.(null);
      };

      const handlePointerLockChange = () => {
        const isLocked = document.pointerLockElement === renderer.domElement;
        onWalkthroughChangeRef.current?.(isLocked);
      };

      const handlePointerLockError = () => {
        console.warn("Pointer lock request rejected by browser.");
        onWalkthroughChangeRef.current?.(false);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (walkthroughModeRef.current) {
          if (
            [
              "Space",
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
            ].includes(e.code)
          ) {
            e.preventDefault();
          }
        }
        keysPressed.current[e.code] = true;
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.code] = false;
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      document.addEventListener("pointerlockchange", handlePointerLockChange);
      document.addEventListener("pointerlockerror", handlePointerLockError);
      container.addEventListener("mousemove", handlePointerMove);
      container.addEventListener("click", handleClick);

      let animationFrameId: number;
      const timer = new THREE.Timer();
      timer.connect(document);
      const moveDir = new THREE.Vector3();

      const animate = (timestamp: number) => {
        animationFrameId = requestAnimationFrame(animate);

        timer.update(timestamp);
        const delta = Math.min(timer.getDelta(), 0.1);
        const elapsedTime = timer.getElapsed();

        // Feed global time to custom shaders
        shaderUniformsRef.current.uTime.value = elapsedTime;

        if (hasAnimatedElements) {
          dynamicGroup.rotation.z = elapsedTime * 0.9;
        }

        if (walkthroughModeRef.current) {
          moveDir.set(0, 0, 0);
          const forward = new THREE.Vector3(
            -Math.sin(cameraYaw.current),
            0,
            -Math.cos(cameraYaw.current),
          );
          const right = new THREE.Vector3(
            Math.cos(cameraYaw.current),
            0,
            -Math.sin(cameraYaw.current),
          );

          if (keysPressed.current["KeyW"]) moveDir.add(forward);
          if (keysPressed.current["KeyS"]) moveDir.sub(forward);
          if (keysPressed.current["KeyD"]) moveDir.add(right);
          if (keysPressed.current["KeyA"]) moveDir.sub(right);
          if (keysPressed.current["Space"]) moveDir.y += 1;
          if (
            keysPressed.current["ShiftLeft"] ||
            keysPressed.current["ShiftRight"]
          )
            moveDir.y -= 1;

          if (moveDir.lengthSq() > 0) moveDir.normalize();

          const droneSpeed = 22.0;
          droneVelocity.current.lerp(
            moveDir.multiplyScalar(droneSpeed),
            delta * 10.0,
          );
          camera.position.addScaledVector(droneVelocity.current, delta);

          onTelemetryUpdateRef.current?.({
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            yaw: cameraYaw.current,
          });
        } else {
          controls.update();
        }

        composer.render();
      };

      animationFrameId = requestAnimationFrame(animate);

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
        timer.dispose();
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        document.removeEventListener(
          "pointerlockchange",
          handlePointerLockChange,
        );
        document.removeEventListener(
          "pointerlockerror",
          handlePointerLockError,
        );
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
    }, [compilerData, buildProgress]);

    return (
      <div
        ref={mountRef}
        className="w-100 h-100"
        style={{
          minHeight: "450px",
          cursor: walkthroughMode
            ? "crosshair"
            : sculptMode
              ? "crosshair"
              : "default",
        }}
      />
    );
  },
);

VoxelCanvas.displayName = "VoxelCanvas";
export default VoxelCanvas;
