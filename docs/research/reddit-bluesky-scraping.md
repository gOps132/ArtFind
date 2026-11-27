# Research: Public Scraping Feasibility of Reddit and Bluesky for Visual Artists

- **Ticket**: [gOps132/ArtFind#2](https://github.com/gOps132/ArtFind/issues/2)
- **Date**: 2026-11-27
- **Scope**: Evaluate **Reddit** (`r/hungryartists`, `r/commissions`, `r/artcommissions`) and **Bluesky** (AT Protocol public API / AppView / custom feeds / Jetstream) as v1 **Source Platforms** for discovering visual **Artists** open to commissions.

---

## Executive Verdict

**Bluesky (AT Protocol) is the clear winner for an indie MVP — easiest, cleanest, and safest.**

- **Bluesky** provides free, unauthenticated, typed JSON APIs (`app.bsky.feed.getFeed`, `app.bsky.actor.searchActors`, `app.bsky.actor.getProfiles`, `app.bsky.feed.searchPosts`) plus a real-time JSON WebSocket firehose (**Jetstream**) with **$0 API cost**, no pre-approval gate, and an open federated protocol explicitly designed for third-party indexing and discovery.
- **Reddit** is **high-risk and unsuitable for a zero-cost commercial/indie MVP**: unauthenticated `.json` and `.rss` endpoints are actively blocked (`HTTP 403` / `HTTP 429` in live probes), `robots.txt` disallows all crawlers (`Disallow: /`), self-service API access is gated behind written approval under the **Responsible Builder Policy**, and free-tier OAuth access explicitly prohibits commercial use without a separate paid agreement.

| Dimension | Reddit (`r/hungryartists`, `r/commissions`, `r/artcommissions`) | Bluesky (AT Protocol) |
| :--- | :--- | :--- |
| **Access Mechanism** | OAuth 2.0 Data API (requires pre-approval); unauthenticated `.json`/`.rss` blocked (`403`/`429`) | Public XRPC HTTP endpoints + **Jetstream** WebSocket; no API key required for public reads |
| **Free / Near-Zero Cost Viability** | **No** for commercial products (free tier is strictly non-commercial & gated) | **Yes ($0 API cost)**; only minimal compute for a poller or Jetstream consumer |
| **Rate Limits** | 100 QPM per OAuth client ID (10-min rolling avg) if approved | ~3,000 req / 5 min per IP on AppView reads + CDN caching; unlimited single-socket stream on Jetstream |
| **ToS & Indexing Safety** | **High risk**: `robots.txt` `Disallow: /`, scraping banned, commercial use requires separate license | **Low risk**: Open protocol; public data by design; must honor deletions/blocks and avoid AI training |
| **Metadata Richness** | **Very high** per post (subreddit rules require portfolios & pricing), but unstructured across title/body/comments | **Moderate-to-high** when combining post + bio + `pinnedPost` (84% have sample images; 82% have a `pinnedPost`) |
| **Commission Status Signals** | Strong open signal (`[For Hire]` tag/flair), **poor** closed signal (must infer staleness via TTL) | Strong open signal (`#commissionsopen`, curated feeds, bio) + **better** closed/live detection (`#commissionsclosed`, real-time profile edits via Jetstream) |
| **v1 MVP Recommendation** | **Defer / Avoid for v1** | **Adopt as primary v1 Source Platform** |

---

## 1. Access Mechanism

### Reddit
- **Official Data API (`oauth.reddit.com`)**: Requires OAuth 2.0 authentication and **prior written approval** under Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) and [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16550970174484-Reddit-Data-API-Wiki). Self-service API key/app creation without review is closed; developers must submit a use-case application via Reddit support.
- **Unauthenticated JSON / RSS (Live Probe, 2026-11-27)**:
  - `https://www.reddit.com/r/hungryartists/new.json?limit=5` → **`HTTP 403 Blocked`**
  - `https://www.reddit.com/r/commissions/new.json?limit=5` → **`HTTP 403 Blocked`**
  - `https://www.reddit.com/r/artcommissions/new.json?limit=5` → **`HTTP 403 Blocked`**
  - `https://www.reddit.com/r/hungryartists/new.rss?limit=3` → **`HTTP 404 Not Found`**
  - `https://www.reddit.com/r/commissions/new.rss?limit=3` → **`HTTP 429 Too Many Requests`**
  - `https://www.reddit.com/r/artcommissions/new.rss?limit=3` → **`HTTP 429 Too Many Requests`**
- **Near-zero cost viability**: Only viable for strictly non-commercial personal/academic projects *after* obtaining Reddit's written OAuth approval. Not viable as an unauthenticated scraper or zero-cost commercial product.

### Bluesky (AT Protocol)
- **Public XRPC HTTP API (Live Probe, 2026-11-27)** — no API key, no OAuth, no approval gate:
  - **Custom Feeds (`app.bsky.feed.getFeed`)**: `https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed` → **`HTTP 200`**. Community-curated commission feeds already exist and can be discovered via `app.bsky.unspecced.getPopularFeedGenerators?query=commissions` (e.g., **"Art: Commissions"**, `at://did:plc:odqmsar3ikz5ubokya4sempk/app.bsky.feed.generator/aaahudddd6mww`).
  - **Profile Search (`app.bsky.actor.searchActors`)**: `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=commissions%20open` → **`HTTP 200`**.
  - **Batch Profile Hydration (`app.bsky.actor.getProfiles`)**: `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?actors=did:...` → **`HTTP 200`** (hydrates up to 25 Artist profiles per request, including `description`, `displayName`, `avatar`, and `pinnedPost`).
  - **Post Search (`app.bsky.feed.searchPosts`)**: Operational quirk observed live — `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=%23commissionsopen` returned **`HTTP 403 Forbidden`** (BunnyCDN edge block), whereas `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=%23commissionsopen` returned **`HTTP 200`** unauthenticated. If Bluesky tightens unauthenticated search further, a free Bluesky account with an App Password (`com.atproto.server.createSession`) provides authenticated search access at $0 cost.
- **Jetstream (Real-time & Replay Firehose)**:
  - Official docs: [Jetstream Documentation](https://bsky.network/docs/jetstream/) and [bluesky-social/jetstream](https://github.com/bluesky-social/jetstream).
  - Public endpoint: `wss://jetstream.us-east.bsky.network/xrpc/network.bsky.jetstream.subscribeEvents?collections=app.bsky.feed.post&collections=app.bsky.actor.profile&kinds=commit`
  - Streams plain JSON commits in real time (with replay/cursor support) over a single unauthenticated WebSocket, eliminating polling altogether.
- **Near-zero cost viability**: **Yes — $0 API cost** for an indie MVP.

---

## 2. Rate Limits & Terms of Service

### Reddit
- **Rate Limits**: Approved OAuth applications on the free tier are capped at **100 queries per minute (QPM)** per OAuth client ID, averaged over a 10-minute rolling window ([Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16550970174484-Reddit-Data-API-Wiki)).
- **`robots.txt`** ([`https://www.reddit.com/robots.txt`](https://www.reddit.com/robots.txt), verified live 2026-11-27):
  ```text
  # policy: https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy
  User-agent: *
  Disallow: /
  ```
- **ToS & Indexing Restrictions**:
  - [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms) & [Developer Terms](https://redditinc.com/policies/developer-terms): Free API access is limited to non-commercial uses. Section 3 of the Data API Terms requires entering into a **separate commercial agreement** with Reddit for commercial products, monetization, or exceeding free limits.
  - [Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy) & [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy): Prohibits unauthorized scraping/bulk collection of public Reddit content and requires downstream licensees to honor user deletions and removals.
- **Directory Impact**: Indexing Reddit posts into ArtFind without a Reddit commercial agreement violates Reddit's policies if ArtFind is ever commercialized, and scraping without OAuth violates `robots.txt` and the User Agreement immediately.

### Bluesky (AT Protocol)
- **Rate Limits**:
  - Official docs: [Bluesky Rate Limits](https://bsky.network/docs/advanced-guides/rate-limits/).
  - Public AppView read endpoints enforce generous IP-based limits (commonly ~3,000 requests per 5 minutes per IP) backed by edge caching (`cache-control: public, max-age=30` observed on `getFeed` and `searchActors`). Clients should back off exponentially on `HTTP 429`.
  - Write budgets (point-based per hour/day) do not apply to read-only indexing.
  - **Jetstream** streams over a single WebSocket with no per-event HTTP rate-limit budget.
- **ToS & Indexing Restrictions**:
  - [Bluesky Terms of Service](https://bsky.social/about/support/tos) (Last Updated: 14 August 2025): Explicitly notes that Bluesky runs on the decentralized **AT Protocol** and that public user content is shared across Bluesky and third-party **Developer Applications**.
  - **Practical compliance for ArtFind**:
    1. **Honor deletions & account takedowns**: Subscribe to `delete` commit events on Jetstream (or periodically verify DIDs via `getProfiles`) and purge deleted posts/profiles from ArtFind's index.
    2. **Link out, don't hoard**: Store index metadata and link Commissioners directly to the Artist's **Artist Page** (or Bluesky profile/post), rather than re-hosting full high-res artwork libraries.
    3. **No generative AI training**: Visual artists on Bluesky are strongly sensitive to AI scraping; ArtFind must clearly position itself as an opt-out-friendly **discovery directory** that drives commissions to Artists, never training generative models on their work.

---

## 3. Metadata Richness

### Reddit (`r/hungryartists`, `r/commissions`, `r/artcommissions`)
Because subreddit moderators enforce strict posting templates, individual `[For Hire]` posts are **very rich in metadata**, though unstructured:
- **Artist Page URLs**: Subreddit rules (e.g., `r/HungryArtists`, `r/artcommissions`) explicitly require a real portfolio link (Carrd, VGen, ArtStation, Behance, personal site) rather than a single unverified image. *Parsing caveat*: on image/gallery posts, Artists frequently place their portfolio URL and pricing in a **top-level comment** rather than the post body, requiring an extra comment-tree fetch per post.
- **Pricing Ranges**: Subreddit rules enforce pricing transparency and minimum floors (e.g., ~$20–$30 USD personal-use minimum; $100+ commercial minimum). Prices appear in the title (`[For Hire] Starting at $40`), post text, or embedded inside a commission-sheet image.
- **Styles / Categories**: Typically described in post titles and flair/keywords (e.g., *anime, D&D character art, painterly, chibi, VTuber*).
- **Sample Imagery**: High — Reddit gallery posts (`gallery_data` / `media_metadata`) and attached commission sheets are standard.

### Bluesky (Empirical Live Sample, 2026-11-27)
We sampled two live discovery paths via Bluesky's public API to measure real-world metadata density:

1. **Curated Feed (`Art: Commissions`, `n = 19` posts, 17 unique Artists)**:
   - Sample images/media attached: **84% (16/19)**
   - External URL directly in post (`facets` / `embed.external`): **26% (5/19)** — domains observed: `ko-fi.com` (3), `discord.gg` (2), `vgen.co` (1)
   - Price or slot count mentioned in post text: **37% (7/19)**
   - Commission hashtag present: **100% (19/19)**
   - Artist bio contains URL: **29% (5/17)** — domains observed: `vgen.co` (4), `*.carrd.co` (2), personal domains
   - Artist bio/displayName states commission status: **24% (4/17)**

2. **Hashtag Search (`#commissionsopen`, `n = 25` posts, 22 unique Artists)**:
   - Sample images/media attached: **84% (21/25)**
   - External URL directly in post: **28% (7/25)** — domains observed: `ko-fi.com` (3), `vgen.co` (2), `forms.gle` (1)
   - Price or slot count mentioned in post text: **28% (7/25)**
   - Artist bio contains URL: **18% (4/22)** — domains observed: `*.carrd.co`, `patreon.com`, personal domains
   - Artist bio/displayName states commission status: **32% (7/22)**
   - **Artist has a `pinnedPost`: 82% (18/22)**

**Key Bluesky Indexing Insight**: Only ~26–28% of individual commission posts contain an Artist Page URL in the post itself, but **82% of those Artists have a `pinnedPost`** (where commission sheets, VGen/Carrd/Linktree links, and full price lists typically live). An ArtFind Bluesky indexer should always hydrate the Artist's **profile + `pinnedPost` + triggering commission post** together, and extract `embed.images[].alt` (alt text is widely used by Bluesky artists and often describes style/subject).

---

## 4. Commission Status Signals

### Reddit
- **Open Signal (Strong)**: Mandatory `[For Hire]` title prefix and/or `For Hire` post flair clearly separates Artists from Commissioners (`[Hiring]`). Subreddit repost cooldowns (e.g., 1 ad every 3 days on `r/artcommissions`) create a steady stream of fresh open signals.
- **Closed / Stale Detectability (Weak)**: Artists rarely return to old Reddit posts to mark them closed. Stale status must be inferred via **recency TTL** (e.g., mark stale if no `[For Hire]` post within 14–30 days) or by following the linked Artist Page (e.g., VGen open/closed status).

### Bluesky
- **Open Signal (Strong)**:
  - Hashtags: `#commissionsopen`, `#commsopen`, `#artcommissions`, `#opencommissions`
  - Curated feeds: e.g., `Art: Commissions` (`app.bsky.feed.getFeed`)
  - Profile bio / `displayName`: `"COMMISSIONS OPEN"`, `"Comms: Open"` (present on ~24–32% of sampled Artists)
- **Closed / Stale Detectability (Moderate-to-Good — Best of the two)**:
  - Explicit closed hashtags exist and are actively used (live probe of `#commissionsclosed` returned recent posts such as *"Commission slots are now closed"* and *"VGen Commissions are closed until I finish my current batch"*).
  - Profile bio / `displayName` flips (`OPEN` → `CLOSED` / `WAITLIST`) and `pinnedPost` removals/updates are emitted **in real time** as `app.bsky.actor.profile` commits on Jetstream, enabling automated **Commission Status** freshness updates without heavy polling.
  - Recency decay (e.g., 30-day TTL since last open post or bio confirmation) serves as a clean fallback.

---

## 5. Easiest / Cleanest / Safest Verdict for an Indie MVP

1. **Adopt Bluesky as a v1 Source Platform (Recommended)**:
   - **Easiest**: Start with a lightweight scheduled poller against `app.bsky.feed.getFeed` (targeting 1–3 high-signal commission feeds like `Art: Commissions`) + `app.bsky.actor.getProfiles` + `pinnedPost` hydration. Upgrade to a **Jetstream** listener once you want real-time `Commission Status` updates (`#commissionsopen`, `#commissionsclosed`, profile bio edits, and post deletions).
   - **Cleanest**: Typed AT Protocol JSON schemas (`facets` for exact URLs, `embed.images` for CDN thumbnails + alt text, stable `did:plc:...` identifiers that survive handle changes).
   - **Safest**: $0 API cost, no approval bottleneck, open protocol designed for third-party discovery apps.
2. **Defer Reddit for v1**:
   - Do **not** build an unauthenticated Reddit scraper — it is already blocked (`403`/`429`) and violates `robots.txt` and Reddit's User Agreement.
   - Only revisit Reddit post-MVP if ArtFind either obtains written approval for a strictly non-commercial pilot or budgets for a Reddit commercial data agreement.

---

## Primary Sources Cited

- **Reddit**:
  - [Reddit `robots.txt`](https://www.reddit.com/robots.txt) (verified live 2026-11-27: `User-agent: * / Disallow: /`)
  - [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms)
  - [Reddit Developer Terms](https://redditinc.com/policies/developer-terms)
  - [Reddit Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
  - [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16550970174484-Reddit-Data-API-Wiki)
  - [Reddit Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy)
- **Bluesky / AT Protocol**:
  - [Bluesky Terms of Service](https://bsky.social/about/support/tos) (Last Updated: 14 August 2025)
  - [Bluesky Rate Limits Documentation](https://bsky.network/docs/advanced-guides/rate-limits/)
  - [Bluesky Jetstream Documentation](https://bsky.network/docs/jetstream/) & [Jetstream GitHub Repository](https://github.com/bluesky-social/jetstream)
  - Live unauthenticated XRPC probes (2026-11-27): `public.api.bsky.app` (`getFeed`, `searchActors`, `getProfiles`, `getPopularFeedGenerators`) and `api.bsky.app` (`searchPosts`)
