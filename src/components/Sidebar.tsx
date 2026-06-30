import React, { useState } from "react";
import { Music, ListMusic, Plus, Trash2, Disc, Database, RotateCcw } from "lucide-react";
import { Playlist } from "../types";

interface SidebarProps {
  playlists: Playlist[];
  selectedPlaylistId: string;
  setSelectedPlaylistId: (id: string) => void;
  onCreatePlaylist: (name: string, description: string) => void;
  onDeletePlaylist: (id: string) => void;
  onResetCollections?: () => void;
}

export default function Sidebar({
  playlists,
  selectedPlaylistId,
  setSelectedPlaylistId,
  onCreatePlaylist,
  onDeletePlaylist,
  onResetCollections,
}: SidebarProps) {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), "Custom collections saved to local browser cache.");
    setNewPlaylistName("");
    setIsAddingPlaylist(false);
  };

  return (
    <div className="w-64 h-full bg-black border-r border-zinc-800 flex flex-col p-5 select-none" id="zeta-sidebar">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 mb-8 px-1" id="sidebar-logo-container">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md shadow-white/5" id="brand-badge">
          <Disc className="w-5 h-5 text-black animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-widest text-white flex items-center gap-1">
            ZETA MUSIC
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono">browser audio cache</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="mb-6" id="navigation-section">
        <p className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase mb-3 px-2 font-bold">Discover</p>
        <nav className="space-y-1">
          <button
            onClick={() => {
              setSelectedPlaylistId("all");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedPlaylistId === "all"
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-950"
            }`}
            id="nav-library"
          >
            <Music className="w-3.5 h-3.5 text-zinc-400" />
            <span>Music Library</span>
          </button>
        </nav>
      </div>

      {/* Playlists Section */}
      <div className="flex-1 overflow-y-auto mb-4 scrollbar-thin" id="playlists-section">
        <div className="flex items-center justify-between mb-3 px-2">
          <p className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase font-bold">My Collections</p>
          <button
            onClick={() => setIsAddingPlaylist(!isAddingPlaylist)}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all border border-transparent hover:border-zinc-800"
            title="Create Playlist"
            id="add-playlist-btn"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Add Playlist Input */}
        {isAddingPlaylist && (
          <form onSubmit={handleCreatePlaylist} className="mb-3 px-1" id="create-playlist-form">
            <input
              type="text"
              placeholder="Collection name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-all font-sans"
              maxLength={24}
              autoFocus
              id="playlist-input-field"
            />
          </form>
        )}

        <div className="space-y-1" id="playlist-list">
          {playlists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id;
            return (
              <div
                key={playlist.id}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-zinc-900 text-white border border-zinc-700 pl-2.5"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-950"
                }`}
                id={`playlist-item-${playlist.id}`}
              >
                <button
                  onClick={() => {
                    setSelectedPlaylistId(playlist.id);
                  }}
                  className="flex-1 text-left flex items-center gap-2 truncate"
                >
                  <ListMusic className="w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <span className="truncate">{playlist.name}</span>
                </button>

                {playlist.isCustom && (
                  <button
                    onClick={() => onDeletePlaylist(playlist.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 rounded transition-all shrink-0"
                    title="Delete playlist"
                    id={`delete-playlist-${playlist.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Engine Status & Cache Reset */}
      <div className="border-t border-zinc-800 pt-4 px-1 space-y-2.5" id="sidebar-footer">
        <div className="flex items-center gap-2.5 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg">
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-300 font-sans tracking-wide">Cache Saved</p>
            <p className="text-[9px] font-mono text-zinc-500 truncate">LocalStorage Sync OK</p>
          </div>
        </div>

        {onResetCollections && (
          <button
            onClick={onResetCollections}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
            id="reset-collections-btn"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Cache Data</span>
          </button>
        )}
      </div>
    </div>
  );
}
