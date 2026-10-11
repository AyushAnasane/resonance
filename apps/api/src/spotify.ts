
import express from "express";
import crypto from "node:crypto";
import dotenv from "dotenv";

const router = express.Router();

dotenv.config({ path: "../../.env" });

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = "http://127.0.0.1:3000/api/spotify/callback";

router.get("/login", (_req, res) => {
  if (!clientId || !clientSecret) {
    return res.status(500).send("Spotify credentials are missing.");
  }

  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "playlist-modify-private",
    state,
  });

  return res.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const savedState = req.cookies?.spotify_oauth_state;

  res.clearCookie("spotify_oauth_state");

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    typeof savedState !== "string" ||
    state !== savedState
  ) {
    return res.status(400).send("Spotify authorization could not be verified.");
  }

  if (!clientId || !clientSecret) {
    return res.status(500).send("Spotify credentials are missing.");
  }

  try {
    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      return res.status(502).send("Spotify token exchange failed.");
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    req.session.spotifyAccessToken = tokenData.access_token;
    req.session.spotifyRefreshToken = tokenData.refresh_token;
    req.session.spotifyTokenExpiresAt =
      Date.now() + tokenData.expires_in * 1000;

    req.session.save((error) => {
      if (error) {
        console.error("Spotify session save failed:", error);
        return res.status(500).send("Could not save Spotify connection.");
      }

      return res.redirect("http://127.0.0.1:5173/?spotify=connected");
    });
  } catch (error) {
    console.error("Spotify callback failed:", error);
    return res.status(500).send("Spotify authorization failed.");
  }
});

router.get("/status", (req, res) => {
  res.json({
    connected: Boolean(req.session.spotifyAccessToken),
  });
});

router.post("/disconnect", (req, res) => {
  delete req.session.spotifyAccessToken;
  delete req.session.spotifyRefreshToken;
  delete req.session.spotifyTokenExpiresAt;

  req.session.save((error) => {
    if (error) {
      return res.status(500).json({
        error: "Could not disconnect Spotify.",
      });
    }

    return res.json({ success: true, connected: false });
  });
});


router.post("/playlists", async (req, res) => {
  const accessToken = req.session.spotifyAccessToken;

  if (!accessToken) {
    return res.status(401).json({
      error: "Connect your Spotify account first.",
    });
  }

  const { name, description, trackUris } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Array.isArray(trackUris) ||
    trackUris.length === 0 ||
    !trackUris.every(
      (uri: unknown) =>
        typeof uri === "string" &&
        /^spotify:track:[A-Za-z0-9]+$/.test(uri)
    )
  ) {
    return res.status(400).json({
      error: "Provide a playlist name and valid Spotify track URIs.",
    });
  }

  try {
    const playlistResponse = await fetch(
      "https://api.spotify.com/v1/me/playlists",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description:
            typeof description === "string" ? description : "",
          public: false,
        }),
      }
    );

    if (!playlistResponse.ok) {
      const details = await playlistResponse.text();
      console.error("Spotify playlist creation failed:", details);

      return res.status(502).json({
        error: "Spotify could not create the playlist.",
      });
    }

    const playlist = (await playlistResponse.json()) as {
      id: string;
      name: string;
      external_urls: { spotify: string };
    };

    const itemsResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris.slice(0, 100),
        }),
      }
    );

    if (!itemsResponse.ok) {
      const details = await itemsResponse.text();
      console.error("Spotify playlist items failed:", details);

      return res.status(502).json({
        error: "Playlist created, but Spotify could not add the tracks.",
        playlistUrl: playlist.external_urls.spotify,
      });
    }

    return res.json({
      success: true,
      playlistName: playlist.name,
      playlistUrl: playlist.external_urls.spotify,
      tracksAdded: Math.min(trackUris.length, 100),
    });
  } catch (error) {
    console.error("Spotify playlist error:", error);

    return res.status(500).json({
      error: "Something went wrong while creating the playlist.",
    });
  }
});

router.post("/disconnect", (req, res) => {
  req.session.spotifyAccessToken = undefined;
  req.session.spotifyRefreshToken = undefined;
  req.session.spotifyTokenExpiresAt = undefined;

  req.session.save((error) => {
    if (error) {
      return res.status(500).json({
        error: "Could not disconnect Spotify.",
      });
    }

    return res.json({ success: true });
  });
});


router.get("/search", async (req, res) => {
  const accessToken = req.session.spotifyAccessToken;

  if (!accessToken) {
    return res.status(401).json({
      error: "Connect your Spotify account first.",
    });
  }

  const query = req.query.q;

  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({
      error: "Provide a track search query.",
    });
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      type: "track",
      limit: "5",
    });

    const response = await fetch(
      `https://api.spotify.com/v1/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Spotify track search failed:", details);

      return res.status(502).json({
        error: "Spotify track search failed.",
      });
    }

    const data = (await response.json()) as {
      tracks?: {
        items?: {
          id: string;
          name: string;
          uri: string;
          artists: { name: string }[];
          external_urls: { spotify: string };
        }[];
      };
    };

    return res.json({
      tracks: (data.tracks?.items ?? []).map((track) => ({
        id: track.id,
        name: track.name,
        uri: track.uri,
        artists: track.artists.map((artist) => artist.name),
        url: track.external_urls.spotify,
      })),
    });
  } catch (error) {
    console.error("Spotify search error:", error);

    return res.status(500).json({
      error: "Something went wrong while searching Spotify.",
    });
  }
});


router.post("/disconnect", (req, res) => {
  req.session.spotifyAccessToken = undefined;
  req.session.spotifyRefreshToken = undefined;
  req.session.spotifyTokenExpiresAt = undefined;

  req.session.save((error) => {
    if (error) {
      return res.status(500).json({
        error: "Could not disconnect Spotify.",
      });
    }

    return res.json({ success: true });
  });
});

export default router;
