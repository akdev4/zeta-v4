import { Track, Playlist } from "../types";

export const TRACKS: Track[] = [
  {
    id: "stream-lofi",
    title: "Mellow Summer Breeze",
    artist: "Summer Rain",
    album: "Public Domain Chill",
    duration: 147,
    coverUrl: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&q=80",
    genre: "Acoustic Chill",
    isGenerative: false,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: "stream-synthwave",
    title: "Retro Grid Highway",
    artist: "80s Rider",
    album: "Vaporwave Anthems",
    duration: 218,
    coverUrl: "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=400&q=80",
    genre: "Synthwave",
    isGenerative: false,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },
  {
    id: "stream-piano",
    title: "Nocturne in C Minor",
    artist: "Chopin Ensemble",
    album: "Classical Echoes",
    duration: 302,
    coverUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80",
    genre: "Classical",
    isGenerative: false,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  }
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "all",
    name: "All Tracks",
    description: "Every sound available in Zeta Music, curated for premium quality.",
    trackIds: TRACKS.map(t => t.id),
    createdAt: "2026-06-30"
  }
];

