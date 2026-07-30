import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import { Newspaper } from "lucide-react";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../components/UIState";

export default function News() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    getJSON("/news")
      .then((d) => setArticles(d.articles || []))
      .catch(() => {
        setArticles([]);
        setError(true);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10" data-testid="news-page">
      <SEO
        title="News & Guides"
        description="Browser-game news, creator guides, and how-tos from GoodGame.center: make a game with AI, publish HTML5 games, and find the best free browser games."
        path="/news"
      />
      <PageHeader
        eyebrow="Newsroom"
        title="News & Guides"
        description="Practical guides and updates on playing, making, and publishing browser games."
      />

      {!articles && <PageLoader label="Loading articles" />}
      {error && <ErrorState className="mt-8" title="News could not load" body="The article index is temporarily unavailable." />}
      {!error && articles?.length === 0 && (
        <EmptyState className="mt-8" icon={Newspaper} title="No articles yet" body="Guides and platform updates will appear here." />
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {(articles || []).map((a) => (
          <Link
            key={a.slug}
            to={`/news/${a.slug}`}
            className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-5 block transition-colors group"
            data-testid="news-card"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: a.accent }}>
              {a.category}
            </div>
            <h2 className="text-white group-hover:text-[#F1D77A] text-lg font-bold mt-2 leading-snug">{a.title}</h2>
            <p className="text-[#A1A1AA] text-sm mt-2">{a.excerpt}</p>
            <div className="text-[#52525B] font-mono text-[10px] mt-3">
              {new Date(a.date).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
