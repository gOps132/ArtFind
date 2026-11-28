# ArtFind

ArtFind discovers visual illustrators and digital artists who are **currently open for commissions**, matches them to a Commissioner's **Commission Brief**, and redirects Commissioners directly to the Artist's external **Artist Page** (VGen, Carrd, Ko-fi, Artistree, portfolio, or Bluesky).

## Stack
- **Frontend**: Blazor WebAssembly (.NET 10) — `src/ArtFind.Web`
- **Core Domain & Pluggable Source Adapters**: C# Class Library — `src/ArtFind.Core` (`ISourceAdapter` / `SourceAdapterBase` / `BlueskySourceAdapter` / `SourceAdapterRegistry`)
- **Ingestion CLI**: .NET Console App — `src/ArtFind.Sync` (uses public Bluesky and Mastodon APIs without credentials)
- **Backend Scaffolding**: Supabase (PostgreSQL schema, RLS policies, opt-out purge trigger, and Deno Edge Function) — `supabase/`

## Quick Start (Runs Immediately — No Credentials Needed)

```bash
# 1. Run unit tests
dotnet test

# 2. (Optional) Refresh live open-for-commission artists from Bluesky
dotnet run --project src/ArtFind.Sync

# 3. Run Blazor WebAssembly app locally
dotnet run --project src/ArtFind.Web
```

## Combined Bluesky and Mastodon catalog (local only)

Pass a short, manually curated list of Mastodon Artist profiles on their home instances. The CLI discovers Bluesky Artists as usual and combines both sources in one local catalog. Artists with the same normalized Artist Page URL share one listing with both Source Profiles. The default sync without `--mastodon` remains Bluesky-only.

```bash
dotnet run --project src/ArtFind.Sync -- --mastodon \
  https://mastodon.art/@vetrinanicoleart https://mastodon.social/@Alphadonzer
```

This refreshes the web app’s local `wwwroot/data/artists.json`. To write elsewhere, pass an output path and optional per-source limit before `--mastodon`. Use `--mastodon-pilot <output.json> <profile-url> ...` for a Mastodon-only snapshot. The scheduled Supabase sync remains Bluesky-only.

Choose profiles with portfolio or commission links. The pilot checks the latest five non-reply, non-boost posts per profile, looks for an open-commission signal beyond hashtags alone, and requires a recent public image without a content warning or sensitive flag. It records source links, not proof of authorship. A failed Mastodon API request aborts the run rather than replacing the snapshot with partial data.

## Migrating to Supabase

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
