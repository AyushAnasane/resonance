
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ollama from "ollama";
import cookieParser from "cookie-parser";
import spotifyRouter from "./spotify.js";
import session from "express-session";
import FileStoreFactory from "session-file-store";
import type { SessionOptions } from "express-session";

declare module "express-session" {
  interface SessionData {
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
    spotifyTokenExpiresAt?: number;
  }
}

dotenv.config({ path: "../../.env" });

const app = express();
const PORT = 3000;


app.use(
  cors({
    origin: "http://127.0.0.1:5173",
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());

const FileStore = FileStoreFactory(session);

app.use(
  session({
    store: new FileStore({
      path: "./.sessions",
      retries: 0,
    }),
    secret: process.env.SPOTIFY_SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 1000,
    },
  } satisfies SessionOptions)
);

app.use("/api/spotify", spotifyRouter);

type JamendoTrack = {
  id: string;
  name: string;
  artist_name: string;
  duration: number;
  image: string;
  audio: string;
  audiodownload_allowed: boolean;
  license_ccurl?: string;
  musicinfo?: {
    tags?: {
      genres?: string[];
      vartags?: string[];
    };
  };
};

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Resonance API is running!",
  });
});

app.get("/api/music/search", async (req, res) => {
  try {
    const clientId = process.env.JAMENDO_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({
        error: "JAMENDO_CLIENT_ID is missing from .env",
      });
    }

    const query =
      typeof req.query.q === "string" ? req.query.q : "indie";

    const url = new URL("https://api.jamendo.com/v3.0/tracks/");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "10");
    url.searchParams.set("search", query);
    url.searchParams.set("include", "musicinfo");
    url.searchParams.set("audioformat", "mp32");

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        error: "Jamendo API request failed",
      });
    }

    const data = (await response.json()) as {
      headers?: { status?: string; error_message?: string };
      results?: JamendoTrack[];
    };

    const tracks = (data.results ?? []).map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artist_name,
      duration: track.duration,
      image: track.image,
      audio: track.audio,
      downloadAllowed: track.audiodownload_allowed,
      licenseUrl: track.license_ccurl ?? null,
      tags: [
        ...(track.musicinfo?.tags?.genres ?? []),
        ...(track.musicinfo?.tags?.vartags ?? []),
      ],
    }));

    return res.json({ tracks });
  } catch (error) {
    console.error("Jamendo search error:", error);

    return res.status(500).json({
      error: "Could not fetch tracks from Jamendo",
    });
  }
});

app.post("/api/moods/interpret", async (req, res) => {
  const { description } = req.body;

  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({
      error: "Please describe your mood.",
    });
  }

  try {
    const response = await ollama.chat({
      model: "llama3.2:3b",
      messages: [
        {
          role: "system",
          content: `You are Resonance, a music mood interpreter.
Return ONLY valid JSON with:
{
  "mood": "a short mood phrase",
  "tags": ["tag1", "tag2", "tag3"],
  "energy": 1,
  "tempo": "slow"
}
Use exactly 3 lowercase music mood tags.
Energy must be a number from 1 to 5.
Tempo must be slow, medium, or fast.
Do not recommend specific songs.`,
        },
        {
          role: "user",
          content: description.trim(),
        },
      ],
      format: "json",
    });

    const interpretation = JSON.parse(response.message.content) as {
      mood: string;
      tags: string[];
      energy: number;
      tempo: "slow" | "medium" | "fast";
    };

    const clientId = process.env.JAMENDO_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({
        error: "JAMENDO_CLIENT_ID is missing from .env",
      });
    }

    const musicUrl = new URL("https://api.jamendo.com/v3.0/tracks/");
    musicUrl.searchParams.set("client_id", clientId);
    musicUrl.searchParams.set("format", "json");
    musicUrl.searchParams.set("limit", "20");
    musicUrl.searchParams.set("search", interpretation.tags.join(" "));
    musicUrl.searchParams.set("include", "musicinfo");
    musicUrl.searchParams.set("audioformat", "mp32");

    const musicResponse = await fetch(musicUrl);

    if (!musicResponse.ok) {
      throw new Error("Jamendo track search failed");
    }

    const musicData = (await musicResponse.json()) as {
      results?: JamendoTrack[];
    };

    const realTracks = (musicData.results ?? []).map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artist_name,
      tags: [
        ...(track.musicinfo?.tags?.genres ?? []),
        ...(track.musicinfo?.tags?.vartags ?? []),
      ],
      energy: interpretation.energy,
      tempo: interpretation.tempo,
      duration: track.duration,
      image: track.image,
      audio: track.audio,
      downloadAllowed: track.audiodownload_allowed,
      licenseUrl: track.license_ccurl ?? null,
    }));

    const recommendations = realTracks
      .map((track) => {
        const requestedTags = interpretation.tags.map((tag) =>
          tag.toLowerCase().trim()
        );

        const trackTags = track.tags.map((tag) =>
          tag.toLowerCase().trim()
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

        const energyScore =
          Math.max(0, 1 - energyDifference / 4) * 25;

        const tempoScore =
          interpretation.tempo === track.tempo ? 15 : 0;

        return {
          ...track,
          score: Math.round(tagScore + energyScore + tempoScore),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return res.json({
      ...interpretation,
      recommendations,
    });
  } catch (error) {
    console.error("Mood interpretation failed:", error);

    return res.status(500).json({
      error:
        "Couldn't interpret your mood or fetch music. Check that Ollama is running and the Jamendo API is available.",
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Resonance API running at http://127.0.0.1:${PORT}`);
});
