import { Link } from "react-router-dom";
import { MessageSquare, Share2 } from "lucide-react";
import { toast } from "sonner";
import { authPath } from "../lib/navigation";

export default function ShareActions({ game, user, compact = false }) {
  const shareUrl = `${window.location.origin}/games/${game.slug}`;
  const shareText = `I’m playing ${game.title} on GoodGame.center 🎮\n${shareUrl}`;
  const feedPath = `/feed?share=${encodeURIComponent(shareText)}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${game.title} on GoodGame.center`,
          text: game.pitch || `Play ${game.title} in your browser.`,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Game link copied.");
    } catch (_error) {
      toast.error("Could not copy the game link.");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="game-share-actions">
      <button
        type="button"
        onClick={share}
        className={compact ? "btn-secondary h-10 px-3" : "btn-secondary"}
        data-testid="share-game-button"
      >
        <Share2 className="w-4 h-4" /> Share
      </button>
      <Link
        to={user ? feedPath : authPath("/login", feedPath)}
        className={compact ? "btn-secondary h-10 px-3" : "btn-secondary"}
        data-testid="share-to-feed-link"
      >
        <MessageSquare className="w-4 h-4" /> Post to feed
      </Link>
    </div>
  );
}
