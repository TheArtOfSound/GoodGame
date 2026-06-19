import { Helmet } from "react-helmet-async";

const SITE = "GoodGame.center";
const SITE_URL = "https://goodgame.center";

const absoluteUrl = (value, fallback = SITE_URL) => {
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

export default function SEO({ title, description, image, type = "website", path = "", noindex = false }) {
  const fullTitle = title ? `${title} · ${SITE}` : SITE;
  const desc =
    description ||
    "A free, browser-first platform for indie game creators and players. Play and ship HTML5 games.";
  const canonical = absoluteUrl(path || "/");
  const imageUrl = image ? absoluteUrl(image) : null;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta
        name="robots"
        content={noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}
      />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      <link rel="canonical" href={canonical} />
    </Helmet>
  );
}
