# Public Scraping & Ingestion Feasibility: VGen, Cara, DeviantArt, and ArtStation

**Issue:** [`gOps132/ArtFind#3`](https://github.com/gOps132/ArtFind/issues/3)  
**Scope:** Evaluate dedicated visual-art and commission platforms (**VGen**, **Cara**, **DeviantArt**, **ArtStation**) as v1 Source Platforms for discovering visual illustrators and digital artists open to commissions.  
**Date verified:** 2026-11-27 (live HTTP probes against `robots.txt`, sitemaps, ToS pages, RSS/oEmbed/JSON endpoints, and official developer documentation).

---

## Executive Verdict

| Platform | Official Public API / Feed | Anti-Bot / Technical Barrier | ToS & Community Posture | Commission Metadata Richness | Indie MVP Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DeviantArt** | **Yes** — Official OAuth 2.0/2.1 REST API (`/api/v1/oauth2`), unauthenticated Media RSS (`backend.deviantart.com/rss.xml`), and oEmbed | Low on official API/RSS/oEmbed (Apache/CloudFront, adaptive `429` rate limits; `robots.txt` blocks `/api/` & cursor scraping) | Permits official API/RSS use with attribution; ToS Sec. 24 strictly bans using `noai`/`noimageai` works as AI training or AI input | **Medium (unstructured)** — Artist URL, tags, thumbnails (expiring signed WixMP JWT URLs), free-text descriptions; **no native Commission Status or structured price** (legacy Commissions feature phased out) | **ONLY viable v1 candidate among the four** — use official RSS + OAuth2 API/oEmbed only, strictly respect `noai` directives (no AI inference on `noai` images), and accept noisy/unstructured commission parsing. |
| **VGen** | **No** (internal `api.vgen.co` only; public Next.js SSR HTML + 29 XML sitemaps exist) | Low-to-moderate technically (Cloudflare + `_cfuvid`, pages currently return `200 OK` with `__NEXT_DATA__`) | **Explicitly prohibits** scraping, crawling, automated scripts, and compiling a directory/database in ToS; strongly anti-AI, artist-protective community | **Highest** — Native `status` (open/closed/waitlist), `basePrice`, `currency`, `tags`, `searchCategoryID`, `galleryItems`, `servicesStatus`, reviews | **AVOID scraping** — direct ToS violation. Only viable via **official partnership** (`help@vgen.co`), **artist self-submission**, or indexing VGen links artists publicly share on other platforms (e.g., DeviantArt/Reddit/Bluesky). |
| **ArtStation** | **No** (no public API, `/rss` returns `404`; undocumented explore JSON returns minimal cards) | **High** — Cloudflare Bot Management (`__cf_bm`, `cf-mitigated=challenge` HTTP `403` on `/tos`, `/sitemap.xml`, and `/users/{user}.json`) | **Explicitly prohibits** scraping/aggregating/distributing content in ToS; default-on `NoAI` tags; partners with Cloudflare to block scrapers | **Low for commissions** — Studio hiring focus (`available_full_time`, `available_contract`, `available_freelance`), no commission pricing or slot status | **AVOID** — ToS breach, active Cloudflare challenges, no official API, poor fit for consumer art commissions. |
| **Cara** | **No** (no public API, no RSS, no sitemap in `robots.txt`) | **High** — Cloudflare HTTP `403` on `/explore`, `/terms`, and `/sitemap.xml`; `robots.txt` blocks 30+ AI crawlers + AI agents (`FireCrawl`, etc.) | **Most hostile to scraping** — founded specifically as an anti-AI/anti-scraping safe haven; high-profile scraping incidents caused severe community backlash | **Low for commissions** — Portfolio/social feed + studio Jobs Board; no structured commission status or pricing | **HARD AVOID** — Cloudflare blocks, no API, poor commission structure, and severe reputational/community risk with ArtFind's target artist audience. |

**Bottom line for ArtFind v1:** Do **not** build an HTML scraper against any of these four platforms. **DeviantArt** is the only platform here with a clean, ToS-respecting, zero-cost programmatic ingestion path (unauthenticated Media RSS + official OAuth 2.0/2.1 REST API + oEmbed), though its commission metadata is unstructured and thumbnail URLs expire. **VGen** has ideal structured commission data, but its ToS explicitly forbids scraping/compiling a directory — pursue VGen only via artist opt-in or partnership. **ArtStation** and **Cara** should be excluded from v1.

---

## 1. VGen (`vgen.co`)

### Access Mechanism
- **Official Public API:** None. VGen does not offer a public developer API or developer portal. The web app communicates with an internal backend (`https://api.vgen.co`, visible in the CSP and `<link rel="preconnect">` headers on `https://vgen.co/`).
- **Public HTML & Sitemaps:**
  - `https://vgen.co/sitemap-index.xml` returns HTTP `200 OK` and lists **29 child sitemaps**, including `sitemap-users-1.xml`..`9.xml`, `sitemap-services-1.xml`..`13.xml`, `sitemap-serviceLists-1.xml`..`4.xml`, `sitemap-searchCategories-1.xml`, and `sitemap-customCategoryViews-1.xml`.
  - Public artist profiles (`https://vgen.co/{username}`) and service pages (`https://vgen.co/{username}/service/{slug}/{id}`) return HTTP `200 OK` as Next.js SSR pages containing a full `<script id="__NEXT_DATA__">` JSON payload.
- **`robots.txt` (`https://vgen.co/robots.txt`):** Served via Cloudflare Managed Content (`server: cloudflare`, `_cfuvid` cookie). Sets:
  - `User-agent: *` → `Content-Signal: search=yes,ai-train=no,use=reference` and `Allow: /`
  - `Disallow: /` for 30+ AI/training crawlers (`GPTBot`, `ClaudeBot`, `CCBot`, `Bytespider`, `Amazonbot`, `Applebot-Extended`, `Google-Extended`, `Diffbot`, `meta-externalagent`, etc.).
  - Declares `Sitemap: https://vgen.co/sitemap-index.xml`.
- **Anti-Bot / Barriers:** Protected by Cloudflare (`server: cloudflare`); `https://help.vgen.co/...` returns HTTP `403` to automated HTTP clients, while main `vgen.co` pages currently return `200 OK` without a JS challenge.

### ToS & Community Posture
- **Explicit Anti-Scraping & Anti-Directory Clauses:** VGen's official Terms of Service ([`https://vgen.co/terms-of-service`](https://vgen.co/terms-of-service)) explicitly prohibit users from doing any of the following:
  > *"use manual or automated software, Devices, scripts robots, other means or processes to access, 'scrape,' 'crawl' or 'spider' any web pages or other services contained in the Services or Content"*
  > *"use automated scripts to collect information or otherwise interact with the Service"*
  > *"systematically retrieve data or other content from the Service to create or compile, directly or indirectly, in single or multiple downloads, a collection, compilation, database, directory or the like, whether by manual methods, through the use of bots, crawlers, or spiders, or otherwise"*
- **Community Posture:** VGen's core brand is *"For the love of human creativity"* — invite-code-vetted human artists, strict anti-AI policy, and individual artist Terms of Service attached to every commission service. Scraping VGen to build an external directory directly violates both platform ToS and community trust.

### Metadata Richness
- **Best-in-class for commissions** (observed directly in `__NEXT_DATA__.props.pageProps` on a public service page):
  - **Artist Page URL & Profile (`user`):** `username` (`https://vgen.co/{username}`), `displayName`, `bio`, `avatarURL`, `bannerURL`, `socials`, `languages`, `defaultCurrency`, `artistReviewStats`, and an explicit account-level `servicesStatus`.
  - **Commission Services (`services`, `linkedService`):** `serviceName`, `basePrice`, `currency`, `status` (explicit open/closed/waitlist flag), `tags`, `searchCategoryID`, `searchCategoryVariantKeys`, `containsMatureContent`, `contentWarnings`, `galleryItems` (sample thumbnails hosted on `storage.vgen.co`), `description`, and `marketplaceVisibility`.

### Verdict
**Avoid scraping.** Despite having the cleanest commission data on the web and currently returning `200 OK` SSR pages, scraping VGen to populate a directory is an unambiguous breach of [`https://vgen.co/terms-of-service`](https://vgen.co/terms-of-service). Viable alternatives: (1) let artists submit/link their own VGen profiles to ArtFind, (2) contact VGen (`help@vgen.co`) for official partner/affiliate access, or (3) surface VGen URLs that artists themselves post on allowed discovery sources (e.g., DeviantArt/Reddit/Bluesky).

---

## 2. Cara (`cara.app`)

### Access Mechanism
- **Official Public API / RSS / Sitemap:** None. No public developer API, no RSS feeds, and no `Sitemap:` directive in `robots.txt`.
- **Anti-Bot / Cloudflare Barriers:** Direct HTTP probes to `https://cara.app/explore`, `https://cara.app/terms`, and `https://cara.app/sitemap.xml` all returned **HTTP `403`** served by Cloudflare (`server: cloudflare`).
- **`robots.txt` (`https://cara.app/robots.txt`):** Returns HTTP `200 OK` (Cloudflare Managed Content). Sets:
  - `User-agent: *` → `Content-Signal: search=yes,ai-train=no,use=reference` and `Allow: /`
  - `Disallow: /` for 30+ AI training crawlers (`GPTBot`, `ClaudeBot`, `CCBot`, `Bytespider`, `Google-Extended`, etc.) **plus** an explicit `# AI Agents` blocklist (`FireCrawl`, `FirecrawlAgent`, `Perplexity-User`, `Claude-User`, `ChatGPT-User`, `Google-Agent`, `Google-GeminiNotebook`, `Google-NotebookLM`, `MistralAI-User`, `meta-externalfetcher`, `Retool`, `Instapaper`, `ChathiveCrawler`).

### ToS & Community Posture
- **Strongly Anti-Scraping & Anti-AI:** Cara was founded by photographer Jingna Zhang specifically as a human-only artist haven for creators opting out of AI scraping, integrating built-in AI detection and Glaze/watermarking protections (sources: [Forbes](https://www.forbes.com/), [PetaPixel](https://petapixel.com/)).
- **Community Backlash Risk:** Cara has suffered high-profile unauthorized scraping incidents where third parties harvested public portfolio images into external datasets. Even non-AI scraping of Cara without explicit consent risks immediate community backlash from the exact artist demographic ArtFind needs to win over.

### Metadata Richness
- **Low for commissions:** Cara is a social portfolio network with a studio-oriented Jobs Board, not a commission marketplace. It lacks standardized commission pricing, slot availability, or machine-readable commission-open status flags; artists describe commissions in free-text bios or external links.

### Verdict
**Hard avoid.** Active Cloudflare `403` blocks, no public API, poor structured commission metadata, and extreme ToS/community-trust risk.

---

## 3. DeviantArt (`deviantart.com`)

### Access Mechanism
DeviantArt is the **only platform of the four** with official, documented programmatic access channels:
1. **Official OAuth 2.0 / 2.1 REST API (`https://www.deviantart.com/api/v1/oauth2/`):**
   - Official docs: [`https://deviantart.readme.io/docs/getting-started`](https://deviantart.readme.io/docs/getting-started) (redirected from `https://www.deviantart.com/developers/`).
   - Supports **Client Credentials** grant (server-side backend access to public endpoints with `client_id` + `client_secret`) as well as Authorization Code + PKCE.
   - Relevant public read endpoints: `/browse/newest`, `/browse/popular`, `/browse/tags`, `/deviation/metadata` (batch metadata by UUID including `tags`, `description`, `stats`, `submission`), and `/user/profile/{username}`.
   - Uses **adaptive rate limiting** (returns HTTP `429 Too Many Requests` + `Retry-After`) and requires an explicit `User-Agent` header, HTTP compression, and `dA-minor-version` header.
2. **Official Public Media RSS Feeds (`https://backend.deviantart.com/rss.xml`):**
   - Verified live: `https://backend.deviantart.com/rss.xml?q=commissions+open&type=deviation` returns **HTTP `200 OK`** (`text/xml`, Apache, no Cloudflare challenge, no auth required).
   - Supports keyword/tag search queries (`q=...`) and pagination via `<atom:link rel="next" href="...&offset=60" />`.
3. **Official oEmbed Endpoint (`https://backend.deviantart.com/oembed`):**
   - Verified live: `https://backend.deviantart.com/oembed?url={deviation_url}` returns **HTTP `200 OK`** JSON (`title`, `url`, `author_name`, `author_url`, `thumbnail_url`, dimensions) without auth.
- **`robots.txt` (`https://www.deviantart.com/robots.txt`):** Served via CloudFront/Apache. Sets `Disallow: /api/`, `Disallow: /*?*cursor=`, `Disallow: /download/`, `Crawl-delay: 1`, and `Sitemap: https://www.deviantart.com/sitemap-index.xml.gz`. (Confirms that HTML/cursor scraping is disallowed — use the official OAuth API, RSS, and oEmbed instead.)

### ToS & Community Posture
- **General Terms of Service — Section 24 ("Data Scraping & Machine Learning Activities"):** Verified directly at [`https://www.deviantart.com/about/policy/service/`](https://www.deviantart.com/about/policy/service/). DeviantArt attaches HTML `<meta name="robots" content="noai, noimageai">` and HTTP `X-Robots-Tag: noai` headers by default unless a creator opts in. Section 24 explicitly states:
  > *"When a DeviantArt user does not consent to third party use of their Content for Artificial Intelligence Purposes, other users of the Service and third parties accessing the Site are prohibited from using such Content (labeled as 'noai' and/or 'noimageai') (i) to train an artificial intelligence system, (ii) as input into any previously trained artificial intelligence system, or (iii) to make available any derivative copy unless usage of that copy is subject to conditions at least as restrictive as those set out here. Automated systems or users that fail to respect these choices will be considered to have breached these Terms."*
  - **Critical MVP implication:** ArtFind can index links/metadata via official RSS/API for traditional search/discovery, **but must NOT pass `noai`/`noimageai` DeviantArt images into any AI/ML model** (including CLIP embeddings, vision-LLM style tagging, or AI summarization) without explicit creator consent.
- **API License Agreement ([`https://www.deviantart.com/about/policy/api/`](https://www.deviantart.com/about/policy/api/)):** Free to use (DeviantArt may change payment policy with 60 days notice), requires **attribution** per Schedule 1 wherever DeviantArt content is displayed, prohibits benchmarking/monitoring site availability, and grants a revocable license (note: legacy Section 1 text still references Sta.sh integration — verify compliance before commercial launch).

### Metadata Richness
- **Medium (unstructured for commissions):**
  - **Available via RSS & Official API:** Artist Page URL (`https://www.deviantart.com/{username}`), deviation URL, title, `pubDate`, author username & avatar, `media:rating` (`nonadult`/`adult`), tags (`media:keywords` in RSS; `tags[].tag_name` in `/deviation/metadata`), HTML description (`media:description`), and sample thumbnail URLs.
  - **Gaps & Caveats:**
    1. **No structured Commission Status or pricing:** DeviantArt phased out its legacy native Commissions feature; commission availability and pricing only appear as unstructured text/images inside deviation titles, tags (`#commissionsopen`), and HTML descriptions (which frequently cross-link to VGen or Carrd — e.g., the top live RSS hit for `commissions open` linked directly to `https://vgen.co/Xia_00Nahayo`).
    2. **Expiring thumbnail URLs:** Both RSS `<media:thumbnail>` and oEmbed `url`/`thumbnail_url` return signed WixMP JWT URLs (`images-wixmp-...?token=eyJ...`) that expire; ArtFind must refresh or resolve thumbnails via API/oEmbed rather than storing permanent hotlinks.
    3. **AI-generated content noise:** DeviantArt allows AI-generated art (with labels), so ingestion pipelines must filter out AI-tagged deviations to preserve human-artist quality.

### Verdict
**Safest and cleanest of the four platforms for an indie MVP — with caveats.** Use **only** the official unauthenticated Media RSS (`backend.deviantart.com/rss.xml`), oEmbed, and OAuth 2.0/2.1 REST API (never HTML scraping). Enforce strict `noai` compliance (no vision/AI model inference on DeviantArt artwork), display required DeviantArt attribution, filter AI-generated art, and treat commission status/pricing as heuristic text extraction rather than authoritative structured data.

---

## 4. ArtStation (`artstation.com`)

### Access Mechanism
- **Official Public API / RSS:** None. ArtStation has no public developer API, and `https://www.artstation.com/rss` returns HTTP `404`.
- **Anti-Bot / Cloudflare Barriers:** ArtStation deploys **Cloudflare Bot Management** (`__cf_bm` cookie, `cf-mitigated=challenge`). Live probes returned **HTTP `403` Cloudflare challenge pages** for:
  - `https://www.artstation.com/tos`
  - `https://www.artstation.com/sitemap.xml`
  - `https://www.artstation.com/users/{username}.json`
  - `https://www.artstation.com/users/{username}/quick.json`
- **Undocumented Internal JSON:** Only `https://www.artstation.com/api/v2/community/explore/projects/trending.json?page=1&per_page=10` returned `200 OK` without a challenge, and it only exposes minimal project cards (`id`, `hash_id`, `url`, `title`, `smaller_square_cover_url`, `hide_as_adult`, `icons`, and minimal `user` fields: `id`, `username`, `full_name`, `medium_avatar_url`, `pro_member`, `is_studio_account`).
- **`robots.txt` (`https://www.artstation.com/robots.txt`):** Returns `200 OK` via Cloudflare, disallows likes/following/followers/collections/registration, and lists 9 sitemaps (though `sitemap.xml` itself is Cloudflare-challenged for non-browser clients).

### ToS & Community Posture
- **Explicit Anti-Scraping ToS:** ArtStation's Terms of Service (`https://www.artstation.com/tos`, Epic Games / KitBash AS Operations LLC) explicitly prohibit collecting, aggregating, mining, or scraping site content for publishing, selling, distributing, or making it available to others, and strictly prohibit using `NoAI`-tagged content in AI datasets or inputs.
- **Default-On `NoAI` & Active Enforcement:** ArtStation applies `NoAI` meta tags by default across portfolios and explicitly partners with Cloudflare to block automated scraping at scale.

### Metadata Richness
- **Low for consumer art commissions:** ArtStation is primarily a professional game/VFX/entertainment industry portfolio and studio recruiting platform (profiles track `available_full_time`, `available_contract`, `available_freelance` — all gated behind Cloudflare `403` on profile JSON). It has no structured commission pricing, no commission-open status flag, and no tags on the unchallenged explore JSON endpoint.

### Verdict
**Avoid.** No official API, explicit ToS prohibition on scraping/aggregating content, active Cloudflare Bot Management challenges on profiles/sitemaps, and poor domain fit for individual consumer art commissions.

---

## Summary Recommendation for Issue #4 (Choose v1 Source Platforms)

1. **Consider for v1 (with strict guardrails):** **DeviantArt** — via official Media RSS (`backend.deviantart.com/rss.xml`) + OAuth 2.0/2.1 REST API + oEmbed. Best used as a secondary/supplemental source alongside social platforms (Reddit/Bluesky), while respecting `noai` (no AI inference on images), handling expiring WixMP thumbnail tokens, and filtering AI-generated art.
2. **Do NOT scrape in v1:** **VGen** (explicit ToS ban on scraping/compiling a directory — pursue only via artist self-submission or official partnership), **ArtStation** (ToS ban + Cloudflare challenges + studio-hiring focus), and **Cara** (Cloudflare `403` blocks + extreme anti-scraping community posture + no structured commission data).
