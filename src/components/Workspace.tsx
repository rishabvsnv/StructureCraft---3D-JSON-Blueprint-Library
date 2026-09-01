"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import VoxelCanvas, { VoxelCanvasHandle } from "./VoxelCanvas";
import { generateSciFiPortal } from "@/utils/generatePortal";
import { generateRomanColosseum } from "@/utils/generateColosseum";
import { generateCyberSkyscraper } from "@/utils/generateSkyscraper";
import { downloadJson, exportToGLTF } from "@/utils/exportUtils";

export default function Workspace() {
  const [jsonCode, setJsonCode] = useState("");
  const [compilerOutput, setCompilerOutput] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Build playback states
  const [buildProgress, setBuildProgress] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<VoxelCanvasHandle | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const loadStructure = (dataObject: object) => {
    const formatted = JSON.stringify(dataObject, null, 2);
    setJsonCode(formatted);
    workerRef.current?.postMessage({ jsonString: formatted });
    setBuildProgress(1.0);
    setIsPlaying(false);
    setShowModal(false);
  };

  useEffect(() => {
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

  // Step-by-step playback timer
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

  const handleExportJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      downloadJson(
        parsed,
        `${parsed.title?.toLowerCase().replace(/\s+/g, "_") || "structure"}.json`
      );
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
              <i className="bi bi-collection"></i> Library Presets
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
                <i className="bi bi-file-earmark-code"></i> GLTF (3D)
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

      {/* Main Workspace Split */}
      <div className="container-fluid flex-grow-1 p-0 overflow-hidden">
        <div className="row g-0 h-100">
          {/* Left Column: Editor */}
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

          {/* Right Column: 3D Viewport with Controls Toolbar */}
          <div className="col-12 col-lg-6 d-flex flex-column bg-black h-100 position-relative">
            {/* Top Viewport Toolbar */}
            <div className="bg-dark bg-opacity-75 px-3 py-2 border-bottom border-secondary d-flex justify-content-between align-items-center">
              {/* Camera Presets */}
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.setCameraView("iso")}
                  title="Isometric View"
                >
                  <i className="bi bi-bounding-box me-1"></i> Iso
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => canvasRef.current?.setCameraView("top")}
                  title="Top Down"
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

              {/* Build Animation Slider */}
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

            {/* 3D Canvas */}
            <div className="flex-grow-1 position-relative w-100 h-100">
              <VoxelCanvas
                ref={canvasRef}
                compilerData={compilerOutput}
                buildProgress={buildProgress}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preset Library Modal */}
      {showModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border-secondary text-light">
              <div className="modal-header border-secondary">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-box-seam text-primary"></i> Preset Asset Library
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <div className="card bg-black border-secondary h-100 text-light p-3">
                      <h6 className="text-info fw-bold mb-1">
                        <i className="bi bi-radioactive me-1"></i> Sci-Fi Portal
                      </h6>
                      <p className="text-secondary small mb-3">
                        Alloy gateway with glowing rotating particle event horizon.
                      </p>
                      <button
                        className="btn btn-info btn-sm mt-auto"
                        onClick={() => loadStructure(generateSciFiPortal(9, 3))}
                      >
                        Load Portal
                      </button>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card bg-black border-secondary h-100 text-light p-3">
                      <h6 className="text-warning fw-bold mb-1">
                        <i className="bi bi-bank me-1"></i> Colosseum
                      </h6>
                      <p className="text-secondary small mb-3">
                        Parametric amphitheater with arched tiers and travertine stone.
                      </p>
                      <button
                        className="btn btn-warning btn-sm mt-auto"
                        onClick={() => loadStructure(generateRomanColosseum(11, 9))}
                      >
                        Load Colosseum
                      </button>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="card bg-black border-secondary h-100 text-light p-3">
                      <h6 className="text-danger fw-bold mb-1">
                        <i className="bi bi-building me-1"></i> Cyber Tower
                      </h6>
                      <p className="text-secondary small mb-3">
                        Multi-tier skyscraper with cyan/magenta neon ads and spire.
                      </p>
                      <button
                        className="btn btn-danger btn-sm mt-auto"
                        onClick={() => loadStructure(generateCyberSkyscraper(16, 7))}
                      >
                        Load Skyscraper
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}