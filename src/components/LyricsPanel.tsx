import React, { useEffect, useRef, useState } from "react";
import { Track } from "../types";
import { audioEngine } from "../utils/audioEngine";
import { Disc, Sparkles, AlertCircle } from "lucide-react";

interface LyricsPanelProps {
  activeTrack: Track;
  isPlaying: boolean;
}

export default function LyricsPanel({ activeTrack, isPlaying }: LyricsPanelProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<any>(null);

  // Poll current time for lyrics tracking
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (activeTrack.isGenerative) {
          // Approximate ticking virtual time
          setCurrentTime((prev) => (prev + 0.25) % (activeTrack.duration + 1));
        } else {
          setCurrentTime(audioEngine.getStreamCurrentTime());
        }
      }, 250);
    } else {
      if (!activeTrack.isGenerative) {
        setCurrentTime(audioEngine.getStreamCurrentTime());
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeTrack]);

  // Find active lyric line index
  const lyrics = activeTrack.lyrics || [];
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll the active lyric line to center of container
  useEffect(() => {
    const activeEl = document.getElementById(`lyric-line-${activeIndex}`);
    const container = containerRef.current;
    if (activeEl && container) {
      const topPos = activeEl.offsetTop;
      const height = container.clientHeight;
      container.scrollTo({
        top: topPos - height / 2 + activeEl.clientHeight / 2,
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  return (
    <div className="w-80 h-full bg-black border-l border-zinc-800 flex flex-col p-5 select-none" id="lyrics-panel">
      {/* Title Header */}
      <div className="flex items-center gap-2 mb-5 border-b border-zinc-800 pb-3" id="lyrics-header">
        <Disc className={`w-4 h-4 text-white ${isPlaying ? 'animate-spin-slow' : ''}`} />
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-zinc-300 uppercase">
          Lyrics Synchronizer
        </h3>
      </div>

      {/* Main scrolling lyrics container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-none scroll-smooth flex flex-col justify-start"
        id="lyrics-scroll-body"
      >
        <div className="h-20 shrink-0" /> {/* Top padding block to allow scrolling first line down */}

        {lyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isUpcoming = idx > activeIndex;

          return (
            <div
              key={idx}
              id={`lyric-line-${idx}`}
              className={`transition-all duration-300 origin-left text-left ${
                isActive
                  ? "text-base font-bold text-white scale-102 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  : isUpcoming
                    ? "text-xs font-semibold text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    : "text-xs font-semibold text-zinc-750"
              }`}
            >
              {line.text}
            </div>
          );
        })}

        {lyrics.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4" id="no-lyrics">
            <AlertCircle className="w-5 h-5 text-zinc-600 mb-2" />
            <p className="text-xs font-semibold text-zinc-400">No lyrics available</p>
            <p className="text-[10px] text-zinc-600 font-mono mt-1 leading-relaxed">This audio file doesn't contain synchronized lyrical tracks.</p>
          </div>
        )}

        <div className="h-24 shrink-0" /> {/* Bottom padding block to allow scrolling last line up */}
      </div>

      {/* Synthesis info box */}
      {activeTrack.isGenerative && isPlaying && (
        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-lg mt-4 shrink-0" id="lyrics-dsp-info">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-white uppercase tracking-widest mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Procedural Live Logs</span>
          </div>
          <div className="space-y-1 font-mono text-[9px] text-zinc-500">
            <p className="flex justify-between">
              <span>Oscillators:</span>
              <span className="text-zinc-300">Sine, Sawtooth, Tri</span>
            </p>
            <p className="flex justify-between">
              <span>BPM Rate:</span>
              <span className="text-zinc-300">{activeTrack.tempo || 110} BPM</span>
            </p>
            <p className="flex justify-between">
              <span>Harmonic Scale:</span>
              <span className="text-zinc-300">{activeTrack.scale}</span>
            </p>
            <p className="flex justify-between">
              <span>Filter Nodes:</span>
              <span className="text-zinc-400">Online & Routed</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
