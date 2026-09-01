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

// Convert compiler data to a single 3D scene and export as .gltf
export function exportToGLTF(
  compilerData: {
    groups: Record<number, number[]>;
    palette: Array<{ id: number; color: string; roughness?: number }>;
  },
  filename = "structure.gltf"
) {
  const exportScene = new THREE.Scene();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();

  compilerData.palette.forEach((p) => {
    const coords = compilerData.groups[p.id] || [];
    const count = coords.length / 3;
    if (count === 0) return;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.color),
      roughness: p.roughness ?? 0.5,
    });

    const mesh = new THREE.InstancedMesh(boxGeo, material, count);
    for (let i = 0; i < count; i++) {
      dummy.position.set(coords[i * 3] + 0.5, coords[i * 3 + 1] + 0.5, coords[i * 3 + 2] + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    exportScene.add(mesh);
  });

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