"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import VoxelCanvas, {
  VoxelCanvasHandle,
  SelectedVoxelInfo,
  EnvironmentSettings,
  DroneTelemetry,
} from "./VoxelCanvas";
import RadarHUD from "./RadarHUD";
import { generateSciFiPortal } from "@/utils/generatePortal";
import { generateRomanColosseum } from "@/utils/generateColosseum";
import { generateCyberSkyscraper } from "@/utils/generateSkyscraper";
import { generateTajMahal } from "@/utils/generateTajMahal";
import { generateKailashVimana } from "@/utils/generateKailashVimana";
import { generateShibuyaCrossing } from "@/utils/generateShibuyaCrossing";
import { downloadJson, exportToGLTF } from "@/utils/exportUtils";
import {
  getSavedBlueprints,
  saveBlueprintToStorage,
  deleteBlueprintFromStorage,
  SavedBlueprintItem,
} from "@/utils/storageUtils";

const ENVIRONMENT_PRESETS: Record<string, EnvironmentSettings> = {
  space: {
    preset: "space",
    bgColor: "#08090d",
    sunAngle: 45,
    sunElevation: 50,
    sunIntensity: 0.9,
    fogDensity: 0.0,
    bloomStrength: 0.45,
  },
  sunset: {
    preset: "sunset",
    bgColor: "#291811",
    sunAngle: 120,
    sunElevation: 18,
    sunIntensity: 1.4,
    fogDensity: 0.008,
    bloomStrength: 0.6,
  },
  cyber: {
    preset: "cyber",
    bgColor: "#040914",
    sunAngle: 210,
    sunElevation: 30,
    sunIntensity: 0.6,
    fogDensity: 0.012,
    bloomStrength: 0.8,
  },
  studio: {
    preset: "studio",
    bgColor: "#1e293b",
    sunAngle: 90,
    sunElevation: 75,
    sunIntensity: 1.8,
    fogDensity: 0.0,
    bloomStrength: 0.25,
  },
};

export default function Workspace() {
  const [jsonCode, setJsonCode] = useState("");
  const [compilerOutput, setCompilerOutput] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"presets" | "saved">("presets");

  // Storage
  const [savedList, setSavedList] = useState<SavedBlueprintItem[]>([]);
  const [saveTitleInput, setSaveTitleInput] = useState("");

  // Playback & Inspector
  const [buildProgress, setBuildProgress] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoxel, setSelectedVoxel] = useState<SelectedVoxelInfo | null>(
    null,
  );

  // Live Modes
  const [sculptMode, setSculptMode] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState(1);
  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [droneTelemetry, setDroneTelemetry] = useState<DroneTelemetry | null>(
    null,
  );

  // Environment Studio State
  const [showStudioPanel, setShowStudioPanel] = useState(false);
  const [envConfig, setEnvConfig] = useState<EnvironmentSettings>(
    ENVIRONMENT_PRESETS.space,
  );

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

    if ((dataObject as any).palette?.length > 0) {
      setActivePaletteId((dataObject as any).palette[0].id);
    }
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

    loadStructure(generateShibuyaCrossing());

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const [isPointerLocked, setIsPointerLocked] = useState(false);

  const handleToggleWalkthrough = () => {
    if (!walkthroughMode) {
      setWalkthroughMode(true);
      setSculptMode(false);
      // Attempt lock immediately
      canvasRef.current?.enterFPV();
    } else {
      setWalkthroughMode(false);
      setIsPointerLocked(false);
      canvasRef.current?.exitFPV();
    }
  };

  const handleAddVoxel = (newVoxel: {
    x: number;
    y: number;
    z: number;
    paletteId: number;
  }) => {
    try {
      const parsed = JSON.parse(jsonCode);
      parsed.voxels = [...(parsed.voxels || []), newVoxel];
      const updatedCode = JSON.stringify(parsed, null, 2);
      setJsonCode(updatedCode);
      workerRef.current?.postMessage({ jsonString: updatedCode });
    } catch (err) {
      console.error("Failed to add voxel:", err);
    }
  };

  const handleDeleteVoxel = (target: { x: number; y: number; z: number }) => {
    try {
      const parsed = JSON.parse(jsonCode);
      parsed.voxels = (parsed.voxels || []).filter(
        (v: any) => !(v.x === target.x && v.y === target.y && v.z === target.z),
      );
      const updatedCode = JSON.stringify(parsed, null, 2);
      setJsonCode(updatedCode);
      workerRef.current?.postMessage({ jsonString: updatedCode });
    } catch (err) {
      console.error("Failed to delete voxel:", err);
    }
  };

  const handleSaveToStorage = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      const updated = saveBlueprintToStorage(saveTitleInput, parsed);
      setSavedList(updated);
      setSaveTitleInput("");
      alert("Blueprint saved to browser storage!");
    } catch {
      alert("Please fix JSON errors before saving.");
    }
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedList(deleteBlueprintFromStorage(id));
  };

  const handleExportJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      downloadJson(
        parsed,
        `${parsed.title?.toLowerCase().replace(/\s+/g, "_") || "structure"}.json`,
      );
    } catch {
      alert("Please fix JSON errors before exporting.");
    }
  };

  const handleExportGLTF = () => {
    if (!compilerOutput) return;
    exportToGLTF(compilerOutput, "structure.gltf");
  };

  return (
    <div className="d-flex flex-column vh-100 bg-black">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand navbar-dark bg-dark border-bottom border-secondary px-3 py-2">
        <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-boxes text-primary fs-4"></i>
            <span className="navbar-brand fw-bold mb-0 fs-6">
              StructureCraft
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Cinematic Drone Walkthrough Mode */}
            <button
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                walkthroughMode
                  ? "btn-danger fw-bold shadow"
                  : "btn-outline-info"
              }`}
              onClick={handleToggleWalkthrough}
            >
              <i
                className={`bi ${walkthroughMode ? "bi-camera-video-fill" : "bi-camera-video"}`}
              ></i>
              {walkthroughMode ? "Exit FPV Drone" : "FPV Drone"}
            </button>

            {/* Lighting Studio Toggle */}
            <button
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                showStudioPanel
                  ? "btn-warning text-dark fw-bold"
                  : "btn-outline-warning"
              }`}
              onClick={() => setShowStudioPanel(!showStudioPanel)}
            >
              <i className="bi bi-sun"></i> Studio
            </button>

            {/* Sculptor Toggle */}
            <button
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                sculptMode ? "btn-danger fw-bold" : "btn-outline-primary"
              }`}
              onClick={() => {
                setSculptMode(!sculptMode);
                if (!sculptMode) setWalkthroughMode(false);
              }}
            >
              <i
                className={`bi ${sculptMode ? "bi-hammer" : "bi-pencil-square"}`}
              ></i>
              {sculptMode ? "Sculpting" : "Sculpt"}
            </button>

            <button
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-folder2-open"></i> Presets
            </button>

            <button
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
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
                className="btn btn-outline-info btn-sm d-flex align-items-center gap-1"
                onClick={handleExportGLTF}
              >
                <i className="bi bi-file-earmark-code"></i> GLTF
              </button>
            </div>

            {errorStatus ? (
              <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2 ms-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>{" "}
                {errorStatus}
              </span>
            ) : (
              <span className="badge bg-success-subtle text-success border border-success px-3 py-2 ms-2">
                <i className="bi bi-check-circle-fill me-1"></i> Compiled
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Split Interface */}
      <div className="container-fluid flex-grow-1 p-0 overflow-hidden">
        <div className="row g-0 h-100">
          {/* Left Monaco Code Editor */}
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

          {/* Right 3D Viewport */}
          <div className="col-12 col-lg-6 d-flex flex-column bg-black h-100 position-relative">
            {/* Top Toolbar */}
            <div className="bg-dark bg-opacity-75 px-3 py-2 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={walkthroughMode}
                  onClick={() => canvasRef.current?.setCameraView("iso")}
                >
                  Iso
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={walkthroughMode}
                  onClick={() => canvasRef.current?.setCameraView("top")}
                >
                  Top
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={walkthroughMode}
                  onClick={() => canvasRef.current?.setCameraView("front")}
                >
                  Front
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.resetCamera()}
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              </div>

              {/* Build Progress Slider */}
              <div className="d-flex align-items-center gap-2">
                <button
                  className={`btn btn-sm ${isPlaying ? "btn-danger" : "btn-primary"} px-2 py-0`}
                  onClick={() => {
                    if (buildProgress >= 1.0) setBuildProgress(0);
                    setIsPlaying(!isPlaying);
                  }}
                >
                  <i
                    className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
                  ></i>
                </button>
                <input
                  type="range"
                  className="form-range"
                  style={{ width: "100px" }}
                  min="0"
                  max="1"
                  step="0.01"
                  value={buildProgress}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setBuildProgress(parseFloat(e.target.value));
                  }}
                />
              </div>
            </div>

            {/* 3D Viewport Canvas */}
            <div className="flex-grow-1 position-relative w-100 h-100">
              <VoxelCanvas
                ref={canvasRef}
                compilerData={compilerOutput}
                buildProgress={buildProgress}
                sculptMode={sculptMode}
                walkthroughMode={walkthroughMode}
                activePaletteId={activePaletteId}
                environmentConfig={envConfig}
                onWalkthroughChange={(active: boolean) => {
                  setIsPointerLocked(active);
                  if (!active && walkthroughMode) {
                    // User pressed ESC
                    setWalkthroughMode(false);
                  }
                }}
                onSelectVoxel={(info) => setSelectedVoxel(info)}
                onAddVoxel={handleAddVoxel}
                onDeleteVoxel={handleDeleteVoxel}
                onTelemetryUpdate={(telemetry) => setDroneTelemetry(telemetry)}
              />

              {/* Engagement Overlay when Walkthrough is on but pointer is not locked */}
              {walkthroughMode && !isPointerLocked && (
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center cursor-pointer"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    backdropFilter: "blur(4px)",
                    zIndex: 30,
                    cursor: "pointer",
                  }}
                  onClick={() => canvasRef.current?.enterFPV()}
                >
                  <div
                    className="card bg-dark border-info text-light p-4 shadow-lg"
                    style={{ maxWidth: "340px" }}
                  >
                    <i className="bi bi-cursor-fill text-info fs-1 mb-2"></i>
                    <h5 className="fw-bold text-info mb-1">
                      Click to Pilot Drone
                    </h5>
                    <p className="text-secondary small mb-3">
                      Clicking captures your mouse for free flight.
                    </p>
                    <div className="text-start small bg-black bg-opacity-50 p-2 rounded border border-secondary font-monospace mb-3">
                      <div>
                        <strong className="text-white">W, A, S, D</strong> : Fly
                        / Strafe
                      </div>
                      <div>
                        <strong className="text-white">Space / Shift</strong> :
                        Ascend / Descend
                      </div>
                      <div>
                        <strong className="text-white">Mouse</strong> : Look
                        Around
                      </div>
                      <div>
                        <strong className="text-white">ESC</strong> : Release
                        Mouse
                      </div>
                    </div>
                    <button className="btn btn-info btn-sm fw-bold w-100">
                      Engage Thrusters
                    </button>
                  </div>
                </div>
              )}

              {/* Walkthrough Flight HUD Controls Banner */}
              {walkthroughMode && (
                <div
                  className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 py-1 rounded-pill border border-info shadow-lg text-info d-flex align-items-center gap-3"
                  style={{
                    zIndex: 25,
                    backdropFilter: "blur(8px)",
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    fontSize: "12px",
                  }}
                >
                  <span>
                    <strong>WASD:</strong> Strafe
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Space/Shift:</strong> Elevate
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Mouse:</strong> Look
                  </span>
                  <span>•</span>
                  <span
                    className="badge bg-danger cursor-pointer"
                    onClick={handleToggleWalkthrough}
                  >
                    ESC / Exit
                  </span>
                </div>
              )}

              {/* 2D Minimap Radar HUD */}
              {walkthroughMode && compilerOutput?.dimensions && (
                <RadarHUD
                  telemetry={droneTelemetry}
                  dimensions={compilerOutput.dimensions}
                />
              )}

              {/* Lighting Studio Panel */}
              {showStudioPanel && (
                <div
                  className="position-absolute top-0 end-0 m-3 p-3 rounded bg-dark border border-secondary shadow-lg text-light"
                  style={{
                    width: "280px",
                    zIndex: 20,
                    backdropFilter: "blur(10px)",
                    backgroundColor: "rgba(15, 23, 42, 0.88)",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
                    <span className="small fw-bold text-warning text-uppercase">
                      <i className="bi bi-sliders me-1"></i> Environment Studio
                    </span>
                    <button
                      className="btn-close btn-close-white"
                      style={{ fontSize: "10px" }}
                      onClick={() => setShowStudioPanel(false)}
                    ></button>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-secondary mb-1">
                      Atmosphere Preset
                    </label>
                    <div className="btn-group btn-group-sm w-100">
                      {(["space", "sunset", "cyber", "studio"] as const).map(
                        (p) => (
                          <button
                            key={p}
                            className={`btn ${
                              envConfig.preset === p
                                ? "btn-warning text-dark fw-bold"
                                : "btn-outline-secondary"
                            }`}
                            onClick={() => setEnvConfig(ENVIRONMENT_PRESETS[p])}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between">
                      <label className="form-label small text-secondary mb-0">
                        Sun Azimuth
                      </label>
                      <small className="text-warning font-monospace">
                        {envConfig.sunAngle}°
                      </small>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="360"
                      value={envConfig.sunAngle}
                      onChange={(e) =>
                        setEnvConfig({
                          ...envConfig,
                          sunAngle: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between">
                      <label className="form-label small text-secondary mb-0">
                        Sun Elevation
                      </label>
                      <small className="text-warning font-monospace">
                        {envConfig.sunElevation}°
                      </small>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="10"
                      max="90"
                      value={envConfig.sunElevation}
                      onChange={(e) =>
                        setEnvConfig({
                          ...envConfig,
                          sunElevation: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between">
                      <label className="form-label small text-secondary mb-0">
                        Sun Intensity
                      </label>
                      <small className="text-warning font-monospace">
                        {envConfig.sunIntensity.toFixed(1)}x
                      </small>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      value={envConfig.sunIntensity}
                      onChange={(e) =>
                        setEnvConfig({
                          ...envConfig,
                          sunIntensity: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between">
                      <label className="form-label small text-secondary mb-0">
                        Fog Density
                      </label>
                      <small className="text-warning font-monospace">
                        {(envConfig.fogDensity * 1000).toFixed(0)}
                      </small>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="0.02"
                      step="0.001"
                      value={envConfig.fogDensity}
                      onChange={(e) =>
                        setEnvConfig({
                          ...envConfig,
                          fogDensity: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="mb-1">
                    <div className="d-flex justify-content-between">
                      <label className="form-label small text-secondary mb-0">
                        Bloom Glow
                      </label>
                      <small className="text-warning font-monospace">
                        {envConfig.bloomStrength.toFixed(2)}
                      </small>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="0.0"
                      max="1.5"
                      step="0.05"
                      value={envConfig.bloomStrength}
                      onChange={(e) =>
                        setEnvConfig({
                          ...envConfig,
                          bloomStrength: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Bottom Dock: Palette Swatch Selector */}
              {sculptMode && compilerOutput?.palette && (
                <div
                  className="position-absolute bottom-0 start-50 translate-middle-x mb-3 p-2 rounded-pill bg-dark border border-secondary shadow-lg d-flex align-items-center gap-2"
                  style={{
                    zIndex: 10,
                    backdropFilter: "blur(8px)",
                    backgroundColor: "rgba(18,20,24,0.9)",
                  }}
                >
                  <span className="badge text-secondary small px-2">
                    <i className="bi bi-palette me-1"></i> Block:
                  </span>
                  {compilerOutput.palette.map((item: any) => (
                    <button
                      key={item.id}
                      className={`btn p-0 rounded-circle border ${
                        activePaletteId === item.id
                          ? "border-white border-2 scale-110 shadow"
                          : "border-dark opacity-75"
                      }`}
                      style={{
                        width: "26px",
                        height: "26px",
                        backgroundColor: item.color,
                        transition: "transform 0.15s ease",
                      }}
                      title={`${item.name} (ID: ${item.id})`}
                      onClick={() => setActivePaletteId(item.id)}
                    />
                  ))}
                  <div className="vr bg-secondary my-1"></div>
                  <small
                    className="text-secondary pe-2"
                    style={{ fontSize: "11px" }}
                  >
                    <strong>Click:</strong> Place |{" "}
                    <strong>Shift+Click:</strong> Delete
                  </small>
                </div>
              )}

              {/* Block Inspector Badge */}
              {!sculptMode && !walkthroughMode && selectedVoxel && (
                <div
                  className="position-absolute bottom-0 start-0 m-3 p-3 rounded bg-dark border border-secondary shadow-lg text-light"
                  style={{
                    minWidth: "220px",
                    zIndex: 10,
                    backdropFilter: "blur(6px)",
                    backgroundColor: "rgba(18,20,24,0.85)",
                  }}
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
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: selectedVoxel.paletteColor,
                      }}
                    />
                    <span className="fw-semibold small">
                      {selectedVoxel.paletteName}
                    </span>
                  </div>
                  <div className="text-secondary font-monospace small">
                    Position:{" "}
                    <span className="text-light">
                      X:{selectedVoxel.x} Y:{selectedVoxel.y} Z:
                      {selectedVoxel.z}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Presets Modal */}
      {showModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border-secondary text-light">
              <div className="modal-header border-secondary d-flex justify-content-between align-items-center">
                <ul className="nav nav-pills">
                  <li className="nav-item">
                    <button
                      className={`nav-link py-1 px-3 ${modalTab === "presets" ? "active" : "text-light"}`}
                      onClick={() => setModalTab("presets")}
                    >
                      Stock Presets
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link py-1 px-3 ${modalTab === "saved" ? "active" : "text-light"}`}
                      onClick={() => setModalTab("saved")}
                    >
                      My Saved ({savedList.length})
                    </button>
                  </li>
                </ul>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {modalTab === "presets" ? (
                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-info fw-bold mb-1">Shibuya 2099</h6>
                        <p className="text-secondary small mb-3">
                          Cyberpunk crossing with skybridges and monorail.
                        </p>
                        <button
                          className="btn btn-outline-info btn-sm mt-auto"
                          onClick={() =>
                            loadStructure(generateShibuyaCrossing())
                          }
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-warning fw-bold mb-1">
                          Kailash Vimana
                        </h6>
                        <p className="text-secondary small mb-3">
                          Floating aerial sanctum with jagged crags.
                        </p>
                        <button
                          className="btn btn-outline-warning btn-sm mt-auto"
                          onClick={() => loadStructure(generateKailashVimana())}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-light fw-bold mb-1">Taj Mahal</h6>
                        <p className="text-secondary small mb-3">
                          Mughal marble monument with onion dome.
                        </p>
                        <button
                          className="btn btn-outline-light btn-sm mt-auto"
                          onClick={() => loadStructure(generateTajMahal())}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-danger fw-bold mb-1">
                          Cyber Tower
                        </h6>
                        <p className="text-secondary small mb-3">
                          Multi-tier tower with neon ads.
                        </p>
                        <button
                          className="btn btn-outline-danger btn-sm mt-auto"
                          onClick={() =>
                            loadStructure(generateCyberSkyscraper(16, 7))
                          }
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-primary fw-bold mb-1">
                          Sci-Fi Portal
                        </h6>
                        <p className="text-secondary small mb-3">
                          Gateway with rotating quantum horizon.
                        </p>
                        <button
                          className="btn btn-outline-primary btn-sm mt-auto"
                          onClick={() =>
                            loadStructure(generateSciFiPortal(9, 3))
                          }
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="card bg-black border-secondary h-100 text-light p-3">
                        <h6 className="text-warning fw-bold mb-1">
                          Roman Colosseum
                        </h6>
                        <p className="text-secondary small mb-3">
                          Parametric classical amphitheater.
                        </p>
                        <button
                          className="btn btn-outline-warning btn-sm mt-auto"
                          onClick={() =>
                            loadStructure(generateRomanColosseum(11, 9))
                          }
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {savedList.length === 0 ? (
                      <div className="text-center py-5 text-secondary">
                        No custom blueprints saved yet.
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {savedList.map((item) => (
                          <div
                            key={item.id}
                            className="list-group-item bg-black border-secondary text-light d-flex justify-content-between align-items-center mb-2 rounded"
                          >
                            <div>
                              <h6 className="mb-0 fw-bold text-primary">
                                {item.name}
                              </h6>
                              <small className="text-secondary">
                                Saved on {item.savedAt}
                              </small>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => loadStructure(item.data)}
                              >
                                Load
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={(e) => handleDeleteSaved(item.id, e)}
                              >
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
