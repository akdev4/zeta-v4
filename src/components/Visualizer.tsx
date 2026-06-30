import React, { useEffect, useRef, useState } from "react";
import { audioEngine } from "../utils/audioEngine";
import { Sparkles, Sliders, Play, Disc } from "lucide-react";

interface VisualizerProps {
  isPlaying: boolean;
  visualizerMode: "bars" | "circle" | "particles" | "retroGrid";
  setVisualizerMode: (mode: "bars" | "circle" | "particles" | "retroGrid") => void;
  primaryColor: string;
}

export default function Visualizer({
  isPlaying,
  visualizerMode,
  setVisualizerMode,
  primaryColor,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<{ x: number; y: number; size: number; angle: number; speed: number; color: string }[]>([]);

  // Initialize particles once
  useEffect(() => {
    const temp: any[] = [];
    for (let i = 0; i < 60; i++) {
      temp.push({
        x: 0,
        y: 0,
        size: Math.random() * 3 + 1,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 2 + 1,
        color: `hsl(${260 + Math.random() * 60}, 90%, 65%)`
      });
    }
    particlesRef.current = temp;
  }, []);

  // Set canvas size dynamically using ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // set both display and coordinate systems
        canvas.width = Math.max(width, 100);
        canvas.height = Math.max(height, 100);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const w = canvas.width;
      const h = canvas.height;

      // Get real audio data
      const { frequencies, waveform } = audioEngine.getAnalyserData();

      // Check if we actually have data (or if audioEngine is not playing/initialized)
      const hasAudio = frequencies.length > 0 && isPlaying;

      // Draw background
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)"; // subtle trail effect
      ctx.fillRect(0, 0, w, h);

      // Simple grid lines in background for tech visual flavor
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let j = 0; j < h; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(w, j);
        ctx.stroke();
      }

      // Fallback visualization if nothing is playing
      const dataToUse = hasAudio 
        ? frequencies 
        : new Uint8Array(128).map((_, i) => Math.sin(i * 0.15 + Date.now() * 0.005) * 30 + 40);

      const waveformToUse = hasAudio
        ? waveform
        : new Uint8Array(128).map((_, i) => Math.sin(i * 0.05 + Date.now() * 0.008) * 40 + 128);

      if (visualizerMode === "bars") {
        // --- NEON BAR WAVE ---
        const barWidth = (w / dataToUse.length) * 1.5;
        let x = 0;

        for (let i = 0; i < dataToUse.length; i++) {
          const percent = dataToUse[i] / 255;
          const barHeight = percent * h * 0.85;

          // Gradient color depending on primaryColor
          const grad = ctx.createLinearGradient(0, h, 0, h - barHeight);
          grad.addColorStop(0, "rgba(99, 102, 241, 0.2)");
          grad.addColorStop(0.5, primaryColor);
          grad.addColorStop(1, "#f43f5e"); // Pink burst at top

          ctx.fillStyle = grad;
          ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);

          // Glowing capping dot
          if (percent > 0.15) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 8;
            ctx.fillRect(x, h - barHeight - 4, barWidth - 2, 3);
            ctx.shadowBlur = 0; // reset
          }

          x += barWidth;
        }
      } else if (visualizerMode === "circle") {
        // --- CIRCULAR PULSE ---
        const centerX = w / 2;
        const centerY = h / 2;
        
        // Calculate bass energy for pulsing scale
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
          bassSum += dataToUse[i] || 0;
        }
        const averageBass = bassSum / 10;
        const pulseScale = 1 + (averageBass / 255) * 0.35;
        const baseRadius = Math.min(w, h) * 0.22 * pulseScale;

        // Draw radial glowing background
        const glowGrad = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * 2);
        glowGrad.addColorStop(0, "rgba(99, 102, 241, 0.05)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Waveform circular ring
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = primaryColor;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 15;

        const numPoints = 80;
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          
          // Map index to audio data
          const audioIdx = Math.floor((i / numPoints) * (dataToUse.length / 2));
          const val = dataToUse[audioIdx] || 50;
          const r = baseRadius + (val / 255) * 65;

          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Inner decorative circle spinning
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.arc(centerX, centerY, baseRadius - 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isPlaying ? "ZETA AUDIO" : "PAUSED", centerX, centerY);
      } else if (visualizerMode === "particles") {
        // --- ORBIT PARTICLES ---
        const centerX = w / 2;
        const centerY = h / 2;

        // Draw center sun/speaker
        let midHighSum = 0;
        for (let i = 20; i < 60; i++) {
          midHighSum += dataToUse[i] || 0;
        }
        const midHighAvg = midHighSum / 40;
        const starSize = 35 + (midHighAvg / 255) * 40;

        const coreGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, starSize);
        coreGrad.addColorStop(0, "#ffffff");
        coreGrad.addColorStop(0.3, primaryColor);
        coreGrad.addColorStop(1, "rgba(244, 63, 94, 0)");
        
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, starSize, 0, Math.PI * 2);
        ctx.fill();

        // Update and draw particles dancing around
        particlesRef.current.forEach((p, idx) => {
          // Speed responds to music energy
          const waveVal = (waveformToUse[idx % waveformToUse.length] - 128) / 128; // -1 to +1
          const energy = (dataToUse[idx % 20] || 30) / 255;
          
          p.angle += 0.01 + energy * 0.04;
          const currentRadius = 60 + idx * 4 + waveVal * 30 + energy * 70;

          p.x = centerX + Math.cos(p.angle) * currentRadius;
          p.y = centerY + Math.sin(p.angle) * currentRadius;

          // Grow size with beat
          const currentSize = p.size * (1 + energy * 1.5);

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();

          // Connect stars with faint lines to create constellations
          if (idx > 0 && idx < 15) {
            const prev = particlesRef.current[idx - 1];
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + energy * 0.25})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(prev.x, prev.y);
            ctx.stroke();
          }
        });
      } else if (visualizerMode === "retroGrid") {
        // --- RETRO GRID HIGHWAY ---
        ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
        ctx.lineWidth = 1.5;

        const gridYOffset = Date.now() * 0.05 % 40;
        const horizon = h * 0.45;

        // Draw perspective lines meeting in center
        const numVLines = 16;
        for (let i = 0; i <= numVLines; i++) {
          const xPercent = i / numVLines;
          const startX = w * xPercent;
          const endX = w / 2 + (startX - w / 2) * 0.15;

          ctx.beginPath();
          ctx.moveTo(startX, h);
          ctx.lineTo(endX, horizon);
          ctx.stroke();
        }

        // Draw horizontal grid lines marching forward
        for (let y = horizon; y <= h; y += 25) {
          // Perspective scale
          const ratio = (y - horizon) / (h - horizon);
          const drawY = horizon + ratio * ratio * (h - horizon) + (gridYOffset * ratio);
          
          if (drawY > h) continue;

          ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 + ratio * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(0, drawY);
          ctx.lineTo(w, drawY);
          ctx.stroke();
        }

        // Draw soundwave sitting on the horizon as mountain peaks!
        ctx.fillStyle = "rgba(10, 8, 16, 0.9)";
        ctx.beginPath();
        ctx.moveTo(0, horizon);

        const chunk = w / dataToUse.length;
        for (let i = 0; i < dataToUse.length; i++) {
          const val = dataToUse[i] || 0;
          const mountainH = (val / 255) * 85;
          const mx = i * chunk;
          const my = horizon - mountainH;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(w, horizon);
        ctx.closePath();
        ctx.fill();

        // Neon outline for the mountains
        ctx.strokeStyle = "#ec4899";
        ctx.shadowColor = "#ec4899";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, horizon);
        for (let i = 0; i < dataToUse.length; i++) {
          const val = dataToUse[i] || 0;
          const mountainH = (val / 255) * 85;
          ctx.lineTo(i * chunk, horizon - mountainH);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visualizerMode, isPlaying, primaryColor]);

  return (
    <div className="relative w-full h-full min-h-[220px] bg-slate-950/85 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col" id="zeta-visualizer-container">
      {/* Visualizer header controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto" id="visualizer-header">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-md">
          <Disc className={`w-4 h-4 text-indigo-400 ${isPlaying ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-mono font-medium tracking-wide text-slate-300 uppercase">
            {visualizerMode} Visualization
          </span>
        </div>

        <div className="flex gap-1 bg-black border border-zinc-800 p-0.5 rounded-lg">
          <button
            onClick={() => setVisualizerMode("bars")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              visualizerMode === "bars"
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            id="vmode-bars"
          >
            Bars
          </button>
          <button
            onClick={() => setVisualizerMode("circle")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              visualizerMode === "circle"
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            id="vmode-circle"
          >
            Pulse
          </button>
          <button
            onClick={() => setVisualizerMode("particles")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              visualizerMode === "particles"
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            id="vmode-particles"
          >
            Orbit
          </button>
          <button
            onClick={() => setVisualizerMode("retroGrid")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              visualizerMode === "retroGrid"
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            id="vmode-retrogrid"
          >
            Retro Grid
          </button>
        </div>
      </div>

      {/* Main Canvas Node */}
      <div ref={containerRef} className="flex-1 w-full h-full" id="canvas-wrapper">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Hint if not playing */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none" id="visualizer-paused-overlay">
          <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-1">Visualizer Standing By</p>
          <p className="text-[10px] text-zinc-600 font-mono">Press play to stream synthesizer frequencies</p>
        </div>
      )}
    </div>
  );
}
