export function generateRomanColosseum(radius = 12, height = 10) {
  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];
  const centerX = radius;
  const centerZ = radius;

  for (let y = 0; y < height; y++) {
    const isArchedLevel = y % 3 === 1;
    const tierRadius = radius - Math.floor(y / 4);

    for (let angle = 0; angle < 360; angle += 4) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(centerX + tierRadius * Math.cos(rad));
      const z = Math.round(centerZ + tierRadius * Math.sin(rad));

      // Skip blocks periodically to form classical arched colonnades
      if (isArchedLevel && angle % 20 < 8) continue;

      let paletteId = 1;
      if (y === 0) paletteId = 2;
      if (y === height - 1) paletteId = 3;

      voxels.push({ x, y, z, paletteId });
    }
  }

  return {
    title: "Parametric Roman Colosseum",
    dimensions: { x: radius * 2 + 1, y: height, z: radius * 2 + 1 },
    palette: [
      { id: 1, name: "Roman Travertine", color: "#e5e0d8", roughness: 0.7 },
      { id: 2, name: "Basalt Foundation", color: "#2d3748", roughness: 0.9 },
      { id: 3, name: "Gilded Cornice", color: "#d97706", roughness: 0.2 },
    ],
    voxels,
  };
}