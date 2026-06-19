import { Helmet } from "react-helmet-async";

const SITE = "GoodGame.center";

export default function SEO({ title, description, image, type = "website", path = "", noindex = false }) {
  const fullTitle = title ? `${title} · ${SITE}` : SITE;
  const desc =
    description ||
    "A free, browser-first platform for indie game creators and players. Play and ship HTML5 games.";
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      {path && <link rel="canonical" href={path} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
}
