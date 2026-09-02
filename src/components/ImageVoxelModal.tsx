"use client";

import React, { useState, useRef } from "react";
import {
  convertHeightmapToVoxels,
  convertPixelArtToVoxels,
} from "@/utils/imageVoxelConverter";

interface ImageVoxelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStructure: (blueprint: object) => void;
}

export default function ImageVoxelModal({
  isOpen,
  onClose,
  onLoadStructure,
}: ImageVoxelModalProps) {
  const [activeMode, setActiveMode] = useState<"heightmap" | "pixelart">("heightmap");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(48);
  const [maxHeight, setMaxHeight] = useState(16);
  const [extrudeDepth, setExtrudeDepth] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      let blueprint;
      if (activeMode === "heightmap") {
        blueprint = await convertHeightmapToVoxels(selectedFile, {
          maxGridSize: gridSize,
          maxHeight: maxHeight,
        });
      } else {
        blueprint = await convertPixelArtToVoxels(selectedFile, {
          maxGridSize: gridSize,
          extrudeDepth: extrudeDepth,
        });
      }

      onLoadStructure(blueprint);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to convert image to voxels. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)", zIndex: 1050 }}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-dialog-centered modal-md">
        <div className="modal-content bg-dark border-secondary text-light shadow-lg">
          <div className="modal-header border-secondary py-2 px-3 d-flex justify-content-between align-items-center">
            <h6 className="modal-title fw-bold text-info mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-image"></i> Image & Terrain Generator
            </h6>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={isProcessing}
            ></button>
          </div>

          <div className="modal-body p-3">
            {/* Mode Switcher */}
            <div className="btn-group btn-group-sm w-100 mb-3">
              <button
                className={`btn ${activeMode === "heightmap" ? "btn-info text-dark fw-bold" : "btn-outline-secondary"}`}
                onClick={() => setActiveMode("heightmap")}
              >
                <i className="bi bi-geo-alt-fill me-1"></i> Topography Heightmap
              </button>
              <button
                className={`btn ${activeMode === "pixelart" ? "btn-info text-dark fw-bold" : "btn-outline-secondary"}`}
                onClick={() => setActiveMode("pixelart")}
              >
                <i className="bi bi-grid-3x3-gap-fill me-1"></i> Pixel Art Extruder
              </button>
            </div>

            {/* Upload Drag/Click Zone */}
            <div
              className="border border-secondary border-dashed rounded p-3 text-center mb-3 cursor-pointer bg-black bg-opacity-40"
              style={{ borderStyle: "dashed" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="d-none"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <div className="d-flex flex-column align-items-center gap-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="rounded border border-secondary"
                    style={{ maxHeight: "110px", maxWidth: "100%", objectFit: "contain" }}
                  />
                  <small className="text-info">{selectedFile?.name}</small>
                </div>
              ) : (
                <div className="py-2">
                  <i className="bi bi-cloud-arrow-up text-secondary fs-2"></i>
                  <p className="small text-secondary mb-0">
                    Click to browse PNG, JPG, or WebP
                  </p>
                </div>
              )}
            </div>

            {/* Config Sliders */}
            <div className="mb-2">
              <div className="d-flex justify-content-between">
                <label className="form-label small text-secondary mb-0">Grid Resolution</label>
                <small className="text-info font-monospace">{gridSize}x{gridSize}</small>
              </div>
              <input
                type="range"
                className="form-range"
                min="16"
                max="64"
                step="4"
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value))}
              />
            </div>

            {activeMode === "heightmap" ? (
              <div className="mb-2">
                <div className="d-flex justify-content-between">
                  <label className="form-label small text-secondary mb-0">Max Elevation Height</label>
                  <small className="text-info font-monospace">{maxHeight} blocks</small>
                </div>
                <input
                  type="range"
                  className="form-range"
                  min="4"
                  max="32"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(parseInt(e.target.value))}
                />
              </div>
            ) : (
              <div className="mb-2">
                <div className="d-flex justify-content-between">
                  <label className="form-label small text-secondary mb-0">Extrusion Depth</label>
                  <small className="text-info font-monospace">{extrudeDepth} blocks</small>
                </div>
                <input
                  type="range"
                  className="form-range"
                  min="1"
                  max="8"
                  value={extrudeDepth}
                  onChange={(e) => setExtrudeDepth(parseInt(e.target.value))}
                />
              </div>
            )}
          </div>

          <div className="modal-footer border-secondary py-2 px-3 d-flex justify-content-between">
            <small className="text-secondary" style={{ fontSize: "11px" }}>
              {activeMode === "heightmap"
                ? "Luminance controls terrain altitude."
                : "Colors auto-quantize into discrete swatches."}
            </small>
            <button
              className="btn btn-info btn-sm fw-bold px-3"
              disabled={!selectedFile || isProcessing}
              onClick={handleGenerate}
            >
              {isProcessing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Compiling...
                </>
              ) : (
                "Generate Voxels"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}