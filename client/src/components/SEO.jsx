import { useEffect } from "react";

const BASE_URL = "https://makaziflow.afrinextech.co.ke";
const DEFAULT_TITLE = "MakaziFlow - Property Management Software in Busia & Kenya";
const DEFAULT_DESC = "MakaziFlow is rental property management software built in Busia, Kenya. Automate M-Pesa & Pesaflow rent collection, digital leases, utility billing, and financial reporting. Contact: info@afrinextech.co.ke | 0790264792.";
const DEFAULT_KEYWORDS = "MakaziFlow, property management software Kenya, rental management Busia, rental management Kenya, Pesaflow M-Pesa rent collection, landlord software Kenya, tenant billing system, property managers Kenya, AfrinexTech";
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
  aggregateRating = null,
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
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "name": "MakaziFlow",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web, iOS, Android",
          "url": BASE_URL,
          "offers": {
            "@type": "Offer",
            "price": "1500",
            "priceCurrency": "KES"
          },
          ...(aggregateRating && aggregateRating.reviewCount > 0
            ? {
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": String(aggregateRating.ratingValue),
                  "reviewCount": String(aggregateRating.reviewCount),
                  "bestRating": "5",
                  "worstRating": "1"
                }
              }
            : {}),
          "creator": {
            "@id": "https://afrinextech.co.ke/#organization"
          },
          "description": description
        },
        {
          "@type": "Organization",
          "@id": "https://afrinextech.co.ke/#organization",
          "name": "MakaziFlow by AfrinexTech",
          "url": BASE_URL,
          "email": "info@afrinextech.co.ke",
          "telephone": "+254790264792",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Busia",
            "addressRegion": "Busia County",
            "addressCountry": "KE"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+254790264792",
            "email": "info@afrinextech.co.ke",
            "contactType": "customer support",
            "areaServed": "KE"
          }
        }
      ]
    };

    setJsonLd(structuredData || defaultSchema);
  }, [title, description, keywords, canonicalPath, ogImage, ogType, noIndex, structuredData, aggregateRating]);

  return null;
}

