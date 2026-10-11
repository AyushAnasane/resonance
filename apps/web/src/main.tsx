import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Track = {
  id: string;
  title: string;
  artist: string;
  tags: string[];
  energy: number;
  tempo: "slow" | "medium" | "fast";
  score: number;
  duration?: number;
  image?: string;
  audio?: string;
  downloadAllowed?: boolean;
  licenseUrl?: string | null;
};

type MoodResult = {
  mood: string;
  tags: string[];
  energy: number;
  tempo: "slow" | "medium" | "fast";
  recommendations: Track[];
};

function formatDuration(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "";
  }

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function App() {
  const [mood, setMood] = useState("");
  const [result, setResult] = useState<MoodResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


const [spotifyConnected, setSpotifyConnected] = useState(false);
const [spotifyLoading, setSpotifyLoading] = useState(true);


const [playlistLoading, setPlaylistLoading] = useState(false);
const [playlistMessage, setPlaylistMessage] = useState("");
const [playlistUrl, setPlaylistUrl] = useState("");


async function checkSpotifyStatus() {
  try {
    const response = await fetch(
      "http://127.0.0.1:3000/api/spotify/status",
      { credentials: "include" }
    );

    if (!response.ok) {
      throw new Error("Could not check Spotify connection.");
    }

    const data = await response.json();
    setSpotifyConnected(data.connected === true);
  } catch (error) {
    console.error("Spotify status check failed:", error);
    setSpotifyConnected(false);
  } finally {
    setSpotifyLoading(false);
  }
}


async function disconnectSpotify() {
  try {
    const response = await fetch(
      "http://127.0.0.1:3000/api/spotify/disconnect",
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not disconnect Spotify.");
    }

    setSpotifyConnected(false);
    setMessage("Spotify disconnected.");
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Could not disconnect Spotify."
    );
  }
}


async function createSpotifyPlaylist() {
  if (!result || !spotifyConnected) {
    setPlaylistMessage("Connect Spotify and find your mood first.");
    return;
  }

  setPlaylistLoading(true);
  setPlaylistMessage("");
  setPlaylistUrl("");

  try {
    const trackUris: string[] = [];
    const seenUris = new Set<string>();

    for (const track of result.recommendations) {
      const query = `${track.title} ${track.artist}`;

      const searchResponse = await fetch(
        `http://127.0.0.1:3000/api/spotify/search?q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );

      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        throw new Error(
          searchData.error || "Couldn't search Spotify tracks."
        );
      }

      const match = searchData.tracks?.[0];

      if (match?.uri && !seenUris.has(match.uri)) {
        seenUris.add(match.uri);
        trackUris.push(match.uri);
      }
    }

    if (trackUris.length === 0) {
      throw new Error("No matching Spotify tracks were found.");
    }

    const playlistResponse = await fetch(
      "http://127.0.0.1:3000/api/spotify/playlists",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: `Resonance — ${result.mood}`,
          description: `A playlist curated for the mood: ${result.mood}.`,
          trackUris,
        }),
      }
    );

    const playlistData = await playlistResponse.json();

    if (!playlistResponse.ok) {
      throw new Error(
        playlistData.error || "Couldn't create the Spotify playlist."
      );
    }

    setPlaylistUrl(playlistData.playlistUrl);
    setPlaylistMessage(
      `Playlist created with ${playlistData.tracksAdded} tracks!`
    );
  } catch (error) {
    setPlaylistMessage(
      error instanceof Error
        ? error.message
        : "Something went wrong creating the playlist."
    );
  } finally {
    setPlaylistLoading(false);
  }
}



useEffect(() => {
  checkSpotifyStatus();

  if (new URLSearchParams(window.location.search).get("spotify") === "connected") {
    window.history.replaceState({}, "", "/");
  }
}, []);

  
  async function handleSubmit() {
    if (!mood.trim()) {
      setMessage("Tell us how you're feeling first.");
      setResult(null);
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:3000/api/moods/interpret",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: mood }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult({
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        recommendations: Array.isArray(data.recommendations)
          ? data.recommendations
          : [],
      } as MoodResult);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn't connect to Resonance. Check that the backend and Ollama are running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#101010",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <p style={{ color: "#1DB954", letterSpacing: 4, textAlign: "center" }}>
        YOUR PERSONAL MUSIC CURATOR
      </p>

      <h1 style={{ fontSize: "clamp(48px, 10vw, 88px)", margin: "12px 0" }}>
        Resonance.
      </h1>

      <p style={{ color: "#aaa", textAlign: "center" }}>
        Your feelings, translated into music.
      </p>


<div
  style={{
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  }}
>
  {spotifyConnected ? (
    <>
      <span style={{ color: "#1DB954", fontSize: 14 }}>
        ● Spotify connected
      </span>

      <button
        onClick={disconnectSpotify}
        style={{
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid #444",
          background: "#222",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Disconnect
      </button>
    </>
  ) : (
    <button
      onClick={() => {
  if (spotifyConnected) {
    void disconnectSpotify();
  } else {
    window.location.href = "http://127.0.0.1:3000/api/spotify/login";
  }
}}
      disabled={spotifyLoading}
      style={{
        padding: "11px 20px",
        borderRadius: 999,
        border: "1px solid #1DB954",
        background: "transparent",
        color: "#fff",
        fontWeight: 600,
        cursor: spotifyLoading ? "wait" : "pointer",
      }}
    >
      {spotifyLoading
  ? "Checking Spotify..."
  : spotifyConnected
    ? "Disconnect Spotify"
    : "Connect Spotify"}
    </button>
  )}
</div>



      <textarea
        value={mood}
        onChange={(event) => setMood(event.target.value)}
        placeholder="Describe how you're feeling..."
        style={{
          width: "min(100%, 500px)",
          minHeight: 120,
          marginTop: 32,
          padding: 18,
          borderRadius: 14,
          border: "1px solid #333",
          background: "#1a1a1a",
          color: "#fff",
          fontSize: 16,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "14px 28px",
          borderRadius: 999,
          border: "none",
          background: loading ? "#777" : "#1DB954",
          color: "#000",
          fontSize: 16,
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Finding your sound..." : "Find my sound"}
      </button>

      {message && (
        <p role="alert" style={{ color: "#ff8585", marginTop: 20 }}>
          {message}
        </p>
      )}

      {result && (
        <section
          aria-live="polite"
          style={{
            width: "min(100%, 500px)",
            boxSizing: "border-box",
            marginTop: 32,
            padding: 24,
            border: "1px solid #303030",
            borderRadius: 18,
            background: "#181818",
          }}
        >
          <p style={{ color: "#1DB954", letterSpacing: 2, fontSize: 12 }}>
            YOUR MOOD, DECODED
          </p>

          <h2 style={{ fontSize: 32, margin: "8px 0 20px" }}>
            {result.mood}
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#252525",
                  color: "#ddd",
                  fontSize: 14,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 24,
            }}
          >
            <div>
              <p style={{ color: "#888", fontSize: 13 }}>ENERGY</p>
              <p style={{ fontSize: 20, margin: 0 }}>
                {result.energy}/5
              </p>
            </div>

            <div>
              <p style={{ color: "#888", fontSize: 13 }}>TEMPO</p>
              <p
                style={{
                  fontSize: 20,
                  margin: 0,
                  textTransform: "capitalize",
                }}
              >
                {result.tempo}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>
              Made for your mood
            </h3>

            {result.recommendations.map((track, index) => (
              <article
                key={track.id}
                style={{
                  padding: 14,
                  marginTop: 12,
                  borderRadius: 12,
                  background: "#222",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {track.image ? (
                    <img
                      src={track.image}
                      alt={`Cover art for ${track.title}`}
                      loading="lazy"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        objectFit: "cover",
                        background: "#303030",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        background: "#303030",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1DB954",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                      {track.title}
                    </div>
                    <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>
                      {track.artist}
                    </div>
                    <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                      {formatDuration(track.duration)}
                      {track.tags?.length ? ` · ${track.tags.slice(0, 3).join(", ")}` : ""}
                    </div>
                  </div>

                  <div style={{ color: "#1DB954", fontSize: 12, flexShrink: 0 }}>
                    #{index + 1}
                  </div>
                </div>

                {track.audio && (
                  <audio
                    controls
                    preload="none"
                    src={track.audio}
                    style={{
                      width: "100%",
                      height: 38,
                      marginTop: 12,
                    }}
                  >
                    Your browser does not support audio playback.
                  </audio>
                )}

                {track.licenseUrl && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                    <a
                      href={track.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#aaa" }}
                    >
                      Track licence
                    </a>
                  </div>
                )}
              </article>
            ))}

            {result.recommendations.length === 0 && (
              <p style={{ color: "#aaa" }}>
                No matching tracks found. Try describing your mood differently.
              </p>
            )}


{spotifyConnected && result.recommendations.length > 0 && (
  <div style={{ marginTop: 24 }}>
    <button
      onClick={createSpotifyPlaylist}
      disabled={playlistLoading}
      style={{
        width: "100%",
        padding: "14px 20px",
        borderRadius: 999,
        border: "none",
        background: playlistLoading ? "#777" : "#1DB954",
        color: "#000",
        fontWeight: 700,
        cursor: playlistLoading ? "wait" : "pointer",
      }}
    >
      {playlistLoading
        ? "Creating your playlist..."
        : "Create Spotify Playlist"}
    </button>

    {playlistMessage && (
      <p role="status" style={{ color: "#ddd", marginTop: 12 }}>
        {playlistMessage}
      </p>
    )}

    {playlistUrl && (
      <a
        href={playlistUrl}
        target="_blank"
        rel="noreferrer"
        style={{ color: "#1DB954", display: "inline-block", marginTop: 8 }}
      >
        Open playlist in Spotify
      </a>
    )}
  </div>
)}


            <p style={{ color: "#777", fontSize: 11, lineHeight: 1.5, marginTop: 16 }}>
              Music provided by Jamendo. Playback availability and usage rights
              depend on each track's terms and licence.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
