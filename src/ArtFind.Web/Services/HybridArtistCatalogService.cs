using System.Net.Http.Json;
using System.Text.Json;
using ArtFind.Core.Domain;
using Microsoft.JSInterop;

namespace ArtFind.Web.Services;

/// <summary>
/// Uses Supabase PostgREST automatically when Supabase:Url and Supabase:AnonKey are configured.
/// Falls back cleanly to the live-scraped Bluesky snapshot (wwwroot/data/artists.json) + localStorage opt-out
/// so the MVP works immediately with zero external setup.
/// </summary>
public sealed class HybridArtistCatalogService : IArtistCatalogService
{
    private const string LocalOptOutKey = "artfind.optout.handles";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;
    private readonly SupabaseOptions _supabase;
    private readonly IJSRuntime _js;

    public HybridArtistCatalogService(HttpClient http, SupabaseOptions supabase, IJSRuntime js)
    {
        _http = http;
        _supabase = supabase;
        _js = js;
    }

    public bool IsUsingSupabase => _supabase.IsConfigured;

    public async Task<ArtistCatalogSnapshot> LoadCatalogAsync(CancellationToken cancellationToken = default)
    {
        var localOptOuts = await GetLocalOptOutsAsync();

        if (_supabase.IsConfigured)
        {
            var fromSupabase = await TryLoadFromSupabaseAsync(cancellationToken);
            if (fromSupabase is not null)
                return FilterOptOuts(fromSupabase, localOptOuts);
        }

        var snapshot = await _http.GetFromJsonAsync<ArtistCatalogSnapshot>(
            "data/artists.json",
            JsonOptions,
            cancellationToken);

        snapshot ??= new ArtistCatalogSnapshot(DateTimeOffset.UtcNow, ["bluesky"], []);
        return FilterOptOuts(snapshot, localOptOuts);
    }

    public async Task<bool> SubmitOptOutAsync(
        string handle,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var normalized = handle.Trim().TrimStart('@').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized)) return false;

        // Always persist locally for instant UI removal
        var local = await GetLocalOptOutsAsync();
        local.Add(normalized);
        await _js.InvokeVoidAsync("localStorage.setItem", LocalOptOutKey, JsonSerializer.Serialize(local));

        if (_supabase.IsConfigured)
        {
            try
            {
                using var req = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"{_supabase.Url.TrimEnd('/')}/rest/v1/opt_out_registry");
                req.Headers.Add("apikey", _supabase.AnonKey);
                req.Headers.Add("Authorization", $"Bearer {_supabase.AnonKey}");
                req.Headers.Add("Prefer", "return=minimal");
                req.Content = JsonContent.Create(new
                {
                    platform = "bluesky",
                    handle = normalized,
                    reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim()
                });

                using var res = await _http.SendAsync(req, cancellationToken);
                return res.IsSuccessStatusCode;
            }
            catch
            {
                return true;
            }
        }

        return true;
    }

    private async Task<ArtistCatalogSnapshot?> TryLoadFromSupabaseAsync(CancellationToken ct)
    {
        try
        {
            var url = $"{_supabase.Url.TrimEnd('/')}/rest/v1/artists" +
                      "?select=*,source_profiles(*),artwork_previews(*)" +
                      "&commission_status=eq.open&order=last_verified_at.desc&limit=100";

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("apikey", _supabase.AnonKey);
            req.Headers.Add("Authorization", $"Bearer {_supabase.AnonKey}");

            using var res = await _http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return null;

            var rows = await res.Content.ReadFromJsonAsync<List<SupabaseArtistRow>>(JsonOptions, ct);
            if (rows is null) return null;

            var artists = rows.Select(MapSupabaseRow).ToList();
            return new ArtistCatalogSnapshot(DateTimeOffset.UtcNow, ["bluesky"], artists);
        }
        catch
        {
            return null;
        }
    }

    private async Task<HashSet<string>> GetLocalOptOutsAsync()
    {
        try
        {
            var raw = await _js.InvokeAsync<string?>("localStorage.getItem", LocalOptOutKey);
            if (string.IsNullOrWhiteSpace(raw))
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var list = JsonSerializer.Deserialize<List<string>>(raw) ?? [];
            return new HashSet<string>(list, StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private static ArtistCatalogSnapshot FilterOptOuts(ArtistCatalogSnapshot snapshot, HashSet<string> optOuts)
    {
        if (optOuts.Count == 0) return snapshot;

        var filtered = snapshot.Artists
            .Where(a => !a.SourceProfiles.Any(sp => optOuts.Contains(sp.Handle.TrimStart('@'))))
            .ToList();

        return snapshot with { Artists = filtered };
    }

    private static Artist MapSupabaseRow(SupabaseArtistRow row) => new()
    {
        Id = row.Id,
        DisplayName = row.DisplayName,
        BioSnippet = row.BioSnippet ?? string.Empty,
        AvatarUrl = row.AvatarUrl,
        ArtistPageUrl = row.ArtistPageUrl,
        ArtistPageType = Enum.TryParse<ArtistPageType>(row.ArtistPageType, true, out var pt) ? pt : ArtistPageType.Bluesky,
        CommissionStatus = Enum.TryParse<CommissionStatus>(row.CommissionStatus, true, out var cs) ? cs : CommissionStatus.Open,
        ContentRating = Enum.TryParse<ContentRating>(row.ContentRating, true, out var cr) ? cr : ContentRating.Sfw,
        StyleTags = row.StyleTags ?? [],
        CategoryTags = row.CategoryTags ?? [],
        PriceRange = row.PriceMinUsd.HasValue || !string.IsNullOrWhiteSpace(row.PriceRawText)
            ? new PriceRange(row.PriceMinUsd, row.PriceMaxUsd, row.PriceRawText ?? $"From ${row.PriceMinUsd}")
            : null,
        Previews = (row.ArtworkPreviews ?? [])
            .OrderBy(p => p.SortOrder)
            .Select(p => new ArtworkPreview(p.ThumbnailUrl, p.AltText ?? string.Empty, p.AspectWidth, p.AspectHeight, p.SourcePostUrl))
            .ToList(),
        SourceProfiles = (row.SourceProfiles ?? [])
            .Select(sp => new SourceProfile(sp.Platform, sp.ExternalId, sp.Handle, sp.ProfileUrl, row.SourcePostUrl))
            .ToList(),
        LastVerifiedAt = row.LastVerifiedAt
    };

    private sealed class SupabaseArtistRow
    {
        public string Id { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? BioSnippet { get; set; }
        public string? AvatarUrl { get; set; }
        public string ArtistPageUrl { get; set; } = string.Empty;
        public string ArtistPageType { get; set; } = "bluesky";
        public string CommissionStatus { get; set; } = "open";
        public string ContentRating { get; set; } = "sfw";
        public List<string>? StyleTags { get; set; }
        public List<string>? CategoryTags { get; set; }
        public int? PriceMinUsd { get; set; }
        public int? PriceMaxUsd { get; set; }
        public string? PriceRawText { get; set; }
        public string? SourcePostUrl { get; set; }
        public DateTimeOffset LastVerifiedAt { get; set; }
        public List<SupabaseSourceProfileRow>? SourceProfiles { get; set; }
        public List<SupabasePreviewRow>? ArtworkPreviews { get; set; }
    }

    private sealed class SupabaseSourceProfileRow
    {
        public string Platform { get; set; } = string.Empty;
        public string ExternalId { get; set; } = string.Empty;
        public string Handle { get; set; } = string.Empty;
        public string ProfileUrl { get; set; } = string.Empty;
    }

    private sealed class SupabasePreviewRow
    {
        public string ThumbnailUrl { get; set; } = string.Empty;
        public string? AltText { get; set; }
        public int AspectWidth { get; set; } = 4;
        public int AspectHeight { get; set; } = 3;
        public string? SourcePostUrl { get; set; }
        public int SortOrder { get; set; }
    }
}
