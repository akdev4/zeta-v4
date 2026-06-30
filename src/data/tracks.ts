import { Track, Playlist } from "../types";

export const TRACKS: Track[] = [];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "all",
    name: "My Collection",
    description: "Your saved tracks from the global music network.",
    trackIds: [],
    createdAt: "2026-06-30"
  }
];
