export function generateCyberSkyscraper(height = 16, baseWidth = 7) {
  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];
  const maxDim = baseWidth + 4;
  const centerX = Math.floor(maxDim / 2);
  const centerZ = Math.floor(maxDim / 2);
  const halfBase = Math.floor(baseWidth / 2);

  // 1. Foundation Base
  for (let x = centerX - halfBase - 1; x <= centerX + halfBase + 1; x++) {
    for (let z = centerZ - halfBase - 1; z <= centerZ + halfBase + 1; z++) {
      voxels.push({ x, y: 0, z, paletteId: 1 }); // Concrete Base
    }
  }

  // 2. Tower Structure
  for (let y = 1; y <= height; y++) {
    let currentWidth = baseWidth;
    if (y > 6) currentWidth -= 2;  // Tier 2
    if (y > 11) currentWidth -= 2; // Tier 3
    const halfW = Math.floor(currentWidth / 2);

    for (let x = centerX - halfW; x <= centerX + halfW; x++) {
      for (let z = centerZ - halfW; z <= centerZ + halfW; z++) {
        const isCorner =
          (x === centerX - halfW || x === centerX + halfW) &&
          (z === centerZ - halfW || z === centerZ + halfW);
        const isPerimeter =
          x === centerX - halfW ||
          x === centerX + halfW ||
          z === centerZ - halfW ||
          z === centerZ + halfW;

        if (isCorner) {
          voxels.push({ x, y, z, paletteId: 2 }); // Steel Frame
        } else if (isPerimeter) {
          const isFloorDivider = y % 3 === 0;
          if (isFloorDivider) {
            voxels.push({ x, y, z, paletteId: 2 }); // Floor divider
          } else {
            const hash = (x * 7 + y * 13 + z * 19) % 10;
            if (hash < 3) {
              voxels.push({ x, y, z, paletteId: 3 }); // Cyan Window
            } else if (hash === 3 || hash === 4) {
              voxels.push({ x, y, z, paletteId: 4 }); // Magenta Ad
            } else {
              voxels.push({ x, y, z, paletteId: 5 }); // Tinted Glass
            }
          }
        } else if (y === height || y % 3 === 0) {
          // Solid roof and internal floor slabs
          voxels.push({ x, y, z, paletteId: 2 });
        }
      }
    }
  }

  // 3. Continuous Spire Rod & Beacon
  const spireStart = height + 1;
  const spireEnd = height + 4;

  // Solid vertical rod connecting roof to top beacon
  for (let y = spireStart; y < spireEnd; y++) {
    voxels.push({ x: centerX, y, z: centerZ, paletteId: 2 });
  }

  // Top Warning Beacon (Firmly connected at spireEnd)
  voxels.push({ x: centerX, y: spireEnd, z: centerZ, paletteId: 6 });

  return {
    title: "Neo-Veridia Cyber Tower",
    dimensions: { x: maxDim, y: spireEnd + 2, z: maxDim },
    palette: [
      { id: 1, name: "Reinforced Concrete Base", color: "#1e293b", roughness: 0.8 },
      { id: 2, name: "Dark Titanium Frame", color: "#0f172a", roughness: 0.4 },
      { id: 3, name: "Cyan Hologram Window", color: "#00e5ff", roughness: 0.1, emissive: true },
      { id: 4, name: "Magenta Neon Signboard", color: "#f43f5e", roughness: 0.1, emissive: true },
      { id: 5, name: "Tinted Polarized Glass", color: "#111827", roughness: 0.3 },
      { id: 6, name: "Warning Light Beacon", color: "#ff2222", roughness: 0.1, emissive: true, animated: false }
    ],
    voxels,
  };
}