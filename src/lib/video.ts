/**
 * Detect a public video URL and return either an iframe-embeddable URL
 * (YouTube / Vimeo) or a direct MP4/WebM URL the browser can play with
 * the native `<video>` tag. Returns `null` when the URL isn't a recognised
 * video source — callers should reject the input in that case.
 */
export type VideoEmbed =
  | { provider: "youtube"; embedUrl: string; videoId: string }
  | { provider: "vimeo"; embedUrl: string; videoId: string }
  | { provider: "direct"; embedUrl: string };

export function detectVideoEmbed(rawUrl: string): VideoEmbed | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{6,}$/.test(v)) {
      return {
        provider: "youtube",
        videoId: v,
        embedUrl: `https://www.youtube.com/embed/${v}`,
      };
    }
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
    if (m) {
      return {
        provider: "youtube",
        videoId: m[1],
        embedUrl: `https://www.youtube.com/embed/${m[1]}`,
      };
    }
  }
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (id && /^[\w-]{6,}$/.test(id)) {
      return {
        provider: "youtube",
        videoId: id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
      };
    }
  }

  // Vimeo: vimeo.com/123456789
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).find((p) => /^\d+$/.test(p));
    if (id) {
      return {
        provider: "vimeo",
        videoId: id,
        embedUrl: `https://player.vimeo.com/video/${id}`,
      };
    }
  }

  // Direct file
  if (/\.(mp4|webm|ogg|mov|m4v)(?:$|\?)/i.test(u.pathname)) {
    return { provider: "direct", embedUrl: rawUrl };
  }

  return null;
}

/**
 * Returns a YouTube/Vimeo poster image URL when available so we can show
 * a real thumbnail in the dashboard before the iframe loads.
 */
export function videoPosterUrl(embed: VideoEmbed): string | null {
  if (embed.provider === "youtube") {
    return `https://img.youtube.com/vi/${embed.videoId}/hqdefault.jpg`;
  }
  return null;
}
