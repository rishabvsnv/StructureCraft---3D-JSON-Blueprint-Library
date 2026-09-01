"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import VoxelCanvas from "./VoxelCanvas";
import { generateRomanColosseum } from "@/utils/generateColosseum";
// 1. Import the Sci-Fi Portal generator
import { generateSciFiPortal } from "@/utils/generatePortal";

export default function Workspace() {
  const [jsonCode, setJsonCode] = useState("");
  const [compilerOutput, setCompilerOutput] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const loadStructure = (dataObject: object) => {
    const formatted = JSON.stringify(dataObject, null, 2);
    setJsonCode(formatted);
    workerRef.current?.postMessage({ jsonString: formatted });
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

    // Load Sci-Fi Portal on initial load
    loadStructure(generateSciFiPortal(9, 3));

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <div className="d-flex flex-column vh-100 bg-black">
      {/* Bootstrap Navbar */}
      <nav className="navbar navbar-expand navbar-dark bg-dark border-bottom border-secondary px-3 py-2">
        <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-boxes text-primary fs-4"></i>
            <span className="navbar-brand fw-bold mb-0 fs-6">StructureCraft</span>
          </div>

          {/* Preset Buttons */}
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-info btn-sm d-flex align-items-center gap-1"
              onClick={() => loadStructure(generateSciFiPortal(9, 3))}
            >
              <i className="bi bi-radioactive"></i> Sci-Fi Portal
            </button>

            <button
              className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
              onClick={() => loadStructure(generateRomanColosseum(11, 9))}
            >
              <i className="bi bi-bank"></i> Colosseum
            </button>

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

      {/* Editor + 3D Viewport Split */}
      <div className="container-fluid flex-grow-1 p-0 overflow-hidden">
        <div className="row g-0 h-100">
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

          <div className="col-12 col-lg-6 d-flex flex-column bg-black h-100">
            <div className="flex-grow-1 position-relative w-100 h-100">
              <VoxelCanvas compilerData={compilerOutput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}