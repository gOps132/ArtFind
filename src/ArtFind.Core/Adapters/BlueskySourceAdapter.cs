using System.Net.Http.Json;
using System.Text.Json;
using ArtFind.Core.Domain;

namespace ArtFind.Core.Adapters;

/// <summary>
/// Concrete AT Protocol / Bluesky Source Adapter using public unauthenticated XRPC endpoints.
/// Designed around stable DIDs so Jetstream real-time ingestion can be plugged in later.
/// </summary>
public sealed class BlueskySourceAdapter : SourceAdapterBase
{
    private const string PublicApiBase = "https://public.api.bsky.app/xrpc";

    // Community-curated "Art: Commissions" feed on Bluesky
    private static readonly string[] DefaultFeeds =
    [
        "at://did:plc:odqmsar3ikz5ubokya4sempk/app.bsky.feed.generator/aaahudddd6mww"
    ];

    private static readonly HashSet<string> NsfwLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        "porn", "sexual", "nudity", "graphic-media", "nsfw"
    };

    public BlueskySourceAdapter(HttpClient http) : base(http) { }

    public override string PlatformName => "bluesky";

    public override async Task<IReadOnlyList<Artist>> FetchOpenArtistsAsync(
        SourceSyncOptions options,
        CancellationToken cancellationToken = default)
    {
        var candidatesByDid = new Dictionary<string, CandidateAccumulator>(StringComparer.Ordinal);

        // 1. Pull recent posts from curated Bluesky commissions feed(s)
        foreach (var feedUri in DefaultFeeds)
        {
            await CollectFromFeedAsync(feedUri, candidatesByDid, cancellationToken);
        }

        // 2. Supplement with actor search for "commissions open" bios
        await CollectFromActorSearchAsync("commissions open", candidatesByDid, cancellationToken);

        // 3. Hydrate full profiles (bio, avatar, pinnedPost, labels) in batches of 25
        var dids = candidatesByDid.Keys.ToList();
        var profilesByDid = await FetchProfilesAsync(dids, cancellationToken);

        // 4. Hydrate pinned posts for richer commission sheets, pricing, and links
        var pinnedUris = profilesByDid.Values
            .Select(p => p.PinnedPostUri)
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Cast<string>()
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var pinnedPostsByUri = await FetchPostsByUriAsync(pinnedUris, cancellationToken);

        // 5. Normalize into canonical Artist records, filtering strictly to Open & non-opted-out
        var results = new List<Artist>();
        var now = DateTimeOffset.UtcNow;

        foreach (var (did, acc) in candidatesByDid)
        {
            profilesByDid.TryGetValue(did, out var profile);
            var handle = profile?.Handle ?? acc.Handle;
            if (string.IsNullOrWhiteSpace(handle)) continue;

            if (IsOptedOut(did, handle, options)) continue;

            BskyPostData? pinnedPost = null;
            if (profile?.PinnedPostUri is not null)
                pinnedPostsByUri.TryGetValue(profile.PinnedPostUri, out pinnedPost);

            var bio = profile?.Description ?? acc.Bio;
            var latestPostText = acc.LatestPostText;
            var pinnedText = pinnedPost?.Text;

            if (ArtistNormalizer.HasOptOutSignal(bio, latestPostText, pinnedText))
                continue;

            var lastSignalAt = acc.LatestPostAt ?? now;
            var status = ArtistNormalizer.DetectCommissionStatus(
                bio,
                latestPostText,
                pinnedText,
                lastSignalAt,
                now);

            if (status != CommissionStatus.Open)
                continue;

            var profileUrl = $"https://bsky.app/profile/{handle}";
            var allCandidateUrls = new List<string>();
            allCandidateUrls.AddRange(acc.FacetUrls);
            if (pinnedPost is not null) allCandidateUrls.AddRange(pinnedPost.FacetUrls);
            allCandidateUrls.AddRange(ArtistNormalizer.ExtractUrlsFromText(bio, pinnedText, latestPostText));

            var (artistPageUrl, artistPageType) =
                ArtistNormalizer.SelectCanonicalArtistPage(allCandidateUrls, profileUrl, ArtistPageType.Bluesky);

            var (styles, categories) = ArtistNormalizer.ExtractTags(
                profile?.DisplayName ?? acc.DisplayName,
                bio,
                pinnedText,
                latestPostText);

            var priceRange = ArtistNormalizer.ExtractPriceRange(pinnedText, latestPostText, bio);

            var previews = new List<ArtworkPreview>();
            var seenThumbs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            void AddPreviews(IEnumerable<ArtworkPreview> source)
            {
                foreach (var p in source)
                {
                    if (previews.Count >= 4) break;
                    if (seenThumbs.Add(p.ThumbnailUrl))
                        previews.Add(p);
                }
            }

            AddPreviews(acc.Previews);
            if (pinnedPost is not null) AddPreviews(pinnedPost.Previews);

            // Require at least 1 artwork preview so ArtFind stays visually rich
            if (previews.Count == 0)
                continue;

            var isNsfw = acc.HasNsfwLabel || (profile?.HasNsfwLabel ?? false) || (pinnedPost?.HasNsfwLabel ?? false);

            var artist = new Artist
            {
                Id = BuildDeterministicId(PlatformName, did),
                DisplayName = !string.IsNullOrWhiteSpace(profile?.DisplayName)
                    ? profile.DisplayName
                    : (!string.IsNullOrWhiteSpace(acc.DisplayName) ? acc.DisplayName : handle),
                BioSnippet = ArtistNormalizer.BuildBioSnippet(bio, pinnedText ?? latestPostText),
                AvatarUrl = profile?.AvatarUrl ?? acc.AvatarUrl,
                ArtistPageUrl = artistPageUrl,
                ArtistPageType = artistPageType,
                CommissionStatus = CommissionStatus.Open,
                ContentRating = isNsfw ? ContentRating.Nsfw : ContentRating.Sfw,
                StyleTags = styles,
                CategoryTags = categories,
                PriceRange = priceRange,
                Previews = previews,
                SourceProfiles =
                [
                    new SourceProfile(
                        Platform: PlatformName,
                        ExternalId: did,
                        Handle: handle,
                        ProfileUrl: profileUrl,
                        SourcePostUrl: acc.LatestPostUrl ?? pinnedPost?.PostUrl)
                ],
                LastVerifiedAt = lastSignalAt
            };

            results.Add(artist);
            if (results.Count >= options.MaxArtists)
                break;
        }

        return results;
    }

    private async Task CollectFromFeedAsync(
        string feedUri,
        Dictionary<string, CandidateAccumulator> map,
        CancellationToken ct)
    {
        var url = $"{PublicApiBase}/app.bsky.feed.getFeed?feed={Uri.EscapeDataString(feedUri)}&limit=100";
        using var doc = await GetJsonAsync(url, ct);
        if (doc is null || !doc.RootElement.TryGetProperty("feed", out var feedArr)) return;

        foreach (var item in feedArr.EnumerateArray())
        {
            if (!item.TryGetProperty("post", out var postEl)) continue;
            var parsed = ParsePostElement(postEl);
            if (parsed is null || string.IsNullOrWhiteSpace(parsed.AuthorDid)) continue;

            if (!map.TryGetValue(parsed.AuthorDid, out var acc))
            {
                acc = new CandidateAccumulator(parsed.AuthorDid, parsed.AuthorHandle ?? string.Empty);
                map[parsed.AuthorDid] = acc;
            }

            acc.DisplayName ??= parsed.AuthorDisplayName;
            acc.AvatarUrl ??= parsed.AuthorAvatar;
            acc.HasNsfwLabel |= parsed.HasNsfwLabel;
            acc.FacetUrls.AddRange(parsed.FacetUrls);
            acc.Previews.AddRange(parsed.Previews);

            if (acc.LatestPostAt is null || (parsed.CreatedAt.HasValue && parsed.CreatedAt > acc.LatestPostAt))
            {
                acc.LatestPostAt = parsed.CreatedAt;
                acc.LatestPostText = parsed.Text;
                acc.LatestPostUrl = parsed.PostUrl;
            }
        }
    }

    private async Task CollectFromActorSearchAsync(
        string query,
        Dictionary<string, CandidateAccumulator> map,
        CancellationToken ct)
    {
        var url = $"{PublicApiBase}/app.bsky.actor.searchActors?q={Uri.EscapeDataString(query)}&limit=40";
        using var doc = await GetJsonAsync(url, ct);
        if (doc is null || !doc.RootElement.TryGetProperty("actors", out var actorsArr)) return;

        foreach (var actor in actorsArr.EnumerateArray())
        {
            var did = GetString(actor, "did");
            var handle = GetString(actor, "handle");
            if (string.IsNullOrWhiteSpace(did) || string.IsNullOrWhiteSpace(handle)) continue;

            if (!map.TryGetValue(did, out var acc))
            {
                acc = new CandidateAccumulator(did, handle);
                map[did] = acc;
            }

            acc.DisplayName ??= GetString(actor, "displayName");
            acc.AvatarUrl ??= GetString(actor, "avatar");
            acc.Bio ??= GetString(actor, "description");
            acc.HasNsfwLabel |= HasNsfwLabels(actor);
        }
    }

    private async Task<Dictionary<string, BskyProfileData>> FetchProfilesAsync(
        IReadOnlyList<string> dids,
        CancellationToken ct)
    {
        var result = new Dictionary<string, BskyProfileData>(StringComparer.Ordinal);
        foreach (var batch in dids.Chunk(25))
        {
            var qs = string.Join("&", batch.Select(d => $"actors={Uri.EscapeDataString(d)}"));
            var url = $"{PublicApiBase}/app.bsky.actor.getProfiles?{qs}";
            using var doc = await GetJsonAsync(url, ct);
            if (doc is null || !doc.RootElement.TryGetProperty("profiles", out var profilesArr)) continue;

            foreach (var p in profilesArr.EnumerateArray())
            {
                var did = GetString(p, "did");
                if (string.IsNullOrWhiteSpace(did)) continue;

                string? pinnedUri = null;
                if (p.TryGetProperty("pinnedPost", out var pinnedEl) && pinnedEl.ValueKind == JsonValueKind.Object)
                    pinnedUri = GetString(pinnedEl, "uri");

                result[did] = new BskyProfileData(
                    Did: did,
                    Handle: GetString(p, "handle") ?? string.Empty,
                    DisplayName: GetString(p, "displayName"),
                    Description: GetString(p, "description"),
                    AvatarUrl: GetString(p, "avatar"),
                    PinnedPostUri: pinnedUri,
                    HasNsfwLabel: HasNsfwLabels(p));
            }
        }
        return result;
    }

    private async Task<Dictionary<string, BskyPostData>> FetchPostsByUriAsync(
        IReadOnlyList<string> uris,
        CancellationToken ct)
    {
        var result = new Dictionary<string, BskyPostData>(StringComparer.Ordinal);
        foreach (var batch in uris.Chunk(25))
        {
            var qs = string.Join("&", batch.Select(u => $"uris={Uri.EscapeDataString(u)}"));
            var url = $"{PublicApiBase}/app.bsky.feed.getPosts?{qs}";
            using var doc = await GetJsonAsync(url, ct);
            if (doc is null || !doc.RootElement.TryGetProperty("posts", out var postsArr)) continue;

            foreach (var postEl in postsArr.EnumerateArray())
            {
                var parsed = ParsePostElement(postEl);
                if (parsed is not null && !string.IsNullOrWhiteSpace(parsed.Uri))
                    result[parsed.Uri] = parsed;
            }
        }
        return result;
    }

    private async Task<JsonDocument?> GetJsonAsync(string url, CancellationToken ct)
    {
        try
        {
            using var res = await Http.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode) return null;
            await using var stream = await res.Content.ReadAsStreamAsync(ct);
            return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        }
        catch
        {
            return null;
        }
    }

    private static BskyPostData? ParsePostElement(JsonElement postEl)
    {
        var uri = GetString(postEl, "uri");
        string? authorDid = null;
        string? authorHandle = null;
        string? authorDisplayName = null;
        string? authorAvatar = null;
        var hasNsfw = HasNsfwLabels(postEl);

        if (postEl.TryGetProperty("author", out var authorEl) && authorEl.ValueKind == JsonValueKind.Object)
        {
            authorDid = GetString(authorEl, "did");
            authorHandle = GetString(authorEl, "handle");
            authorDisplayName = GetString(authorEl, "displayName");
            authorAvatar = GetString(authorEl, "avatar");
            hasNsfw |= HasNsfwLabels(authorEl);
        }

        string? text = null;
        DateTimeOffset? createdAt = null;
        var facetUrls = new List<string>();

        if (postEl.TryGetProperty("record", out var recordEl) && recordEl.ValueKind == JsonValueKind.Object)
        {
            text = GetString(recordEl, "text");
            var createdRaw = GetString(recordEl, "createdAt");
            if (DateTimeOffset.TryParse(createdRaw, out var parsedDate))
                createdAt = parsedDate;

            if (recordEl.TryGetProperty("facets", out var facetsEl) && facetsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var facet in facetsEl.EnumerateArray())
                {
                    if (!facet.TryGetProperty("features", out var featuresEl) || featuresEl.ValueKind != JsonValueKind.Array)
                        continue;
                    foreach (var feat in featuresEl.EnumerateArray())
                    {
                        var featUri = GetString(feat, "uri");
                        if (!string.IsNullOrWhiteSpace(featUri))
                            facetUrls.Add(featUri);
                    }
                }
            }
        }

        var postUrl = BuildPostUrl(authorHandle, uri);
        var previews = ExtractImagePreviews(postEl, postUrl);

        return new BskyPostData(
            Uri: uri ?? string.Empty,
            PostUrl: postUrl,
            AuthorDid: authorDid,
            AuthorHandle: authorHandle,
            AuthorDisplayName: authorDisplayName,
            AuthorAvatar: authorAvatar,
            Text: text,
            CreatedAt: createdAt,
            FacetUrls: facetUrls,
            Previews: previews,
            HasNsfwLabel: hasNsfw);
    }

    private static List<ArtworkPreview> ExtractImagePreviews(JsonElement postEl, string? postUrl)
    {
        var previews = new List<ArtworkPreview>();
        if (!postEl.TryGetProperty("embed", out var embedEl) || embedEl.ValueKind != JsonValueKind.Object)
            return previews;

        void ReadImagesArray(JsonElement container)
        {
            if (!container.TryGetProperty("images", out var imagesEl) || imagesEl.ValueKind != JsonValueKind.Array)
                return;

            foreach (var img in imagesEl.EnumerateArray())
            {
                var thumb = GetString(img, "thumb");
                if (string.IsNullOrWhiteSpace(thumb)) continue;

                var alt = GetString(img, "alt") ?? string.Empty;
                int w = 4, h = 3;
                if (img.TryGetProperty("aspectRatio", out var arEl) && arEl.ValueKind == JsonValueKind.Object)
                {
                    if (arEl.TryGetProperty("width", out var wEl) && wEl.TryGetInt32(out var pw) && pw > 0) w = pw;
                    if (arEl.TryGetProperty("height", out var hEl) && hEl.TryGetInt32(out var ph) && ph > 0) h = ph;
                }

                previews.Add(new ArtworkPreview(thumb, alt, w, h, postUrl));
            }
        }

        ReadImagesArray(embedEl);
        if (embedEl.TryGetProperty("media", out var mediaEl) && mediaEl.ValueKind == JsonValueKind.Object)
            ReadImagesArray(mediaEl);

        return previews;
    }

    private static bool HasNsfwLabels(JsonElement el)
    {
        if (!el.TryGetProperty("labels", out var labelsEl) || labelsEl.ValueKind != JsonValueKind.Array)
            return false;

        foreach (var label in labelsEl.EnumerateArray())
        {
            var val = GetString(label, "val");
            if (!string.IsNullOrWhiteSpace(val) && NsfwLabels.Contains(val))
                return true;
        }
        return false;
    }

    private static string? BuildPostUrl(string? handle, string? atUri)
    {
        if (string.IsNullOrWhiteSpace(handle) || string.IsNullOrWhiteSpace(atUri)) return null;
        var rkey = atUri.Split('/').LastOrDefault();
        return string.IsNullOrWhiteSpace(rkey)
            ? $"https://bsky.app/profile/{handle}"
            : $"https://bsky.app/profile/{handle}/post/{rkey}";
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var val) && val.ValueKind == JsonValueKind.String
            ? val.GetString()
            : null;

    private sealed class CandidateAccumulator(string did, string handle)
    {
        public string Did { get; } = did;
        public string Handle { get; } = handle;
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? LatestPostText { get; set; }
        public string? LatestPostUrl { get; set; }
        public DateTimeOffset? LatestPostAt { get; set; }
        public bool HasNsfwLabel { get; set; }
        public List<string> FacetUrls { get; } = [];
        public List<ArtworkPreview> Previews { get; } = [];
    }

    private sealed record BskyProfileData(
        string Did,
        string Handle,
        string? DisplayName,
        string? Description,
        string? AvatarUrl,
        string? PinnedPostUri,
        bool HasNsfwLabel);

    private sealed record BskyPostData(
        string Uri,
        string? PostUrl,
        string? AuthorDid,
        string? AuthorHandle,
        string? AuthorDisplayName,
        string? AuthorAvatar,
        string? Text,
        DateTimeOffset? CreatedAt,
        List<string> FacetUrls,
        List<ArtworkPreview> Previews,
        bool HasNsfwLabel);
}
