import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../lib/api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ClipDetail() {
  const { idslug } = useParams();
  const [clip, setClip] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getJSON(`/clips/${idslug}`)
      .then((d) => setClip(d.clip))
      .catch(() => setErr("Clip not found"));
  }, [idslug]);

  if (err)
    return (
      <div className="px-8 py-20 text-center" data-testid="clip-not-found">
        <h1 className="text-2xl uppercase text-white font-bold">Clip not found</h1>
      </div>
    );
  if (!clip) return <div className="px-8 py-10 text-[#52525B]">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10" data-testid="clip-detail">
      <video
        controls
        playsInline
        preload="metadata"
        src={`${BACKEND}${clip.video_path}`}
        className="w-full aspect-video bg-black border border-[#1A1A1A]"
        data-testid="clip-video"
      />
      <h1 className="text-2xl font-bold text-white mt-4">{clip.caption || "Untitled"}</h1>
      <div className="text-[#A1A1AA] font-mono text-xs uppercase tracking-[0.2em] mt-1">
        by{" "}
        <Link to={`/creators/${clip.author_username}`} className="text-[#D4AF37] hover:underline">
          @{clip.author_username}
        </Link>
        {clip.game_slug && (
          <>
            {" • "}
            <Link to={`/games/${clip.game_slug}`} className="text-[#D4AF37] hover:underline">
              {clip.game_title}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
