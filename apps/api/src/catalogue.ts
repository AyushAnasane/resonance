
export type Track = {
  id: string;
  title: string;
  artist: string;
  tags: string[];
  energy: number;
  tempo: "slow" | "medium" | "fast";
};

export const catalogue: Track[] = [
  {
    id: "track-001",
    title: "Midnight Drive",
    artist: "Resonance Demo",
    tags: ["nostalgic", "driving", "dreamy"],
    energy: 3,
    tempo: "slow",
  },
  {
    id: "track-002",
    title: "Golden Hour",
    artist: "Resonance Demo",
    tags: ["warm", "hopeful", "mellow"],
    energy: 2,
    tempo: "slow",
  },
  {
    id: "track-003",
    title: "Neon Streets",
    artist: "Resonance Demo",
    tags: ["retro", "energetic", "driving"],
    energy: 4,
    tempo: "fast",
  },
  {
    id: "track-004",
    title: "Quiet Skies",
    artist: "Resonance Demo",
    tags: ["dreamy", "peaceful", "relaxing"],
    energy: 1,
    tempo: "slow",
  },
  {
    id: "track-005",
    title: "Old Photographs",
    artist: "Resonance Demo",
    tags: ["nostalgic", "melancholic", "retro"],
    energy: 2,
    tempo: "medium",
  },
  {
    id: "track-006",
    title: "City Lights",
    artist: "Resonance Demo",
    tags: ["urban", "dreamy", "mellow"],
    energy: 3,
    tempo: "medium",
  },
  {
    id: "track-007",
    title: "Fresh Start",
    artist: "Resonance Demo",
    tags: ["hopeful", "happy", "uplifting"],
    energy: 4,
    tempo: "fast",
  },
  {
    id: "track-008",
    title: "Rain on Glass",
    artist: "Resonance Demo",
    tags: ["melancholic", "peaceful", "introspective"],
    energy: 1,
    tempo: "slow",
  },
  {
    id: "track-009",
    title: "Weekend Rush",
    artist: "Resonance Demo",
    tags: ["energetic", "happy", "dance"],
    energy: 5,
    tempo: "fast",
  },
  {
    id: "track-010",
    title: "After Hours",
    artist: "Resonance Demo",
    tags: ["retro", "mellow", "dreamy"],
    energy: 3,
    tempo: "medium",
  },
];
