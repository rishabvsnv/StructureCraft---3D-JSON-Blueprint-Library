"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import VoxelCanvas, { VoxelCanvasHandle, SelectedVoxelInfo } from "./VoxelCanvas";
import { generateSciFiPortal } from "@/utils/generatePortal";
import { generateRomanColosseum } from "@/utils/generateColosseum";
import { generateCyberSkyscraper } from "@/utils/generateSkyscraper";
import { downloadJson, exportToGLTF } from "@/utils/exportUtils";
import {
  getSavedBlueprints,
  saveBlueprintToStorage,
  deleteBlueprintFromStorage,
  SavedBlueprintItem,
} from "@/utils/storageUtils";

export default function Workspace() {
  const [jsonCode, setJsonCode] = useState("");
  const [compilerOutput, setCompilerOutput] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"presets" | "saved">("presets");

  // Local storage blueprints
  const [savedList, setSavedList] = useState<SavedBlueprintItem[]>([]);
  const [saveTitleInput, setSaveTitleInput] = useState("");

  // Playback & Inspector
  const [buildProgress, setBuildProgress] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoxel, setSelectedVoxel] = useState<SelectedVoxelInfo | null>(null);

  const canvasRef = useRef<VoxelCanvasHandle | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const loadStructure = (dataObject: object) => {
    const formatted = JSON.stringify(dataObject, null, 2);
    setJsonCode(formatted);
    workerRef.current?.postMessage({ jsonString: formatted });
    setBuildProgress(1.0);
    setIsPlaying(false);
    setSelectedVoxel(null);
    setShowModal(false);
  };

  useEffect(() => {
    setSavedList(getSavedBlueprints());

    workerRef.current = new Worker("/compiler.worker.js");
    workerRef.current.onmessage = (e) => {
      if (e.data.status === "success") {
        setCompilerOutput(e.data);
        setErrorStatus(null);
      } else {
        setErrorStatus(e.data.message);
      }
    };

    loadStructure(generateSciFiPortal(9, 3));

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBuildProgress((prev) => {
        if (prev >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return Math.min(1.0, prev + 0.02);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSaveToStorage = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      const updated = saveBlueprintToStorage(saveTitleInput, parsed);
      setSavedList(updated);
      setSaveTitleInput("");
      alert("Blueprint saved to browser storage!");
    } catch {
      alert("Please fix JSON syntax errors before saving.");
    }
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteBlueprintFromStorage(id);
    setSavedList(updated);
  };

  const handleExportJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      downloadJson(parsed, `${parsed.title?.toLowerCase().replace(/\s+/g, "_") || "structure"}.json`);
    } catch {
      alert("Please fix JSON syntax errors before exporting.");
    }
  };

  const handleExportGLTF = () => {
    if (!compilerOutput) return;
    exportToGLTF(compilerOutput, "structure.gltf");
  };

  return (
    <div className="d-flex flex-column vh-100 bg-black">
      {/* Navbar Header */}
      <nav className="navbar navbar-expand navbar-dark bg-dark border-bottom border-secondary px-3 py-2">
        <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-boxes text-primary fs-4"></i>
            <span className="navbar-brand fw-bold mb-0 fs-6">StructureCraft</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-folder2-open"></i> Blueprint Library
            </button>

            <button
              className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
              onClick={handleSaveToStorage}
            >
              <i className="bi bi-bookmark-plus"></i> Save
            </button>

            <div className="btn-group">
              <button
                className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
                onClick={handleExportJson}
              >
                <i className="bi bi-download"></i> JSON
              </button>
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                onClick={handleExportGLTF}
              >
                <i className="bi bi-file-earmark-code"></i> GLTF
              </button>
            </div>

            {errorStatus ? (
              <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2 ms-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> {errorStatus}
              </span>
            ) : (
              <span className="badge bg-success-subtle text-success border border-success px-3 py-2 ms-2">
                <i className="bi bi-check-circle-fill me-1"></i> Compiled
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Split View */}
      <div className="container-fluid flex-grow-1 p-0 overflow-hidden">
        <div className="row g-0 h-100">
          {/* Left: Code Editor */}
          <div className="col-12 col-lg-6 d-flex flex-column border-end border-secondary h-100">
            <div className="flex-grow-1">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={jsonCode}
                onChange={(val) => {
                  setJsonCode(val || "{}");
                  workerRef.current?.postMessage({ jsonString: val || "{}" });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {/* Right: 3D Viewport with Toolbar & Inspector Overlay */}
          <div className="col-12 col-lg-6 d-flex flex-column bg-black h-100 position-relative">
            {/* Viewport Top Bar */}
            <div className="bg-dark bg-opacity-75 px-3 py-2 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.setCameraView("iso")}
                  title="Isometric"
                >
                  <i className="bi bi-bounding-box me-1"></i> Iso
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.setCameraView("top")}
                  title="Top View"
                >
                  <i className="bi bi-arrow-down-square me-1"></i> Top
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.setCameraView("front")}
                  title="Front View"
                >
                  <i className="bi bi-aspect-ratio me-1"></i> Front
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.resetCamera()}
                  title="Reset Camera"
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  className={`btn btn-sm ${isPlaying ? "btn-danger" : "btn-primary"} px-2 py-0`}
                  onClick={() => {
                    if (buildProgress >= 1.0) setBuildProgress(0);
                    setIsPlaying(!isPlaying);
                  }}
                >
                  <i className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}></i>
                </button>
                <input
                  type="range"
                  className="form-range"
                  style={{ width: "120px" }}
                  min="0"
                  max="1"
                  step="0.01"
                  value={buildProgress}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setBuildProgress(parseFloat(e.target.value));
                  }}
                />
                <small className="text-secondary font-monospace" style={{ minWidth: "38px" }}>
                  {Math.round(buildProgress * 100)}%
                </small>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div className="flex-grow-1 position-relative w-100 h-100">
              <VoxelCanvas
                ref={canvasRef}
                compilerData={compilerOutput}
                buildProgress={buildProgress}
                onSelectVoxel={(info) => setSelectedVoxel(info)}
              />

              {/* Block Inspector Badge Overlay */}
              {selectedVoxel && (
                <div
                  className="position-absolute bottom-0 start-0 m-3 p-3 rounded bg-dark border border-secondary shadow-lg text-light"
                  style={{ minWidth: "220px", zIndex: 10, backdropFilter: "blur(6px)", backgroundColor: "rgba(18,20,24,0.85)" }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-secondary">
                    <small className="fw-bold text-uppercase text-secondary font-monospace">
                      <i className="bi bi-crosshair me-1"></i> Voxel Inspector
                    </small>
                    <button
                      className="btn-close btn-close-white"
                      style={{ fontSize: "9px" }}
                      onClick={() => setSelectedVoxel(null)}
                    ></button>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span
                      className="d-inline-block rounded-circle"
                      style={{ width: "12px", height: "12px", backgroundColor: selectedVoxel.paletteColor }}
                    />
                    <span className="fw-semibold small">{selectedVoxel.paletteName}</span>
                  </div>
                  <div className="text-secondary font-monospace small">
                    Position: <span className="text-light">X:{selectedVoxel.x} Y:{selectedVoxel.y} Z:{selectedVoxel.z}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blueprint Library Modal (Presets & LocalStorage) */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)" }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border-secondary text-light">
              <div className="modal-header border-secondary d-flex justify-content-between align-items-center">
                <ul className="nav nav-pills">
                  <li className="nav-item">
                    <button
                      className={`nav-link py-1 px-3 ${modalTab === "presets" ? "active" : "text-light"}`}
                      onClick={() => setModalTab("presets")}
                    >
                      <i className="bi bi-box-seam me-1"></i> Stock Presets
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link py-1 px-3 ${modalTab === "saved" ? "active" : "text-light"}`}
                      onClick={() => setModalTab("saved")}
                    >
                      <i className="bi bi-bookmark-check me-1"></i> My Saved ({savedList.length})
                    </button>
                  </li>
                </ul>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>

              <div className="modal-body">
                {modalTab === "presets" ? (
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-info fw-bold mb-1">
                          <i className="bi bi-radioactive me-1"></i> Sci-Fi Portal
                        </h6>
                        <p className="text-secondary small mb-3">Gateway with rotating quantum event horizon.</p>
                        <button className="btn btn-info btn-sm mt-auto" onClick={() => loadStructure(generateSciFiPortal(9, 3))}>
                          Load Portal
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-warning fw-bold mb-1">
                          <i className="bi bi-bank me-1"></i> Colosseum
                        </h6>
                        <p className="text-secondary small mb-3">Parametric Roman amphitheater with classical arched tiers.</p>
                        <button className="btn btn-warning btn-sm mt-auto" onClick={() => loadStructure(generateRomanColosseum(11, 9))}>
                          Load Colosseum
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-danger fw-bold mb-1">
                          <i className="bi bi-building me-1"></i> Cyber Tower
                        </h6>
                        <p className="text-secondary small mb-3">Multi-tiered skyscraper with neon office windows.</p>
                        <button className="btn btn-danger btn-sm mt-auto" onClick={() => loadStructure(generateCyberSkyscraper(16, 7))}>
                          Load Skyscraper
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {savedList.length === 0 ? (
                      <div className="text-center py-5 text-secondary">
                        <i className="bi bi-folder-x fs-1 mb-2 d-block"></i>
                        No custom blueprints saved yet. Click the <strong>Save</strong> button in the top bar to store your current structure!
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {savedList.map((item) => (
                          <div
                            key={item.id}
                            className="list-group-item bg-black border-secondary text-light d-flex justify-content-between align-items-center mb-2 rounded"
                          >
                            <div>
                              <h6 className="mb-0 fw-bold text-primary">{item.name}</h6>
                              <small className="text-secondary">Saved on {item.savedAt}</small>
                            </div>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => loadStructure(item.data)}>
                                Load
                              </button>
                              <button className="btn btn-outline-danger btn-sm" onClick={(e) => handleDeleteSaved(item.id, e)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}