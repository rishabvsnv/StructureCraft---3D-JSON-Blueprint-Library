// src/utils/generatePortal.ts
export function generateSciFiPortal(outerRadius = 10, depth = 3) {
  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];
  const size = outerRadius * 2 + 5;
  const centerX = Math.floor(size / 2);
  const centerY = outerRadius + 2;
  const centerZ = Math.floor(depth / 2) + 2;

  // 1. Base Tech Platform (Static)
  for (let x = centerX - outerRadius - 1; x <= centerX + outerRadius + 1; x++) {
    for (let z = 0; z <= depth + 4; z++) {
      voxels.push({ x, y: 0, z, paletteId: 1 });
      if (
        x >= centerX - outerRadius + 2 &&
        x <= centerX + outerRadius - 2 &&
        z >= 1 &&
        z <= depth + 3
      ) {
        voxels.push({ x, y: 1, z, paletteId: (x + z) % 3 === 0 ? 7 : 2 });
      }
    }
  }

  // 2. Outer Ring & Frame (Static)
  for (let angle = 0; angle < 360; angle += 3) {
    const rad = (angle * Math.PI) / 180;
    for (let d = 0; d < depth; d++) {
      const zPos = centerZ - Math.floor(depth / 2) + d;

      const ox = Math.round(centerX + outerRadius * Math.cos(rad));
      const oy = Math.round(centerY + outerRadius * Math.sin(rad));
      voxels.push({ x: ox, y: oy, z: zPos, paletteId: angle % 45 === 0 ? 5 : 1 });

      const mx = Math.round(centerX + (outerRadius - 1) * Math.cos(rad));
      const my = Math.round(centerY + (outerRadius - 1) * Math.sin(rad));
      voxels.push({ x: mx, y: my, z: zPos, paletteId: 2 });

      if (d === Math.floor(depth / 2)) {
        const ix = Math.round(centerX + (outerRadius - 2) * Math.cos(rad));
        const iy = Math.round(centerY + (outerRadius - 2) * Math.sin(rad));
        voxels.push({ x: ix, y: iy, z: zPos, paletteId: 3 }); // Inner Lip (Emissive + Animated)
      }
    }
  }

  // 3. Floating Quantum Particles (Emissive + Animated)
  const innerRadius = outerRadius - 3;
  const particleCount = Math.floor(innerRadius * 14);

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    const currentR = innerRadius * Math.sqrt(t);
    const spiralAngle = i * 2.4;

    const px = Math.round(centerX + currentR * Math.cos(spiralAngle));
    const py = Math.round(centerY + currentR * Math.sin(spiralAngle));
    const pz = centerZ + (i % 2 === 0 ? 0 : (i % 3 === 0 ? 1 : -1));

    voxels.push({ x: px, y: py, z: pz, paletteId: i % 5 === 0 ? 6 : (i % 2 === 0 ? 3 : 4) });
  }

  voxels.push({ x: centerX, y: centerY, z: centerZ, paletteId: 6 });

  return {
    title: "Quantum Ring Gateway",
    dimensions: { x: size, y: centerY + outerRadius + 2, z: depth + 5 },
    palette: [
      { id: 1, name: "Reinforced Alloy Hull", color: "#1e293b", roughness: 0.3 },
      { id: 2, name: "Carbon Nano-Chassis", color: "#0f172a", roughness: 0.5 },
      { id: 3, name: "Cyan Plasma Ring", color: "#00f0ff", roughness: 0.1, emissive: true, animated: true },
      { id: 4, name: "Sublight Conduit", color: "#38bdf8", roughness: 0.2, emissive: true, animated: true },
      { id: 5, name: "Chevron Reactor Node", color: "#f59e0b", roughness: 0.2, emissive: true, animated: false },
      { id: 6, name: "Singularity Core", color: "#ec4899", roughness: 0.1, emissive: true, animated: true },
      { id: 7, name: "Static Floor Circuit", color: "#0284c7", roughness: 0.3 }
    ],
    voxels,
  };
}