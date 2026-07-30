import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import { ErrorState, PageLoader } from "../components/UIState";

export default function NewsArticle() {
  const { slug } = useParams();
  const [a, setA] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setA(null);
    setErr(false);
    getJSON(`/news/${slug}`)
      .then((d) => setA(d.article))
      .catch(() => setErr(true));
  }, [slug]);

  if (err)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20" data-testid="news-not-found">
        <ErrorState title="Article not found" body="This guide may have moved or been unpublished." action={<Link to="/news" className="btn-secondary">Back to news</Link>} />
      </div>
    );
  if (!a) return <PageLoader label="Loading article" />;

  return (
    <article className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="news-article">
      <SEO title={a.title} description={a.excerpt} type="article" path={`/news/${a.slug}`} />
      <Link to="/news" className="text-[#52525B] hover:text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em]">
        &larr; News
      </Link>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-4" style={{ color: a.accent }}>
        {a.category} &middot; {new Date(a.date).toLocaleDateString()}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-white mt-2 leading-tight">{a.title}</h1>
      <p className="text-[#A1A1AA] text-lg mt-4 leading-relaxed">{a.excerpt}</p>

      <div className="mt-8 space-y-4">
        {a.body.map((block, i) =>
          block.startsWith("## ") ? (
            <h2 key={i} className="text-white text-xl font-bold mt-8">
              {block.slice(3)}
            </h2>
          ) : (
            <p key={i} className="text-[#C7C7CC] leading-relaxed">
              {block}
            </p>
          )
        )}
      </div>

      <div className="mt-12 border-t border-[#1A1A1A] pt-6 flex flex-wrap gap-3">
        <Link
          to="/games"
          className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11 flex items-center"
        >
          Play games
        </Link>
        <Link
          to="/create"
          className="border border-[#1A1A1A] hover:border-white text-white font-bold uppercase tracking-wider text-sm px-5 h-11 flex items-center"
        >
          Create a game
        </Link>
      </div>
    </article>
  );
}
