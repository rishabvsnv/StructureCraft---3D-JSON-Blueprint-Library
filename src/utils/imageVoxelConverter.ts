export interface HeightmapOptions {
  maxGridSize: number; // e.g., 48 (maps to width/depth)
  maxHeight: number;   // e.g., 18 (vertical elevation)
  smoothBase?: boolean;
}

export interface PixelArtOptions {
  maxGridSize: number; // e.g., 32
  extrudeDepth: number; // e.g., 2
}

interface GeneratedBlueprint {
  title: string;
  palette: Array<{
    id: number;
    name: string;
    color: string;
    roughness?: number;
    metalness?: number;
    emissive?: boolean;
  }>;
  voxels: Array<{
    x: number;
    y: number;
    z: number;
    paletteId: number;
  }>;
}

// Convert RGB to a clean Hex string
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

// 1. Process Heightmap / Grayscale Topography
export async function convertHeightmapToVoxels(
  file: File,
  options: HeightmapOptions
): Promise<GeneratedBlueprint> {
  const { maxGridSize, maxHeight } = options;
  const img = await loadImageFromFile(file);

  // Maintain aspect ratio while bounding inside maxGridSize
  const { width, height } = computeFittedDimensions(img.width, img.height, maxGridSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas context");

  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height).data;

  // Elevation-stratified natural palette
  const palette = [
    { id: 1, name: "Deep Water", color: "#1e3a8a", roughness: 0.2, metalness: 0.1 },
    { id: 2, name: "Coastal Sand", color: "#fde047", roughness: 0.9, metalness: 0.0 },
    { id: 3, name: "Fertile Grass", color: "#16a34a", roughness: 0.8, metalness: 0.0 },
    { id: 4, name: "Forest Bed", color: "#15803d", roughness: 0.85, metalness: 0.0 },
    { id: 5, name: "Highland Rock", color: "#475569", roughness: 0.95, metalness: 0.1 },
    { id: 6, name: "Mountain Peak Snow", color: "#f8fafc", roughness: 0.4, metalness: 0.0 },
  ];

  const voxels: Array<{ x: number; y: number; z: number; paletteId: number }> = [];

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const idx = (z * width + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a < 32) continue; // Ignore transparent pixels

      // Perceptual relative luminance: 0.299R + 0.587G + 0.114B
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const targetY = Math.max(1, Math.round(luminance * maxHeight));

      for (let y = 0; y <= targetY; y++) {
        // Biome categorization based on altitude ratio
        const ratio = y / maxHeight;
        let paletteId = 3;

        if (ratio < 0.12) paletteId = 1; // Water
        else if (ratio < 0.22) paletteId = 2; // Sand
        else if (ratio < 0.5) paletteId = 3; // Grass
        else if (ratio < 0.7) paletteId = 4; // Forest
        else if (ratio < 0.88) paletteId = 5; // Mountain Rock
        else paletteId = 6; // Snow

        voxels.push({ x, y, z, paletteId });
      }
    }
  }

  return {
    title: `Terrain_${file.name.replace(/\.[^/.]+$/, "")}`,
    palette,
    voxels,
  };
}

// 2. Process Pixel Art / Extruded 2D Sprite
export async function convertPixelArtToVoxels(
  file: File,
  options: PixelArtOptions
): Promise<GeneratedBlueprint> {
  const { maxGridSize, extrudeDepth } = options;
  const img = await loadImageFromFile(file);

  const { width, height } = computeFittedDimensions(img.width, img.height, maxGridSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas context");

  ctx.imageSmoothingEnabled = false; // Preserve crisp pixel-art edges
  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height).data;

  const colorMap = new Map<string, number>();
  const palette: GeneratedBlueprint["palette"] = [];
  const voxels: GeneratedBlueprint["voxels"] = [];
  let nextPaletteId = 1;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = (row * width + col) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a < 128) continue; // Cut out transparent background

      // Quantize to step of 16 to consolidate near-identical colors into unified swatches
      const qR = Math.round(r / 16) * 16;
      const qG = Math.round(g / 16) * 16;
      const qB = Math.round(b / 16) * 16;
      const hex = rgbToHex(Math.min(255, qR), Math.min(255, qG), Math.min(255, qB));

      let pId = colorMap.get(hex);
      if (!pId) {
        pId = nextPaletteId++;
        colorMap.set(hex, pId);
        palette.push({
          id: pId,
          name: `Color_${pId}`,
          color: hex,
          roughness: 0.6,
          metalness: 0.1,
        });
      }

      // Invert row index so image renders right-side-up along the Y axis
      const vx = col;
      const vy = height - 1 - row;

      for (let depth = 0; depth < extrudeDepth; depth++) {
        voxels.push({ x: vx, y: vy, z: depth, paletteId: pId });
      }
    }
  }

  return {
    title: `PixelArt_${file.name.replace(/\.[^/.]+$/, "")}`,
    palette,
    voxels,
  };
}

// Helper: Asynchronously load File into an HTMLImageElement
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Helper: Scale proportions to stay within bounds
function computeFittedDimensions(
  w: number,
  h: number,
  maxSize: number
): { width: number; height: number } {
  if (w <= maxSize && h <= maxSize) return { width: w, height: h };
  const aspect = w / h;
  if (aspect >= 1) {
    return { width: maxSize, height: Math.max(1, Math.round(maxSize / aspect)) };
  } else {
    return { width: Math.max(1, Math.round(maxSize * aspect)), height: maxSize };
  }
}