export function generateShibuyaCrossing() {
  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];

  const gridSize = 53;
  const center = 26;
  const roadHalfWidth = 7;

  // Palette:
  // 1: Wet Reflective Asphalt (#0a0d14)
  // 2: Neon Crosswalk Markings (#38bdf8 - emissive)
  // 3: Dark Titanium Tower Frame (#0f172a)
  // 4: Holo-Billboard Cyan (#00f0ff - emissive)
  // 5: Holo-Billboard Magenta (#f43f5e - emissive)
  // 6: Amber Neon Commercial Strips (#f59e0b - emissive)
  // 7: Monorail Maglev Rail Track (#475569)
  // 8: Moving Maglev Bullet Carriage (#ec4899 - emissive + animated)
  // 9: Elevated Skybridge Glass Walkway (#0284c7 - emissive)
  // 10: Street Level Neon Accent Trim (#10b981 - emissive)

  // 1. Wet Asphalt Ground & Diagonal Scramble Crosswalks
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      const isRoadX = Math.abs(x - center) <= roadHalfWidth;
      const isRoadZ = Math.abs(z - center) <= roadHalfWidth;

      if (isRoadX || isRoadZ) {
        // Base wet asphalt
        voxels.push({ x, y: 0, z, paletteId: 1 });

        // Scramble Crossing diagonal lines & zebra zebra bands
        const isIntersection = isRoadX && isRoadZ;
        const isZebraX = isRoadX && !isRoadZ && z % 3 === 0 && Math.abs(x - center) <= roadHalfWidth - 1;
        const isZebraZ = isRoadZ && !isRoadX && x % 3 === 0 && Math.abs(z - center) <= roadHalfWidth - 1;
        const isDiagonalCross = isIntersection && ((x + z) % 4 === 0 || (x - z) % 4 === 0);

        if (isZebraX || isZebraZ || isDiagonalCross) {
          voxels.push({ x, y: 1, z, paletteId: 2 });
        }
      } else {
        // Sidewalk pavement
        voxels.push({ x, y: 0, z, paletteId: 3 });
        voxels.push({ x, y: 1, z, paletteId: 3 });
      }
    }
  }

  // 2. Corner Megastructure Skyscrapers
  const corners = [
    { startX: 0, endX: center - roadHalfWidth - 1, startZ: 0, endZ: center - roadHalfWidth - 1, height: 34, billboardColor: 4 },
    { startX: center + roadHalfWidth + 1, endX: gridSize - 1, startZ: 0, endZ: center - roadHalfWidth - 1, height: 42, billboardColor: 5 },
    { startX: 0, endX: center - roadHalfWidth - 1, startZ: center + roadHalfWidth + 1, endZ: gridSize - 1, height: 38, billboardColor: 6 },
    { startX: center + roadHalfWidth + 1, endX: gridSize - 1, startZ: center + roadHalfWidth + 1, endZ: gridSize - 1, height: 46, billboardColor: 4 },
  ];

  // Replace section 2 in src/utils/generateShibuyaCrossing.ts:

// 2. Corner Megastructure Skyscrapers with Framed Billboards
corners.forEach((b) => {
  for (let y = 2; y <= b.height; y++) {
    for (let x = b.startX; x <= b.endX; x++) {
      for (let z = b.startZ; z <= b.endZ; z++) {
        const isPerimeter =
          x === b.startX || x === b.endX || z === b.startZ || z === b.endZ;

        if (!isPerimeter) continue;

        const facesIntersection =
          (x === b.endX && b.startX === 0) ||
          (x === b.startX && b.startX > 0) ||
          (z === b.endZ && b.startZ === 0) ||
          (z === b.startZ && b.startZ > 0);

        // Striped Billboard Lattice (Dark borders between neon rows)
        if (facesIntersection && y >= 12 && y <= 28) {
          const isGridFrame = y % 2 === 0 || (x + z) % 3 === 0;
          if (isGridFrame) {
            voxels.push({ x, y, z, paletteId: 3 }); // Dark Matte Frame
          } else {
            voxels.push({ x, y, z, paletteId: b.billboardColor }); // Crisp Neon Pixel
          }
        } else if (facesIntersection && y === 4 && (x + z) % 2 === 0) {
          // Subtle shopfront awning
          voxels.push({ x, y, z, paletteId: 10 });
        } else {
          // Tower facade: dark alloy columns with sparse warm office lights
          const isColumn = x % 3 === 0 || z % 3 === 0;
          const isWindow = (x * 7 + z * 11 + y * 13) % 17 === 0;
          
          if (isColumn) {
            voxels.push({ x, y, z, paletteId: 3 }); // Dark Carbon Frame
          } else if (isWindow) {
            voxels.push({ x, y, z, paletteId: 6 }); // Single Amber Window
          } else {
            voxels.push({ x, y, z, paletteId: 1 }); // Matte Dark Glass
          }
        }
      }
    }
  }
});

  // 3. Elevated Glass Skybridges Connecting Opposite Towers
  const skybridgeY = 22;
  const bLeftX = center - roadHalfWidth - 1;
  const bRightX = center + roadHalfWidth + 1;

  // Skybridge across X-axis
  for (let x = bLeftX; x <= bRightX; x++) {
    for (let z = center - 14; z <= center - 11; z++) {
      voxels.push({ x, y: skybridgeY, z, paletteId: 3 }); // Walkway floor
      voxels.push({ x, y: skybridgeY + 3, z, paletteId: 3 }); // Roof
      if (z === center - 14 || z === center - 11) {
        voxels.push({ x, y: skybridgeY + 1, z, paletteId: 9 }); // Glass side walls
        voxels.push({ x, y: skybridgeY + 2, z, paletteId: 9 });
      }
    }
  }

  // 4. Multi-Level Maglev Monorail Track (Curving through intersection)
  const railY = 10;
  for (let z = 0; z < gridSize; z++) {
    const rx = center - 3;
    voxels.push({ x: rx, y: railY, z, paletteId: 7 });
    voxels.push({ x: rx + 1, y: railY, z, paletteId: 7 });

    // Track support pillars down to ground
    if (z % 14 === 0) {
      for (let py = 1; py < railY; py++) {
        voxels.push({ x: rx, y: py, z, paletteId: 3 });
      }
    }
  }

  // 5. Dynamic Bullet Monorail Train (Marked Animated & Glowing)
  for (let tz = center - 8; tz <= center + 8; tz++) {
    const rx = center - 3;
    voxels.push({ x: rx, y: railY + 1, z: tz, paletteId: 8 });
    voxels.push({ x: rx + 1, y: railY + 1, z: tz, paletteId: 8 });
    voxels.push({ x: rx, y: railY + 2, z: tz, paletteId: 8 });
    voxels.push({ x: rx + 1, y: railY + 2, z: tz, paletteId: 8 });
  }

  // Headlights & Taillights on Maglev
  voxels.push({ x: center - 3, y: railY + 1, z: center + 9, paletteId: 4 });
  voxels.push({ x: center - 2, y: railY + 1, z: center + 9, paletteId: 4 });
  voxels.push({ x: center - 3, y: railY + 1, z: center - 9, paletteId: 5 });
  voxels.push({ x: center - 2, y: railY + 1, z: center - 9, paletteId: 5 });

  return {
    title: "Neo-Shibuya Crossing 2099",
    dimensions: { x: gridSize, y: 54, z: gridSize },
    palette: [
      { id: 1, name: "Wet Asphalt Surface", color: "#0a0d14", roughness: 0.1, emissive: false },
      { id: 2, name: "Neon Crossing Markings", color: "#38bdf8", roughness: 0.2, emissive: true, animated: false },
      { id: 3, name: "Dark Carbon Composite Frame", color: "#0f172a", roughness: 0.6, emissive: false },
      { id: 4, name: "Holo-Matrix Cyan Billboard", color: "#00f0ff", roughness: 0.1, emissive: true, animated: false },
      { id: 5, name: "Neon Magenta Ad Display", color: "#f43f5e", roughness: 0.1, emissive: true, animated: false },
      { id: 6, name: "Amber Commercial Light Strips", color: "#f59e0b", roughness: 0.2, emissive: true, animated: false },
      { id: 7, name: "Maglev Rail System", color: "#475569", roughness: 0.4, emissive: false },
      { id: 8, name: "Maglev Transit Train", color: "#ec4899", roughness: 0.15, emissive: true, animated: true },
      { id: 9, name: "Skybridge Reinforced Glass", color: "#0284c7", roughness: 0.1, emissive: true, animated: false },
      { id: 10, name: "Street-Level Cyber Glowline", color: "#10b981", roughness: 0.2, emissive: true, animated: false },
    ],
    voxels,
  };
}