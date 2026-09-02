// src/utils/generateTajMahal.ts
export function generateTajMahal() {
  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];

  const gridSize = 47;
  const center = 23;
  const plinthHalf = 19;
  const tombHalf = 11;

  // Palette:
  // 1: Makrana Polished Marble
  // 2: Carved Marble Frieze & Pilaster Relinquish
  // 3: Pietra Dura Black Onyx & Jade Floral Inlay
  // 4: Red Sandstone Garden Terrace
  // 5: Gilded Brass Kalash Finial (Emissive)
  // 6: Cerulean Water Channel (Emissive Water)
  // 7: Charbagh Cypress Foliage
  // 8: Deep Cavity Shadow Void

  // 1. Red Sandstone Base Terrace & Symmetrical Garden
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      voxels.push({ x, y: 0, z, paletteId: 4 });

      // Water channel crossroads (Charbagh axial symmetry)
      const isWaterZ = z <= center - plinthHalf && x >= center - 2 && x <= center + 2;
      const isWaterX = x <= center - plinthHalf && z >= center - 2 && z <= center + 2;
      if (isWaterZ || isWaterX) {
        voxels.push({ x, y: 1, z, paletteId: 6 });
      }
    }
  }

  // Garden Cypress Trees along the reflecting pool
  const treeOffsets = [
    { x: center - 4, z: 4 }, { x: center + 4, z: 4 },
    { x: center - 4, z: 10 }, { x: center + 4, z: 10 },
    { x: 4, z: center - 4 }, { x: 4, z: center + 4 },
    { x: 10, z: center - 4 }, { x: 10, z: center + 4 },
  ];
  for (const { x, z } of treeOffsets) {
    for (let y = 1; y <= 5; y++) {
      voxels.push({ x, y, z, paletteId: 7 });
      if (y >= 2 && y <= 4) {
        voxels.push({ x: x + 1, y, z, paletteId: 7 });
        voxels.push({ x: x - 1, y, z, paletteId: 7 });
        voxels.push({ x, y, z: z + 1, paletteId: 7 });
        voxels.push({ x, y, z: z - 1, paletteId: 7 });
      }
    }
  }

  // 2. High Elevated Marble Plinth with Chamfered Corners
  const plinthY = 3;
  for (let y = 1; y <= plinthY; y++) {
    for (let x = center - plinthHalf; x <= center + plinthHalf; x++) {
      for (let z = center - plinthHalf; z <= center + plinthHalf; z++) {
        // Chamfered corners of the platform
        const cornerCheck =
          Math.abs(x - center) + Math.abs(z - center) > plinthHalf * 1.7;
        if (cornerCheck) continue;

        if (y === plinthY) {
          // Decorative border around top of plinth
          const isBorder =
            Math.abs(x - center) === plinthHalf ||
            Math.abs(z - center) === plinthHalf;
          voxels.push({ x, y, z, paletteId: isBorder ? 3 : 1 });
        } else {
          voxels.push({ x, y, z, paletteId: 2 });
        }
      }
    }
  }

  // 3. Four Giant Freestanding Tapered Minarets
  const minaretOffsets = [
    { x: center - 16, z: center - 16 },
    { x: center + 16, z: center - 16 },
    { x: center - 16, z: center + 16 },
    { x: center + 16, z: center + 16 },
  ];

  for (const { x: mx, z: mz } of minaretOffsets) {
    // Octagonal base plinth
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        voxels.push({ x: mx + dx, y: plinthY + 1, z: mz + dz, paletteId: 2 });
      }
    }

    // Three-tiered fluted shaft
    for (let y = plinthY + 2; y <= 28; y++) {
      // 3 Balconies (Chhajja rings)
      if (y === 11 || y === 19 || y === 26) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            voxels.push({ x: mx + dx, y, z: mz + dz, paletteId: 3 });
          }
        }
      } else {
        // Core circular column
        voxels.push({ x: mx, y, z: mz, paletteId: 1 });
        voxels.push({ x: mx + 1, y, z: mz, paletteId: 1 });
        voxels.push({ x: mx - 1, y, z: mz, paletteId: 1 });
        voxels.push({ x: mx, y, z: mz + 1, paletteId: 1 });
        voxels.push({ x: mx, y, z: mz - 1, paletteId: 1 });
      }
    }

    // Minaret Chattri (Domelet pavilion)
    for (let dy = 27; dy <= 29; dy++) {
      voxels.push({ x: mx + 1, y: dy, z: mz + 1, paletteId: 2 });
      voxels.push({ x: mx - 1, y: dy, z: mz + 1, paletteId: 2 });
      voxels.push({ x: mx + 1, y: dy, z: mz - 1, paletteId: 2 });
      voxels.push({ x: mx - 1, y: dy, z: mz - 1, paletteId: 2 });
    }
    voxels.push({ x: mx, y: 30, z: mz, paletteId: 1 });
    voxels.push({ x: mx, y: 31, z: mz, paletteId: 5 }); // Golden Spire
  }

  // 4. Main Tomb Body (Symmetrical Chamfered Cube with Deep Recessed Iwan Portals)
  const wallBaseY = plinthY + 1;
  const wallHeight = 15;

  for (let y = wallBaseY; y < wallBaseY + wallHeight; y++) {
    for (let x = center - tombHalf; x <= center + tombHalf; x++) {
      for (let z = center - tombHalf; z <= center + tombHalf; z++) {
        // Chamfer 45-degree outer corners
        const cornerCut =
          (x <= center - tombHalf + 2 && z <= center - tombHalf + 2) ||
          (x >= center + tombHalf - 2 && z <= center - tombHalf + 2) ||
          (x <= center - tombHalf + 2 && z >= center + tombHalf - 2) ||
          (x >= center + tombHalf - 2 && z >= center + tombHalf - 2);

        if (cornerCut) continue;

        const isPerimeter =
          x === center - tombHalf ||
          x === center + tombHalf ||
          z === center - tombHalf ||
          z === center + tombHalf;

        if (isPerimeter) {
          // Giant Grand Pishtaq (Center Arches on all 4 faces)
          const isMainArchX = (x === center - tombHalf || x === center + tombHalf) && Math.abs(z - center) <= 5;
          const isMainArchZ = (z === center - tombHalf || z === center + tombHalf) && Math.abs(x - center) <= 5;

          if ((isMainArchX || isMainArchZ) && y < wallBaseY + 12) {
            // Cut open vault portal
            continue;
          }

          // Top battlement parapet & calligraphy border
          if (y === wallBaseY + wallHeight - 1) {
            voxels.push({ x, y, z, paletteId: 3 }); // Pietra dura border
          } else if (y % 4 === 0) {
            voxels.push({ x, y, z, paletteId: 2 });
          } else {
            voxels.push({ x, y, z, paletteId: 1 });
          }
        }
      }
    }
  }

  // Deep recessed back walls and inner screens for all 4 arched portals
  for (let y = wallBaseY; y < wallBaseY + 12; y++) {
    for (let offset = -4; offset <= 4; offset++) {
      // Recessed depth (3 voxels deep)
      voxels.push({ x: center - tombHalf + 3, y, z: center + offset, paletteId: 8 }); // Deep shadow cavity
      voxels.push({ x: center + tombHalf - 3, y, z: center + offset, paletteId: 8 });
      voxels.push({ x: center + offset, y, z: center - tombHalf + 3, paletteId: 8 });
      voxels.push({ x: center + offset, y, z: center + tombHalf - 3, paletteId: 8 });
    }
  }

  // 5. Roof Terrace & Four Domed Chattris
  const roofY = wallBaseY + wallHeight;
  for (let x = center - tombHalf; x <= center + tombHalf; x++) {
    for (let z = center - tombHalf; z <= center + tombHalf; z++) {
      if (Math.abs(x - center) <= tombHalf - 1 && Math.abs(z - center) <= tombHalf - 1) {
        voxels.push({ x, y: roofY, z, paletteId: 1 });
      }
    }
  }

  // 4 Roof Chattris (Surrounding the central dome)
  const chattriCenters = [
    { x: center - 7, z: center - 7 },
    { x: center + 7, z: center - 7 },
    { x: center - 7, z: center + 7 },
    { x: center + 7, z: center + 7 },
  ];
  for (const { x: cx, z: cz } of chattriCenters) {
    for (let dy = 1; dy <= 4; dy++) {
      voxels.push({ x: cx + 1, y: roofY + dy, z: cz + 1, paletteId: 2 });
      voxels.push({ x: cx - 1, y: roofY + dy, z: cz + 1, paletteId: 2 });
      voxels.push({ x: cx + 1, y: roofY + dy, z: cz - 1, paletteId: 2 });
      voxels.push({ x: cx - 1, y: roofY + dy, z: cz - 1, paletteId: 2 });
    }
    // Chattri mini dome & finial
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        voxels.push({ x: cx + dx, y: roofY + 5, z: cz + dz, paletteId: 1 });
      }
    }
    voxels.push({ x: cx, y: roofY + 6, z: cz, paletteId: 5 });
  }

  // 6. Giant Bulbous Onion Dome on High Cylindrical Drum
  const drumBaseY = roofY + 1;
  const drumRadius = 6.8;

  // High drum with arched niches
  for (let y = drumBaseY; y <= drumBaseY + 4; y++) {
    for (let x = center - 8; x <= center + 8; x++) {
      for (let z = center - 8; z <= center + 8; z++) {
        const d = Math.sqrt(Math.pow(x - center, 2) + Math.pow(z - center, 2));
        if (d <= drumRadius && d >= drumRadius - 1.2) {
          voxels.push({ x, y, z, paletteId: y % 2 === 0 ? 3 : 2 });
        }
      }
    }
  }

  // Swelling Bulbous Onion Dome Profile
  const domeBaseY = drumBaseY + 5;
  const domeSlices = [
    { dy: 0, r: 7.2 },
    { dy: 1, r: 8.0 }, // Bulges outward
    { dy: 2, r: 8.3 }, // Maximum apex swell
    { dy: 3, r: 7.8 },
    { dy: 4, r: 7.0 },
    { dy: 5, r: 5.8 },
    { dy: 6, r: 4.4 },
    { dy: 7, r: 2.8 },
    { dy: 8, r: 1.5 },
  ];

  for (const { dy, r } of domeSlices) {
    const cy = domeBaseY + dy;
    for (let x = Math.floor(center - r); x <= Math.ceil(center + r); x++) {
      for (let z = Math.floor(center - r); z <= Math.ceil(center + r); z++) {
        const dist = Math.sqrt(Math.pow(x - center, 2) + Math.pow(z - center, 2));
        if (dist <= r && dist >= r - 1.2) {
          voxels.push({ x, y: cy, z, paletteId: 1 });
        }
      }
    }
  }

  // Central Lotus Petal Crest & Golden Kalash Spire
  const spireBaseY = domeBaseY + 9;
  voxels.push({ x: center, y: spireBaseY, z: center, paletteId: 2 });
  voxels.push({ x: center, y: spireBaseY + 1, z: center, paletteId: 5 });
  voxels.push({ x: center, y: spireBaseY + 2, z: center, paletteId: 5 });
  voxels.push({ x: center, y: spireBaseY + 3, z: center, paletteId: 5 });
  voxels.push({ x: center, y: spireBaseY + 4, z: center, paletteId: 5 });

  return {
    title: "The Grand Taj Mahal (Imperial Edition)",
    dimensions: { x: gridSize, y: spireBaseY + 6, z: gridSize },
    palette: [
      { id: 1, name: "Makrana Polished Marble", color: "#f8fafc", roughness: 0.25, emissive: false },
      { id: 2, name: "Carved Architectural Relief", color: "#cbd5e1", roughness: 0.6, emissive: false },
      { id: 3, name: "Pietra Dura Onyx Inlay", color: "#334155", roughness: 0.4, emissive: false },
      { id: 4, name: "Red Sandstone Terrace", color: "#991b1b", roughness: 0.85, emissive: false },
      { id: 5, name: "Gilded Kalash Finial", color: "#f59e0b", roughness: 0.15, emissive: true, animated: false },
      { id: 6, name: "Reflecting Pool Basin", color: "#0284c7", roughness: 0.1, emissive: true, animated: false },
      { id: 7, name: "Charbagh Cypress Foliage", color: "#166534", roughness: 0.9, emissive: false },
      { id: 8, name: "Vault Cavity Shadow", color: "#0f172a", roughness: 0.95, emissive: false }
    ],
    voxels,
  };
}