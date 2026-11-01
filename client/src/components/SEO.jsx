import { useEffect } from "react";

const BASE_URL = "https://makaziflow.afrinextech.co.ke";
const DEFAULT_TITLE = "MakaziFlow - Property Management Software in Kenya & Africa";
const DEFAULT_DESC = "MakaziFlow empowers African landlords and property managers with intelligent M-Pesa automated rent collection, digital leases, utility tracking, and real-time financial reporting.";
const DEFAULT_KEYWORDS = "MakaziFlow, property management software Kenya, rental management Nairobi, M-Pesa automated rent collection, landlord software Kenya, tenant billing system, property managers Kenya, real estate software Africa, AfrinexTech";
const DEFAULT_OG_IMAGE = `${BASE_URL}/opengraph.jpg`;

function setMetaTag(attributeName, attributeValue, content) {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(href) {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function setJsonLd(schemaData) {
  let script = document.getElementById("seo-jsonld");
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", "seo-jsonld");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaData);
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  keywords = DEFAULT_KEYWORDS,
  canonicalPath = "",
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
  structuredData = null,
}) {
  useEffect(() => {
    // 1. Title
    const fullTitle = title 
      ? `${title} | MakaziFlow by AfrinexTech`
      : DEFAULT_TITLE;
    document.title = fullTitle;

    // 2. Canonical URL
    const fullCanonical = canonicalPath.startsWith("http")
      ? canonicalPath
      : `${BASE_URL}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
    setCanonical(fullCanonical);

    // 3. Core Meta Tags
    setMetaTag("name", "description", description);
    setMetaTag("name", "keywords", keywords);
    setMetaTag("name", "author", "AfrinexTech");
    setMetaTag("name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    // 4. Open Graph / Social Media
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:url", fullCanonical);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:site_name", "MakaziFlow by AfrinexTech");

    // 5. Twitter Card
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:site", "@AfrinexTech");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);

    // 6. Schema.org Structured Data (JSON-LD)
    const defaultSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "MakaziFlow",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web, iOS, Android",
      "url": BASE_URL,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KES"
      },
      "creator": {
        "@type": "Organization",
        "name": "AfrinexTech",
        "url": "https://afrinextech.co.ke"
      },
      "description": description
    };

    setJsonLd(structuredData || defaultSchema);
  }, [title, description, keywords, canonicalPath, ogImage, ogType, noIndex, structuredData]);

  return null;
}

