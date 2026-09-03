import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// Download JSON file directly
export function downloadJson(blueprintData: object, filename = "blueprint.json") {
  const blob = new Blob([JSON.stringify(blueprintData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Convert compiler data to a single 3D scene and export as downloadable .gltf
export function exportToGLTF(
  compilerData: {
    groups: Record<number, number[]>;
    palette: Array<{
      id: number;
      color: string;
      roughness?: number;
      metalness?: number;
      emissive?: boolean;
    }>;
  },
  filename = "structure.gltf"
) {
  const exportScene = buildExportScene(compilerData);
  const exporter = new GLTFExporter();

  exporter.parse(
    exportScene,
    (gltf) => {
      const output = JSON.stringify(gltf, null, 2);
      const blob = new Blob([output], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    (err) => console.error("GLTF Export Error:", err),
    { binary: false }
  );
}

// Generates an in-memory GLTF Blob for instant transfer to Babylon Sandbox
export function generateGLTFBlob(compilerData: {
  groups: Record<number, number[]>;
  palette: Array<{
    id: number;
    color: string;
    roughness?: number;
    metalness?: number;
    emissive?: boolean;
  }>;
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const exportScene = buildExportScene(compilerData);
    const exporter = new GLTFExporter();

    exporter.parse(
      exportScene,
      (gltf) => {
        const output = JSON.stringify(gltf);
        const blob = new Blob([output], { type: "model/gltf+json" });
        resolve(blob);
      },
      (err) => {
        console.error("GLTF Blob Generation Error:", err);
        reject(err);
      },
      { binary: false }
    );
  });
}

// Internal reusable helper to build the export scene with full PBR properties
function buildExportScene(compilerData: {
  groups: Record<number, number[]>;
  palette: Array<{
    id: number;
    color: string;
    roughness?: number;
    metalness?: number;
    emissive?: boolean;
  }>;
}): THREE.Scene {
  const exportScene = new THREE.Scene();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();

  compilerData.palette.forEach((p) => {
    const coords = compilerData.groups[p.id] || [];
    const count = coords.length / 3;
    if (count === 0) return;

    const isEmissive = Boolean(p.emissive);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.color),
      roughness: p.roughness ?? 0.6,
      metalness: p.metalness ?? 0.15,
      emissive: isEmissive ? new THREE.Color(p.color) : new THREE.Color(0x000000),
      emissiveIntensity: isEmissive ? 1.0 : 0.0,
    });

    const mesh = new THREE.InstancedMesh(boxGeo, material, count);
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        coords[i * 3] + 0.5,
        coords[i * 3 + 1] + 0.5,
        coords[i * 3 + 2] + 0.5
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    exportScene.add(mesh);
  });

  return exportScene;
}