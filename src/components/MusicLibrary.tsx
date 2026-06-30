import React, { useState } from "react";
import { Track, Playlist } from "../types";
import { Play, Pause, Search, Heart, Sparkles, Radio, Music4, Check, Plus, Trash2 } from "lucide-react";

interface MusicLibraryProps {
  tracks: Track[];
  playlists: Playlist[];
  selectedPlaylistId: string;
  activeTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (track: Track) => void;
  onTogglePlay: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (trackId: string, playlistId: string) => void;
  onRemoveFromPlaylist: (trackId: string, playlistId: string) => void;
}

export default function MusicLibrary({
  tracks,
  playlists,
  selectedPlaylistId,
  activeTrack,
  isPlaying,
  onSelectTrack,
  onTogglePlay,
  favorites,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}: MusicLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);

  // Find selected playlist
  const playlist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
  
  // Filter tracks that are in the selected playlist
  const playlistTracks = tracks.filter((track) => playlist.trackIds.includes(track.id));

  // Further filter by search query
  const filteredTracks = playlistTracks.filter((track) => {
    const term = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(term) ||
      track.artist.toLowerCase().includes(term) ||
      track.album.toLowerCase().includes(term) ||
      track.genre.toLowerCase().includes(term)
    );
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getGenreColor = (genre: string) => {
    switch (genre.toLowerCase()) {
      case "synthwave":
        return "bg-zinc-900 border-zinc-700 text-zinc-100";
      case "lo-fi beats":
      case "acoustic chill":
        return "bg-zinc-900 border-zinc-700 text-zinc-100";
      case "ambient space":
        return "bg-zinc-900 border-zinc-700 text-zinc-100";
      case "industrial techno":
        return "bg-zinc-900 border-zinc-700 text-zinc-100";
      case "classical":
        return "bg-zinc-900 border-zinc-700 text-zinc-100";
      default:
        return "bg-zinc-950 border-zinc-800 text-zinc-300";
    }
  };

  return (
    <div className="w-full select-none bg-black text-white" id="music-library">
      {/* Search & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6" id="library-toolbar">
        <div>
          <h2 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
            {playlist.name}
            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
              {filteredTracks.length} {filteredTracks.length === 1 ? "track" : "tracks"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl font-medium">{playlist.description}</p>
        </div>

        {/* Search input bar */}
        <div className="relative w-full md:w-72 shrink-0" id="search-bar-wrapper">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search titles, artists, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-zinc-800 focus:border-white rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition-all font-sans"
            id="library-search-input"
          />
        </div>
      </div>

      {/* Tracks Container */}
      <div className="w-full" id="library-track-list-container">
        {filteredTracks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed border-zinc-850 rounded-lg" id="empty-library">
            <Music4 className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs font-semibold text-zinc-400">No tracks matched your search</p>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono">Try adjusting your filters or query</p>
          </div>
        ) : (
          <div className="min-w-[600px] w-full" id="library-table-wrapper">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_1.2fr_120px_100px_40px] px-4 py-2 border-b border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold" id="library-table-header">
              <div>#</div>
              <div>Title</div>
              <div>Album</div>
              <div>Genre</div>
              <div className="text-right">Duration</div>
              <div className="text-center"></div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-zinc-900" id="library-table-rows">
              {filteredTracks.map((track, idx) => {
                const isActive = activeTrack?.id === track.id;
                const isCurrentPlaying = isActive && isPlaying;
                const isFav = favorites.includes(track.id);

                return (
                  <div
                    key={track.id}
                    className={`grid grid-cols-[40px_1fr_1.2fr_120px_100px_40px] px-4 py-3 items-center rounded-lg group transition-all duration-150 ${
                      isActive 
                        ? "bg-zinc-900/60 border-l-2 border-white pl-3 text-white" 
                        : "hover:bg-zinc-950 text-zinc-300"
                    }`}
                    id={`track-row-${track.id}`}
                  >
                    {/* Index / Play Hover Button */}
                    <div className="relative font-mono text-xs text-zinc-500" id={`row-idx-container-${track.id}`}>
                      <span className="group-hover:opacity-0 transition-opacity flex items-center">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => {
                          if (isActive) {
                            onTogglePlay();
                          } else {
                            onSelectTrack(track);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center text-white transition-all pointer-events-auto"
                        id={`row-play-btn-${track.id}`}
                      >
                        {isCurrentPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Cover + Title/Artist */}
                    <div className="flex items-center gap-3 pr-4 truncate" id={`row-info-${track.id}`}>
                      <div className="relative w-9 h-9 rounded overflow-hidden border border-zinc-800 flex-shrink-0">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isCurrentPlaying && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-0.5">
                            <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse-fast"></span>
                            <span className="w-0.5 h-3.5 bg-white rounded-full animate-pulse-fast [animation-delay:0.15s]"></span>
                            <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-fast [animation-delay:0.3s]"></span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-zinc-200"}`}>
                          {track.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                          {track.artist}
                          {track.isGenerative && (
                            <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-1 py-0.2 rounded flex items-center gap-0.5 font-mono font-bold">
                              <Sparkles className="w-2 h-2 text-zinc-400" />
                              SYNTH
                            </span>
                          )}
                          {!track.isGenerative && (
                            <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1 py-0.2 rounded flex items-center gap-0.5 font-mono font-bold">
                              <Radio className="w-2 h-2 text-zinc-500" />
                              STREAM
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Album Name */}
                    <div className="text-xs text-zinc-400 truncate pr-4 font-sans font-medium" id={`row-album-${track.id}`}>
                      {track.album}
                    </div>

                    {/* Genre */}
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border tracking-wider uppercase ${getGenreColor(track.genre)}`}>
                        {track.genre}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="text-right font-mono text-xs text-zinc-400" id={`row-dur-${track.id}`}>
                      {formatDuration(track.duration)}
                    </div>

                    {/* Favorite & Options */}
                    <div className="flex items-center justify-center gap-1.5" id={`row-controls-${track.id}`}>
                      <button
                        onClick={() => onToggleFavorite(track.id)}
                        className={`p-1 rounded transition-colors ${
                          isFav ? "text-white" : "text-zinc-600 hover:text-zinc-300"
                        }`}
                        id={`row-fav-btn-${track.id}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-white text-white" : ""}`} />
                      </button>

                      {/* Add to custom playlist options */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuTrackId(activeMenuTrackId === track.id ? null : track.id)}
                          className="p-1 rounded text-zinc-650 hover:text-white transition-colors text-xs font-bold border border-transparent hover:border-zinc-800 bg-transparent hover:bg-zinc-900 w-6 h-6 flex items-center justify-center"
                          title="Collection Options"
                          id={`row-playlist-options-btn-${track.id}`}
                        >
                          +
                        </button>

                        {activeMenuTrackId === track.id && (
                          <div className="absolute right-0 top-7 w-48 bg-zinc-950 border border-zinc-850 rounded-lg shadow-2xl p-1.5 z-30 flex flex-col gap-1">
                            <p className="text-[9px] font-mono font-bold text-zinc-500 px-2 py-1 uppercase tracking-widest">Add to Collection</p>
                            
                            {playlists.filter(p => p.isCustom).map(p => {
                              const alreadyIn = p.trackIds.includes(track.id);
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    if (alreadyIn) {
                                      onRemoveFromPlaylist(track.id, p.id);
                                    } else {
                                      onAddToPlaylist(track.id, p.id);
                                    }
                                    setActiveMenuTrackId(null);
                                  }}
                                  className="w-full flex items-center justify-between text-left text-xs font-sans px-2.5 py-1.5 rounded hover:bg-zinc-900 text-zinc-300 hover:text-white"
                                >
                                  <span className="truncate font-medium">{p.name}</span>
                                  {alreadyIn ? (
                                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                  )}
                                </button>
                              );
                            })}

                            {playlists.filter(p => p.isCustom).length === 0 && (
                              <p className="text-[10px] text-zinc-500 px-2 py-1.5 font-sans italic">No custom collections created</p>
                            )}

                            {playlist.isCustom && (
                              <>
                                <div className="h-px bg-zinc-850 my-1"></div>
                                <button
                                  onClick={() => {
                                    onRemoveFromPlaylist(track.id, playlist.id);
                                    setActiveMenuTrackId(null);
                                  }}
                                  className="w-full flex items-center gap-1.5 text-left text-xs font-sans px-2.5 py-1.5 rounded hover:bg-zinc-900 text-red-400 hover:text-red-300 font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove from this collection</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
