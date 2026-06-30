import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Visualizer from "./components/Visualizer";
import MusicLibrary from "./components/MusicLibrary";
import PlayerControls from "./components/PlayerControls";

import { Track, Playlist } from "./types";
import { TRACKS, INITIAL_PLAYLISTS } from "./data/tracks";
import { audioEngine } from "./utils/audioEngine";

export default function App() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("all");
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem("zeta_playlists");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => p.id !== "generative" && p.id !== "chill");
        }
      } catch (e) {
        // Fallback
      }
    }
    return INITIAL_PLAYLISTS;
  });

  const [customTracks, setCustomTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem("zeta_custom_tracks");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeTrack, setActiveTrack] = useState<Track | null>(() => {
    const saved = localStorage.getItem("zeta_custom_tracks");
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0] : null;
    } catch (e) {
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("zeta_favorites");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [visualizerMode, setVisualizerMode] = useState<"bars" | "circle" | "particles" | "retroGrid">("bars");

  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Combine default tracks with custom added online tracks
  const allTracks = [...TRACKS, ...customTracks];

  // Save favorites to LocalStorage
  useEffect(() => {
    localStorage.setItem("zeta_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Save custom playlists to LocalStorage
  useEffect(() => {
    localStorage.setItem("zeta_playlists", JSON.stringify(playlists));
  }, [playlists]);

  // Save custom online tracks metadata to LocalStorage
  useEffect(() => {
    localStorage.setItem("zeta_custom_tracks", JSON.stringify(customTracks));
  }, [customTracks]);

  // Set initial volume
  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Handler to toggle play/pause
  const handleTogglePlay = async () => {
    if (!activeTrack) return;

    await audioEngine.resume();

    if (isPlaying) {
      audioEngine.pauseStream();
      setIsPlaying(false);
    } else {
      // Check if current loaded audio src matches activeTrack's URL
      const currentSrc = audioEngine.getAudioSrc ? audioEngine.getAudioSrc() : "";
      if (activeTrack.audioUrl && (!currentSrc || !currentSrc.includes(activeTrack.audioUrl))) {
        audioEngine.playStream(activeTrack.audioUrl);
      } else {
        audioEngine.resumeStream();
      }
      setIsPlaying(true);
    }
  };

  // Handler to select and play a new track
  const handleSelectTrack = async (track: Track) => {
    await audioEngine.resume();
    audioEngine.stopAll();

    setActiveTrack(track);
    setIsPlaying(true);

    audioEngine.playStream(track.audioUrl || "");
  };

  // Skip to next track depending on current playlist & shuffle
  const handleNextTrack = () => {
    if (!activeTrack) return;

    const playlist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
    const trackIds = selectedPlaylistId === "all" ? allTracks.map((t) => t.id) : playlist.trackIds;
    const currentIdx = trackIds.indexOf(activeTrack.id);

    if (currentIdx === -1 || trackIds.length === 0) return;

    let nextTrackId = trackIds[0];

    if (isShuffle) {
      const filtered = trackIds.filter((id) => id !== activeTrack.id);
      if (filtered.length > 0) {
        nextTrackId = filtered[Math.floor(Math.random() * filtered.length)];
      }
    } else {
      const nextIdx = (currentIdx + 1) % trackIds.length;
      nextTrackId = trackIds[nextIdx];
    }

    const nextTrack = allTracks.find((t) => t.id === nextTrackId);
    if (nextTrack) {
      handleSelectTrack(nextTrack);
    }
  };

  // Skip to previous track
  const handlePrevTrack = () => {
    if (!activeTrack) return;

    const playlist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
    const trackIds = selectedPlaylistId === "all" ? allTracks.map((t) => t.id) : playlist.trackIds;
    const currentIdx = trackIds.indexOf(activeTrack.id);

    if (currentIdx === -1 || trackIds.length === 0) return;

    let prevTrackId = trackIds[0];

    if (isShuffle) {
      const filtered = trackIds.filter((id) => id !== activeTrack.id);
      if (filtered.length > 0) {
        prevTrackId = filtered[Math.floor(Math.random() * filtered.length)];
      }
    } else {
      const prevIdx = (currentIdx - 1 + trackIds.length) % trackIds.length;
      prevTrackId = trackIds[prevIdx];
    }

    const prevTrack = allTracks.find((t) => t.id === prevTrackId);
    if (prevTrack) {
      handleSelectTrack(prevTrack);
    }
  };

  // Favorite toggle helper
  const handleToggleFavorite = (track: Track) => {
    // If online track not in TRACKS or customTracks, save it
    if (!TRACKS.some((t) => t.id === track.id) && !customTracks.some((t) => t.id === track.id)) {
      setCustomTracks((prev) => [...prev, track]);
    }

    setFavorites((prev) =>
      prev.includes(track.id) ? prev.filter((favId) => favId !== track.id) : [...prev, track.id]
    );
  };

  // Create playlist
  const handleCreatePlaylist = (name: string, description: string) => {
    const newPlaylist: Playlist = {
      id: `custom-${Date.now()}`,
      name,
      description,
      trackIds: [],
      createdAt: new Date().toISOString().split("T")[0],
      isCustom: true,
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    setSelectedPlaylistId(newPlaylist.id);
  };

  // Delete custom playlist
  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId("all");
    }
  };

  // Add track to custom playlist
  const handleAddToPlaylist = (track: Track, playlistId: string) => {
    // If online track not in TRACKS or customTracks, save it
    if (!TRACKS.some((t) => t.id === track.id) && !customTracks.some((t) => t.id === track.id)) {
      setCustomTracks((prev) => [...prev, track]);
    }

    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId && !p.trackIds.includes(track.id)) {
          return { ...p, trackIds: [...p.trackIds, track.id] };
        }
        return p;
      })
    );
  };

  // Remove track from custom playlist
  const handleRemoveFromPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) };
        }
        return p;
      })
    );
  };

  // Reset playlists & favorites to defaults
  const handleResetCollections = () => {
    if (confirm("Reset all custom playlists and favorite selections?")) {
      setPlaylists(INITIAL_PLAYLISTS);
      setCustomTracks([]);
      setFavorites([]);
      setSelectedPlaylistId("all");
      localStorage.removeItem("zeta_playlists");
      localStorage.removeItem("zeta_favorites");
      localStorage.removeItem("zeta_custom_tracks");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-sans" id="app-root-container">
      {/* Upper main core wrapper */}
      <div className="flex-1 flex overflow-hidden relative" id="app-main-layout">
        
        {/* Navigation Sidebar */}
        <Sidebar
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          setSelectedPlaylistId={setSelectedPlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onResetCollections={handleResetCollections}
        />

        {/* Center Canvas / Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 md:px-8 pt-6 pb-24 bg-black relative" id="app-center-panel">
          
          {/* Top Integrated Interactive Visualizer Stage */}
          <div className="shrink-0 mb-6 w-full h-[240px]" id="visualizer-wrapper-box">
            <Visualizer
              isPlaying={isPlaying}
              visualizerMode={visualizerMode}
              setVisualizerMode={setVisualizerMode}
              primaryColor="#ffffff"
            />
          </div>

          {/* Scrolling Main Body */}
          <div className="w-full" id="tab-body-container">
            <MusicLibrary
              tracks={allTracks}
              playlists={playlists}
              selectedPlaylistId={selectedPlaylistId}
              activeTrack={activeTrack}
              isPlaying={isPlaying}
              onSelectTrack={handleSelectTrack}
              onTogglePlay={handleTogglePlay}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onAddToPlaylist={handleAddToPlaylist}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
            />
          </div>
        </div>
      </div>

      {/* Floating Bottom Music Bar */}
      <PlayerControls
        activeTrack={activeTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        isRepeat={isRepeat}
        onToggleRepeat={() => setIsRepeat(!isRepeat)}
        volume={volume}
        onVolumeChange={setVolume}
      />
    </div>
  );
}
