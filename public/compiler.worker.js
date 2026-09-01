self.onmessage = function (e) {
  const { jsonString } = e.data;

  try {
    const data = JSON.parse(jsonString);

    if (!data.voxels || !Array.isArray(data.voxels)) {
      throw new Error("Missing or invalid 'voxels' array in JSON.");
    }
    if (!data.palette || !Array.isArray(data.palette)) {
      throw new Error("Missing or invalid 'palette' array in JSON.");
    }

    const paletteGroups = {};
    for (let i = 0; i < data.palette.length; i++) {
      paletteGroups[data.palette[i].id] = [];
    }

    for (let i = 0; i < data.voxels.length; i++) {
      const v = data.voxels[i];
      if (!paletteGroups[v.paletteId]) {
        paletteGroups[v.paletteId] = [];
      }
      paletteGroups[v.paletteId].push(v.x, v.y, v.z);
    }

    self.postMessage({
      status: "success",
      groups: paletteGroups,
      palette: data.palette,
      dimensions: data.dimensions || { x: 10, y: 10, z: 10 },
    });
  } catch (err) {
    self.postMessage({
      status: "error",
      message: err.message || "Invalid JSON structure",
    });
  }
};