"use client";

import React, { useRef, useEffect } from "react";
import { DroneTelemetry } from "./VoxelCanvas";

interface RadarHUDProps {
  telemetry: DroneTelemetry | null;
  dimensions: { x: number; y: number; z: number };
}

export default function RadarHUD({ telemetry, dimensions }: RadarHUDProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !telemetry) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxDim = Math.max(dimensions.x, dimensions.z) * 1.5;
    const scale = (width * 0.75) / maxDim;
    const originX = width / 2;
    const originY = height / 2;

    // 1. Radar background rings
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(originX, originY, width * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(originX, originY, width * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Crosshair grid lines
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // 3. Structure bounding footprint box
    const bWidth = dimensions.x * scale;
    const bHeight = dimensions.z * scale;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.strokeRect(
      originX - bWidth / 2,
      originY - bHeight / 2,
      bWidth,
      bHeight,
    );

    // 4. Drone Position Marker & Orientation Pointer
    const droneScreenX =
      originX + (telemetry.position.x - dimensions.x / 2) * scale;
    const droneScreenY =
      originY + (telemetry.position.z - dimensions.z / 2) * scale;

    ctx.save();
    ctx.translate(droneScreenX, droneScreenY);
    // Three.js yaw points -Z by default, map to canvas 2D rotation
    ctx.rotate(-telemetry.yaw + Math.PI);

    // Sight cone
    ctx.fillStyle = "rgba(244, 63, 94, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 24, -Math.PI / 4, Math.PI / 4);
    ctx.closePath();
    ctx.fill();

    // Directional Arrow Triangle
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [telemetry, dimensions]);

  return (
    <div
      className="position-absolute bottom-0 start-0 m-3 p-2 rounded bg-dark border border-secondary shadow-lg d-flex flex-column align-items-center"
      style={{
        zIndex: 25,
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(10, 15, 29, 0.85)",
      }}
    >
      <div className="d-flex justify-content-between w-100 mb-1 px-1">
        <span
          className="text-secondary small fw-bold font-monospace"
          style={{ fontSize: "10px" }}
        >
          DRONE RADAR
        </span>
        <span
          className="text-info small font-monospace"
          style={{ fontSize: "10px" }}
        >
          ALT: {telemetry ? Math.round(telemetry.position.y) : 0}m
        </span>
      </div>
      <canvas ref={canvasRef} width={130} height={130} />
      <div
        className="text-secondary font-monospace mt-1 text-center"
        style={{ fontSize: "9px" }}
      >
        X: {telemetry ? Math.round(telemetry.position.x) : 0} | Z:{" "}
        {telemetry ? Math.round(telemetry.position.z) : 0}
      </div>
    </div>
  );
}
