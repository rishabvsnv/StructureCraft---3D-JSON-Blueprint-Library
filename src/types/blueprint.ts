import { z } from "zod";

export const PaletteItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color"),
  roughness: z.number().min(0).max(1).optional().default(0.4),
  emissive: z.boolean().optional().default(false),   // Enables bloom glow
  animated: z.boolean().optional().default(false),   // Enables rotation animation
});

export const VoxelCoordinateSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  paletteId: z.number().int(),
});

export const BlueprintSchema = z.object({
  title: z.string().min(1),
  dimensions: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  palette: z.array(PaletteItemSchema),
  voxels: z.array(VoxelCoordinateSchema),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
export type PaletteItem = z.infer<typeof PaletteItemSchema>;