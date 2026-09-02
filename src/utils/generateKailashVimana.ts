// src/utils/generateKailashVimana.ts
export function generateKailashVimana() {
  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];

  const gridSize = 51;
  const center = 25;
  const islandSurfaceY = 18;

  // Palette:
  // 1: Emerald Celestial Moss (#15803d)
  // 2: Weathered Basalt Crag (#1e293b)
  // 3: Jagged Void Obsidian (#0f172a)
  // 4: Ancient Chiseled Sandstone (#b45309)
  // 5: Gilded Kalash Spire (#fbbf24 - emissive)
  // 6: Cascading Celestial Torrent (#06b6d4 - emissive)
  // 7: Levitation Aether Ring (#38bdf8 - emissive + animated)
  // 8: Gravitational Singularity Spark (#d946ef - emissive + animated)
  // 9: Forged Sky Anchor Chain (#64748b)
  // 10: Inner Sanctum Shadow Void (#020617)

  // 1. Inverted Organic Floating Crag (3D Multi-Frequency Noise)
  for (let y = 2; y <= islandSurfaceY; y++) {
    const t = (y - 2) / (islandSurfaceY - 2); // 0.0 to 1.0 (bottom to top)
    const baseRadius = 3.0 + Math.pow(t, 0.75) * 19.5;

    for (let x = center - 24; x <= center + 24; x++) {
      for (let z = center - 24; z <= center + 24; z++) {
        const dist = Math.hypot(x - center, z - center);

        // Harmonic noise for natural stalactite crags
        const angle = Math.atan2(z - center, x - center);
        const noise =
          Math.sin(angle * 5 + y * 0.7) * 2.2 +
          Math.cos(angle * 3 - y * 0.5) * 1.8 +
          Math.sin(x * 0.9 + y * 1.2) * 1.0 +
          Math.cos(z * 0.9 - y * 1.2) * 1.0;

        const dynamicR = baseRadius + noise;

        if (dist <= dynamicR) {
          if (y === islandSurfaceY) {
            // Plateau rim vs fertile moss courtyard
            const isBorder = dist >= dynamicR - 1.8;
            voxels.push({ x, y, z, paletteId: isBorder ? 4 : 1 });
          } else if (y >= islandSurfaceY - 3) {
            voxels.push({ x, y, z, paletteId: 2 }); // Weathered basalt shelf
          } else {
            voxels.push({ x, y, z, paletteId: 3 }); // Obsidian core
          }
        }
      }
    }
  }

  // 2. Suspended Void Anchor Chains (Dangling down into the abyss)
  const chainAnchors = [
    { x: center - 18, z: center - 5 },
    { x: center + 18, z: center + 6 },
    { x: center - 6, z: center + 18 },
    { x: center + 7, z: center - 18 },
  ];

  for (const { x, z } of chainAnchors) {
    for (let y = islandSurfaceY - 2; y >= 0; y--) {
      // Alternating chain link pattern
      const isCross = (y % 2 === 0);
      voxels.push({ x, y, z, paletteId: 9 });
      if (isCross) {
        voxels.push({ x: x + 1, y, z, paletteId: 9 });
        voxels.push({ x: x - 1, y, z, paletteId: 9 });
      } else {
        voxels.push({ x, y, z: z + 1, paletteId: 9 });
        voxels.push({ x, y, z: z - 1, paletteId: 9 });
      }
    }
  }

  // 3. Multi-Tier Rotating Levitation Propulsion Rings (Sub-Island)
  const ring1Radius = 9.5;
  const ring2Radius = 14.0;

  for (let angle = 0; angle < 360; angle += 4) {
    const rad = (angle * Math.PI) / 180;

    // Inner High-Density Rune Ring
    const rx1 = Math.round(center + ring1Radius * Math.cos(rad));
    const rz1 = Math.round(center + ring1Radius * Math.sin(rad));
    voxels.push({ x: rx1, y: 5, z: rz1, paletteId: 7 });

    // Outer Orbiting Energy Ring
    if (angle % 8 === 0) {
      const rx2 = Math.round(center + ring2Radius * Math.cos(rad));
      const rz2 = Math.round(center + ring2Radius * Math.sin(rad));
      voxels.push({ x: rx2, y: 7, z: rz2, paletteId: 8 });
    }
  }

  // Floating Graviton Singularity at the very nadir tip
  voxels.push({ x: center, y: 1, z: center, paletteId: 8 });
  voxels.push({ x: center, y: 2, z: center, paletteId: 7 });

  // 4. Cascading Void Waterfalls (Tumblers off cliffs with spray dispersal)
  const falls = [
    { x: center - 17, z: center + 3, dirX: -1, dirZ: 0 },
    { x: center + 16, z: center - 4, dirX: 1, dirZ: 0 },
    { x: center + 2, z: center - 17, dirX: 0, dirZ: -1 },
  ];

  for (const fall of falls) {
    for (let y = islandSurfaceY; y >= 0; y--) {
      const drop = (islandSurfaceY - y);
      const shiftX = Math.floor(fall.dirX * (drop / 3));
      const shiftZ = Math.floor(fall.dirZ * (drop / 3));

      voxels.push({ x: fall.x + shiftX, y, z: fall.z + shiftZ, paletteId: 6 });
      voxels.push({ x: fall.x + shiftX + 1, y, z: fall.z + shiftZ, paletteId: 6 });

      // Water mist spread near bottom
      if (y < 4 && y % 2 === 0) {
        voxels.push({ x: fall.x + shiftX - 1, y, z: fall.z + shiftZ, paletteId: 6 });
        voxels.push({ x: fall.x + shiftX, y, z: fall.z + shiftZ + 1, paletteId: 6 });
      }
    }
  }

  // 5. Grand Temple Plinth & Pillared Mandapa (Circumambulatory Path)
  const baseY = islandSurfaceY + 1;
  const plinthHalf = 13;

  for (let x = center - plinthHalf; x <= center + plinthHalf; x++) {
    for (let z = center - plinthHalf; z <= center + plinthHalf; z++) {
      // Stepped carved Jagati foundation
      voxels.push({ x, y: baseY, z, paletteId: 4 });
      voxels.push({ x, y: baseY + 1, z, paletteId: 4 });

      // Edge balustrades
      const isEdge =
        Math.abs(x - center) === plinthHalf ||
        Math.abs(z - center) === plinthHalf;
      if (isEdge) {
        voxels.push({ x, y: baseY + 2, z, paletteId: 4 });
      }
    }
  }

  // Pillared Hypostyle Walkway (Free-standing carved stone pillars)
  for (let x = center - plinthHalf + 2; x <= center + plinthHalf - 2; x += 3) {
    for (let z = center - plinthHalf + 2; z <= center + plinthHalf - 2; z += 3) {
      // Don't place pillars inside the inner sanctum core
      if (Math.abs(x - center) > 7 || Math.abs(z - center) > 7) {
        for (let py = baseY + 2; py <= baseY + 5; py++) {
          voxels.push({ x, y: py, z, paletteId: 4 });
        }
        // Capital beam block
        voxels.push({ x, y: baseY + 6, z, paletteId: 4 });
      }
    }
  }

  // 6. Garbhagriha (Inner Sanctum) Walls & Shadow Cavities
  const sanctumBaseY = baseY + 2;
  const sHalf = 7;

  for (let y = sanctumBaseY; y <= sanctumBaseY + 6; y++) {
    for (let x = center - sHalf; x <= center + sHalf; x++) {
      for (let z = center - sHalf; z <= center + sHalf; z++) {
        const isWall =
          Math.abs(x - center) === sHalf ||
          Math.abs(z - center) === sHalf;

        if (isWall) {
          // East Entrance Portal (cut hollow)
          const isDoorway = (z === center + sHalf) && Math.abs(x - center) <= 2 && y <= sanctumBaseY + 4;
          if (isDoorway) {
            // Hollow portal interior
            continue;
          }
          voxels.push({ x, y, z, paletteId: (y % 2 === 0) ? 4 : 2 });
        } else if (Math.abs(x - center) < sHalf && Math.abs(z - center) < sHalf) {
          // Dark sacred interior void
          if (y === sanctumBaseY) {
            voxels.push({ x, y, z, paletteId: 10 });
          }
        }
      }
    }
  }

  // 7. Multi-Tier Dravidian Vimana / Nagara Shikhara Spire
  const spireBaseY = sanctumBaseY + 7;
  const tiers = [
    { dy: 0, r: 7, pid: 4 },
    { dy: 1, r: 7, pid: 2 },
    { dy: 2, r: 6, pid: 4 },
    { dy: 3, r: 6, pid: 2 },
    { dy: 4, r: 5, pid: 4 },
    { dy: 5, r: 5, pid: 2 },
    { dy: 6, r: 4, pid: 4 },
    { dy: 7, r: 4, pid: 2 },
    { dy: 8, r: 3, pid: 4 },
    { dy: 9, r: 3, pid: 2 },
    { dy: 10, r: 2, pid: 4 },
    { dy: 11, r: 2, pid: 2 },
  ];

  for (const { dy, r, pid } of tiers) {
    const cy = spireBaseY + dy;
    for (let x = center - r; x <= center + r; x++) {
      for (let z = center - r; z <= center + r; z++) {
        const isCorner = Math.abs(x - center) === r && Math.abs(z - center) === r;
        const isPerimeter = Math.abs(x - center) === r || Math.abs(z - center) === r;

        if (isPerimeter) {
          // Arched niche cavities (Kudu niches) in center of each face
          const isCavity = (Math.abs(x - center) === 0 || Math.abs(z - center) === 0) && dy % 2 === 1;
          voxels.push({ x, y: cy, z, paletteId: isCavity ? 10 : (isCorner ? 2 : pid) });
        }
      }
    }
  }

  // 8. Fluted Amalaka Disc & Triratna Gilded Kalash Finial
  const crowningY = spireBaseY + 12;

  // Ribbed stone Amalaka
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= 3.2 && d >= 1.0) {
        voxels.push({ x: center + dx, y: crowningY, z: center + dz, paletteId: 4 });
      }
    }
  }
  voxels.push({ x: center, y: crowningY, z: center, paletteId: 4 });

  // Triple-bulb Golden Kalash Spire
  for (let sy = 1; sy <= 5; sy++) {
    voxels.push({ x: center, y: crowningY + sy, z: center, paletteId: 5 });
  }
  // Kalash Cross Flange
  voxels.push({ x: center + 1, y: crowningY + 3, z: center, paletteId: 5 });
  voxels.push({ x: center - 1, y: crowningY + 3, z: center, paletteId: 5 });
  voxels.push({ x: center, y: crowningY + 3, z: center + 1, paletteId: 5 });
  voxels.push({ x: center, y: crowningY + 3, z: center - 1, paletteId: 5 });

  // 9. Four Corner Panchayatana Subsidiary Shrines
  const shrines = [
    { x: center - 10, z: center - 10 },
    { x: center + 10, z: center - 10 },
    { x: center - 10, z: center + 10 },
    { x: center + 10, z: center + 10 },
  ];

  for (const { x: sx, z: sz } of shrines) {
    // Miniature pyramidal tower
    for (let y = 0; y <= 5; y++) {
      const w = y > 3 ? 0 : 1;
      for (let dx = -w; dx <= w; dx++) {
        for (let dz = -w; dz <= w; dz++) {
          voxels.push({ x: sx + dx, y: baseY + 2 + y, z: sz + dz, paletteId: 4 });
        }
      }
    }
    // Gilded mini kalash
    voxels.push({ x: sx, y: baseY + 8, z: sz, paletteId: 5 });
  }

  return {
    title: "Vimana Sanctum of Kailash (Celestial Edition)",
    dimensions: { x: gridSize, y: crowningY + 7, z: gridSize },
    palette: [
      { id: 1, name: "Celestial Moss Turf", color: "#15803d", roughness: 0.9, emissive: false },
      { id: 2, name: "Weathered Basalt Shelf", color: "#475569", roughness: 0.7, emissive: false },
      { id: 3, name: "Jagged Void Obsidian", color: "#0f172a", roughness: 0.95, emissive: false },
      { id: 4, name: "Chiseled Sacred Sandstone", color: "#d97706", roughness: 0.5, emissive: false },
      { id: 5, name: "Gilded Kalash Spire", color: "#f59e0b", roughness: 0.15, emissive: true, animated: false },
      { id: 6, name: "Cascading Celestial Torrent", color: "#00e5ff", roughness: 0.1, emissive: true, animated: false },
      { id: 7, name: "Levitation Aether Ring", color: "#38bdf8", roughness: 0.1, emissive: true, animated: true },
      { id: 8, name: "Graviton Singularity Core", color: "#ec4899", roughness: 0.1, emissive: true, animated: true },
      { id: 9, name: "Forged Sky Anchor Chain", color: "#94a3b8", roughness: 0.4, emissive: false },
      { id: 10, name: "Inner Sanctum Shadow Void", color: "#020617", roughness: 1.0, emissive: false },
    ],
    voxels,
  };
}