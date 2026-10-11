
import { catalogue, type Track } from "./catalogue.js";

export type MoodInterpretation = {
  mood: string;
  tags: string[];
  energy: number;
  tempo: "slow" | "medium" | "fast";
};

export type RecommendedTrack = Track & {
  score: number;
};

export function matchTracks(
  interpretation: MoodInterpretation,
  limit = 5
): RecommendedTrack[] {
  const requestedTags = (interpretation.tags ?? []).map((tag) =>
    String(tag).toLowerCase().trim()
  );

  return catalogue
    .map((track) => {
      const trackTags = (track.tags ?? []).map((tag) =>
        String(tag).toLowerCase().trim()
      );

      const matchingTags = requestedTags.filter((tag) =>
        trackTags.includes(tag)
      );

      const tagScore =
        requestedTags.length > 0
          ? (matchingTags.length / requestedTags.length) * 60
          : 0;

      const energyDifference = Math.abs(
        interpretation.energy - track.energy
      );

      const energyScore = Math.max(0, 1 - energyDifference / 4) * 25;

      const tempoScore =
        interpretation.tempo === track.tempo ? 15 : 0;

      const score = Math.round(tagScore + energyScore + tempoScore);

      return { ...track, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
