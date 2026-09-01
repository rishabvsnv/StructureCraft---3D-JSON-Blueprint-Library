"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import VoxelCanvas from "./VoxelCanvas";
// 1. Import generator function
import { generateRomanColosseum } from "@/utils/generateColosseum";

export default function Workspace() {
  const [jsonCode, setJsonCode] = useState("");
  const [compilerOutput, setCompilerOutput] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Helper to compile and update editor
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

    // Load Colosseum by default on startup
    const initialData = generateRomanColosseum(10, 8);
    loadStructure(initialData);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <div className="d-flex flex-column vh-100 bg-black">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand navbar-dark bg-dark border-bottom border-secondary px-3 py-2">
        <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-boxes text-primary fs-4"></i>
            <span className="navbar-brand fw-bold mb-0 fs-6">StructureCraft</span>
          </div>

          {/* Generator Action Button */}
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
              onClick={() => loadStructure(generateRomanColosseum(12, 10))}
            >
              <i className="bi bi-magic"></i> Generate Colosseum
            </button>

            {errorStatus ? (
              <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> {errorStatus}
              </span>
            ) : (
              <span className="badge bg-success-subtle text-success border border-success px-3 py-2">
                <i className="bi bi-check-circle-fill me-1"></i> Ready
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Editor & 3D Viewport Panels */}
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