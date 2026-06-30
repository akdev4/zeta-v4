export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  genre: string;
  isGenerative: boolean;
  audioUrl?: string; // For streaming
  tempo?: number; // for generative
  scale?: string; // for generative
  lyrics?: { time: number; text: string }[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  createdAt: string;
  isCustom?: boolean;
}

