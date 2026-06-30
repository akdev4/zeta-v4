import React, { useEffect, useState, useRef } from "react";
import { Track } from "../types";
import { audioEngine } from "../utils/audioEngine";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Sparkles,
  Maximize2,
  Minimize2,
  Mic2,
  Music2,
  Disc
} from "lucide-react";

interface PlayerControlsProps {
  activeTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  isRepeat: boolean;
  onToggleRepeat: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export default function PlayerControls({
  activeTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  isShuffle,
  onToggleShuffle,
  isRepeat,
  onToggleRepeat,
  volume,
  onVolumeChange,
}: PlayerControlsProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [savedVolume, setSavedVolume] = useState(0.8);
  const timerRef = useRef<any>(null);

  // Sync volume with audioEngine
  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Update playback time/scrubber position
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPlaying && activeTrack) {
      timerRef.current = setInterval(() => {
        if (activeTrack.isGenerative) {
          // Generative tracks just tick up virtual timer
          setCurrentTime((prev) => (prev + 1) % (activeTrack.duration + 1));
          setDuration(activeTrack.duration);
        } else {
          // Streaming tracks get real audio element times
          const cur = audioEngine.getStreamCurrentTime();
          const dur = audioEngine.getStreamDuration() || activeTrack.duration;
          setCurrentTime(cur);
          setDuration(dur);
        }
      }, 250);
    } else if (!isPlaying) {
      if (!activeTrack?.isGenerative) {
        setCurrentTime(audioEngine.getStreamCurrentTime());
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeTrack]);

  // Reset time when track changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(activeTrack?.duration || 0);
  }, [activeTrack]);

  const handleSeek = (value: number) => {
    if (!activeTrack) return;
    if (activeTrack.isGenerative) {
      // For generative, we can just jump our virtual timer
      setCurrentTime(value);
    } else {
      // For streams, seek actual audio element
      audioEngine.setStreamTime(value);
      setCurrentTime(value);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(savedVolume);
    } else {
      setSavedVolume(volume);
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!activeTrack) {
    return (
      <div className="h-20 bg-black border-t border-zinc-800 px-6 flex items-center justify-center text-zinc-500 font-sans text-xs italic" id="empty-controls-bar">
        Select a synthesized beat or streaming track to activate browser playback engine.
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-black border-t border-zinc-800 px-6 py-4 flex flex-col gap-3 select-none" id="player-controls-bar">
      
      {/* Dynamic timeline scrubber row */}
      <div className="w-full flex items-center gap-3.5" id="timeline-scrubber-row">
        <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">
          {formatTime(currentTime)}
        </span>
        
        {activeTrack.isGenerative ? (
          /* Perpetual animation for generative tracks */
          <div className="flex-1 h-1.5 bg-zinc-900 rounded-full relative overflow-hidden group" id="generative-timeline-bar">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-white h-full rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : (
          /* Standard interactive scrubber for MP3 streams */
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="flex-1 accent-white h-1 bg-zinc-900 rounded-lg cursor-pointer"
            id="timeline-scrubber"
          />
        )}

        <span className="text-[10px] font-mono text-zinc-500 w-10 text-left">
          {activeTrack.isGenerative ? "∞ (Live)" : formatTime(duration)}
        </span>
      </div>

      {/* Primary media row */}
      <div className="flex items-center justify-between gap-4" id="controls-primary-row">
        {/* Left: Active song cover + details */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]" id="controls-left-details">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-850 shadow-md shadow-black/20 flex-shrink-0">
            <img
              src={activeTrack.coverUrl}
              alt={activeTrack.title}
              className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              {activeTrack.title}
              {activeTrack.isGenerative && (
                <Sparkles className="w-3 h-3 text-zinc-300 shrink-0" title="Generative Live Synth" />
              )}
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{activeTrack.artist}</p>
          </div>
        </div>

        {/* Center: Playback state controls */}
        <div className="flex flex-col items-center gap-1" id="controls-center-playback">
          <div className="flex items-center gap-4.5" id="controls-playback-row">
            {/* Shuffle Toggle */}
            <button
              onClick={onToggleShuffle}
              className={`p-1.5 rounded-lg transition-colors ${
                isShuffle ? "text-white" : "text-zinc-600 hover:text-zinc-300"
              }`}
              title="Shuffle"
              id="controls-shuffle-btn"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Prev Button */}
            <button
              onClick={onPrevTrack}
              className="p-1.5 rounded-lg text-zinc-450 hover:text-white transition-colors"
              title="Previous Track"
              id="controls-prev-btn"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pause core button */}
            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? "Pause" : "Play"}
              id="controls-play-pause-btn"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black ml-0.5" />
              )}
            </button>

            {/* Next Button */}
            <button
              onClick={onNextTrack}
              className="p-1.5 rounded-lg text-zinc-450 hover:text-white transition-colors"
              title="Next Track"
              id="controls-next-btn"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Repeat Toggle */}
            <button
              onClick={onToggleRepeat}
              className={`p-1.5 rounded-lg transition-colors ${
                isRepeat ? "text-white" : "text-zinc-600 hover:text-zinc-300"
              }`}
              title="Repeat"
              id="controls-repeat-btn"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Sound level, and full screen toggles */}
        <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px]" id="controls-right-utils">
          {/* Volume controls */}
          <div className="flex items-center gap-2 bg-black border border-zinc-800 px-3 py-1.5 rounded w-32 shrink-0" id="controls-volume-box">
            <button
              onClick={toggleMute}
              className="text-zinc-500 hover:text-white transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
              id="controls-mute-btn"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                if (isMuted) setIsMuted(false);
                onVolumeChange(Number(e.target.value));
              }}
              className="w-full accent-white h-1 bg-zinc-900 rounded-lg cursor-pointer"
              id="controls-volume-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
