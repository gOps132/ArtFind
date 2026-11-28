<a id="readme-top"></a>

<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

</div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/gOps132/ArtFind">
    <img src="Logo.png" alt="ArtFind Logo" width="520" />
  </a>

  <h3 align="center">ArtFind</h3>

  <p align="center">
    Discover visual illustrators and digital artists who are currently open for commissions, match them to your Commission Brief, and jump straight to their Artist Page.
    <br />
    <a href="#getting-started"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="#usage">Usage</a>
    &middot;
    <a href="https://github.com/gOps132/ArtFind/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/gOps132/ArtFind/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#usage">Usage</a>
      <ul>
        <li><a href="#combined-bluesky-and-mastodon-catalog-local-only">Combined Bluesky and Mastodon catalog (local only)</a></li>
        <li><a href="#migrating-to-supabase">Migrating to Supabase</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

ArtFind helps commissioners find visual illustrators and digital artists who are **currently open for commissions** across decentralized social feeds—without re-hosting full-resolution artwork.

- **Brief-to-Artist Matching**: Enter a Commissioner's **Commission Brief** (styles, subjects, budget/slots, and tags) to rank and inspect matching artists.
- **Direct Artist Redirects**: Links Commissioners straight to each artist's external **Artist Page** (VGen, Carrd, Ko-fi, Artistree, portfolio, or Bluesky profile).
- **Pluggable Source Adapters**: `ArtFind.Core` defines `ISourceAdapter` / `SourceAdapterBase` with `BlueskySourceAdapter`, `MastodonSourceAdapter`, and `SourceAdapterRegistry`.
- **Artist Opt-Out Respect**: Artists can opt out anytime by adding `#noartfind` to their bio or submitting via the in-app opt-out modal (`opt_out_registry`).
- **Tactile Sketchbook UI**: Built in Blazor WebAssembly with origami-folded paper navigation, animated sketchbook doodles, and an interactive hand-drawn footer.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

<div align="center">

[![.NET 10][DotNet-badge]][DotNet-url]
[![Blazor WebAssembly][Blazor-badge]][Blazor-url]
[![C#][CSharp-badge]][CSharp-url]
[![Supabase][Supabase-badge]][Supabase-url]
[![PostgreSQL][Postgres-badge]][Postgres-url]
[![Deno][Deno-badge]][Deno-url]

</div>

- **Frontend**: Blazor WebAssembly (.NET 10) — `src/ArtFind.Web`
- **Core Domain & Adapters**: C# Class Library — `src/ArtFind.Core`
- **Ingestion CLI**: .NET Console App — `src/ArtFind.Sync` (uses public Bluesky and Mastodon APIs without credentials)
- **Backend Scaffolding**: Supabase (PostgreSQL schema, RLS policies, opt-out purge trigger, and Deno Edge Function) — `supabase/`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

ArtFind runs locally out of the box with no API credentials required.

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- *(Optional)* [Supabase CLI](https://supabase.com/docs/guides/cli) if deploying the live Supabase backend

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gOps132/ArtFind.git
   cd ArtFind
   ```
2. Run the unit tests:
   ```bash
   dotnet test
   ```
3. *(Optional)* Refresh live open-for-commission artists from Bluesky:
   ```bash
   dotnet run --project src/ArtFind.Sync
   ```
4. Start the Blazor WebAssembly app locally:
   ```bash
   dotnet run --project src/ArtFind.Web
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

### Combined Bluesky and Mastodon catalog (local only)

Pass a short, manually curated list of Mastodon Artist profiles on their home instances. The CLI discovers Bluesky Artists as usual and combines both sources in one local catalog. Artists with the same normalized Artist Page URL share one listing with both Source Profiles. The default sync without `--mastodon` remains Bluesky-only.

```bash
dotnet run --project src/ArtFind.Sync -- --mastodon \
  https://mastodon.art/@vetrinanicoleart https://mastodon.social/@Alphadonzer
```

This refreshes the web app's local `wwwroot/data/artists.json`. To write elsewhere, pass an output path and optional per-source limit before `--mastodon`. Use `--mastodon-pilot <output.json> <profile-url> ...` for a Mastodon-only snapshot. The scheduled Supabase sync remains Bluesky-only.

Choose profiles with portfolio or commission links. The pilot checks the latest five non-reply, non-boost posts per profile, looks for an open-commission signal beyond hashtags alone, and requires a recent public image without a content warning or sensitive flag. It records source links, not proof of authorship. A failed Mastodon API request aborts the run rather than replacing the snapshot with partial data.

### Migrating to Supabase

1. Link your Supabase project and push the migration:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
2. Deploy the scheduled Bluesky ingestion Edge Function:
   ```bash
   supabase functions deploy sync-bluesky
   ```
3. Add your Supabase URL and Anon Key to `src/ArtFind.Web/wwwroot/appsettings.json`:
   ```json
   {
     "Supabase": {
       "Url": "https://<your-project-ref>.supabase.co",
       "AnonKey": "<your-anon-key>"
     }
   }
   ```
   `HybridArtistCatalogService` automatically switches from the local Bluesky snapshot to live Supabase PostgREST reads and `opt_out_registry` writes once configured.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] `ArtFind.Core` domain models, normalization, and Commission Brief matcher
- [x] Bluesky AT Protocol public source adapter & `ArtFind.Sync` CLI
- [x] Local Mastodon pilot adapter (`--mastodon` / `--mastodon-pilot`)
- [x] Blazor WebAssembly sketchbook UI with origami fold nav & interactive footer
- [x] Supabase schema, RLS policies, `#noartfind` opt-out registry, and `sync-bluesky` Edge Function
- [ ] Scheduled multi-source adapters beyond Bluesky

See the [open issues](https://github.com/gOps132/ArtFind/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are welcome and greatly appreciated.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/amazing-feature`)
3. Commit your Changes (`git commit -m 'feat(core): add amazing feature'`)
4. Push to the Branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Project Link: [https://github.com/gOps132/ArtFind](https://github.com/gOps132/ArtFind)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) / [ReadMeTemplate](https://github.com/gOps132/ReadMeTemplate)
- [Bluesky AT Protocol](https://atproto.com/)
- [Img Shields](https://shields.io)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/gOps132/ArtFind.svg?style=for-the-badge
[contributors-url]: https://github.com/gOps132/ArtFind/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/gOps132/ArtFind.svg?style=for-the-badge
[forks-url]: https://github.com/gOps132/ArtFind/network/members
[stars-shield]: https://img.shields.io/github/stars/gOps132/ArtFind.svg?style=for-the-badge
[stars-url]: https://github.com/gOps132/ArtFind/stargazers
[issues-shield]: https://img.shields.io/github/issues/gOps132/ArtFind.svg?style=for-the-badge
[issues-url]: https://github.com/gOps132/ArtFind/issues
[DotNet-badge]: https://img.shields.io/badge/.NET%2010-512BD4?style=for-the-badge&logo=dotnet&logoColor=white
[DotNet-url]: https://dotnet.microsoft.com/
[Blazor-badge]: https://img.shields.io/badge/Blazor%20WASM-512BD4?style=for-the-badge&logo=blazor&logoColor=white
[Blazor-url]: https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor
[CSharp-badge]: https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white
[CSharp-url]: https://learn.microsoft.com/dotnet/csharp/
[Supabase-badge]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[Postgres-badge]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[Postgres-url]: https://www.postgresql.org/
[Deno-badge]: https://img.shields.io/badge/Deno-000000?style=for-the-badge&logo=deno&logoColor=white
[Deno-url]: https://deno.com/
