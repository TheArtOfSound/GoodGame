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
        <ErrorState title="Article not found" body="This desk item may have moved." action={<Link to="/news" className="btn-secondary">Back to news</Link>} />
      </div>
    );
  if (!a) return <PageLoader label="Loading article" />;

  return (
    <div className="alley-zine">
    <article className="alley-zine-sheet" data-testid="news-article">
      <SEO title={a.title} description={a.excerpt} type="article" path={`/news/${a.slug}`} />
      <Link to="/news" className="font-mono text-xs uppercase tracking-[0.2em]">
        ← The desk
      </Link>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-4" style={{ color: "var(--rust)" }}>
        {a.category}
        {a.date ? ` · ${new Date(a.date).toLocaleDateString()}` : ""}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mt-2 leading-tight">{a.title}</h1>
      <p className="text-lg mt-4 leading-relaxed">{a.excerpt}</p>

      <div className="mt-8 space-y-4">
        {(a.body || []).map((block, i) =>
          String(block).startsWith("## ") ? (
            <h2 key={i} className="text-xl font-bold mt-8">
              {String(block).slice(3)}
            </h2>
          ) : (
            <p key={i} className="leading-relaxed">
              {block}
            </p>
          )
        )}
      </div>

      {a.source_url && (
        <p className="mt-8 text-sm text-[#9aa7a4]">
          Original reporting:{" "}
          <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="text-[#7EF0FF] underline">
            {a.source_name || "source"}
            {a.source_title ? ` — ${a.source_title}` : ""}
          </a>
          . This page is GoodGame’s own write-up, not a reprint.
        </p>
      )}

      <div className="mt-12 border-t border-[#1A1A1A] pt-6 flex flex-wrap gap-3">
        <Link to="/games" className="btn-primary h-11 px-5">
          Play games
        </Link>
        <Link to="/create" className="btn-secondary h-11 px-5">
          Host a game
        </Link>
        <Link to="/news" className="btn-secondary h-11 px-5">
          More desk
        </Link>
      </div>
    </article>
    </div>
  );
}
