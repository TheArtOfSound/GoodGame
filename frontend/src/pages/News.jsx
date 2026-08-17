import { useEffect, useMemo, useState } from "react";
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

  const wire = useMemo(
    () => (articles || []).filter((a) => a.kind === "wire" || a.kind === "desk" || a.category === "wire" || a.category === "desk"),
    [articles],
  );
  const guides = useMemo(
    () => (articles || []).filter((a) => a.kind === "guide" || (!a.kind && a.category !== "wire" && a.category !== "desk")),
    [articles],
  );

  return (
    <div className="alley-zine" data-testid="news-page">
      <SEO
        title="Game News Desk — Daily Browser & Indie Coverage on GoodGame.center"
        description="A constantly updated game desk: original GoodGame write-ups of indie and browser-game news, plus evergreen publish guides. New URL every day."
        path="/news"
      />
      <div className="alley-zine-inner">
      <PageHeader
        eyebrow="Wheatpaste"
        title="Tonight’s paper"
        description="Feeds come in around the clock. We write the alley take — original copy, source cited — so Google and players can find a fresh page each day."
      />

      {!articles && <PageLoader label="Loading the desk" />}
      {error && <ErrorState className="mt-8" title="News could not load" body="The desk is temporarily dark." />}
      {!error && articles?.length === 0 && (
        <EmptyState className="mt-8" icon={Newspaper} title="No articles yet" body="The first ingest will land here." />
      )}

      {wire.length > 0 && (
        <section className="mt-10">
          <div className="eyebrow mb-3">On the wire</div>
          <div className="grid md:grid-cols-2 gap-5">
            {wire.map((a, i) => (
              <ArticleCard key={a.slug} a={a} tilt={((i * 17) % 7) - 3} />
            ))}
          </div>
        </section>
      )}

      {guides.length > 0 && (
        <section className="mt-12">
          <div className="eyebrow mb-3">Evergreen guides</div>
          <div className="grid md:grid-cols-2 gap-5">
            {guides.map((a, i) => (
              <ArticleCard key={a.slug} a={a} tilt={((i * 13) % 7) - 3} />
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

function ArticleCard({ a, tilt = -1 }) {
  return (
    <Link
      to={`/news/${a.slug}`}
      className="wheatpaste"
      style={{ "--tilt": `${tilt}deg` }}
      data-testid="news-card"
    >
      <span>
        {a.category}
        {a.source_name ? ` · via ${a.source_name}` : ""}
      </span>
      <h2>{a.title}</h2>
      <p>{a.excerpt}</p>
      <small>{a.date ? new Date(a.date).toLocaleDateString() : ""}</small>
    </Link>
  );
}
