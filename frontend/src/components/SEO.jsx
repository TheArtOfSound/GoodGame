import { Helmet } from "react-helmet-async";

const SITE = "GoodGame.center";
const SITE_URL = "https://goodgame.center";

const absoluteUrl = (value, fallback = SITE_URL) => {
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

export default function SEO({ title, description, image, type = "website", path = "", noindex = false }) {
  // Only overwrite the server-injected title/description when the page has
  // something more specific. Bare <SEO path="/" /> must not collapse the
  // keyword-rich shell title down to "GoodGame.center".
  const fullTitle = title
    ? (title.includes("GoodGame") ? title : `${title} · ${SITE}`)
    : null;
  const desc = description || null;
  const canonical = absoluteUrl(path || "/");
  const imageUrl = image ? absoluteUrl(image) : null;
  return (
    <Helmet>
      {fullTitle && <title>{fullTitle}</title>}
      {desc && <meta name="description" content={desc} />}
      <meta
        name="robots"
        content={noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}
      />
      <meta property="og:site_name" content={SITE} />
      {fullTitle && <meta property="og:title" content={fullTitle} />}
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      {fullTitle && <meta name="twitter:title" content={fullTitle} />}
      {desc && <meta name="twitter:description" content={desc} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      <link rel="canonical" href={canonical} />
    </Helmet>
  );
}
