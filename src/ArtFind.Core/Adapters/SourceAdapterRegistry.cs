using ArtFind.Core.Domain;

namespace ArtFind.Core.Adapters;

/// <summary>
/// Orchestrates multiple ISourceAdapter implementations and deduplicates Artists
/// across Source Platforms by normalized external ArtistPageUrl.
/// </summary>
public sealed class SourceAdapterRegistry
{
    private readonly List<ISourceAdapter> _adapters = [];

    public SourceAdapterRegistry(IEnumerable<ISourceAdapter>? adapters = null)
    {
        if (adapters is not null)
            _adapters.AddRange(adapters);
    }

    public void Register(ISourceAdapter adapter) => _adapters.Add(adapter);

    public IReadOnlyList<string> RegisteredPlatforms =>
        _adapters.Select(a => a.PlatformName).ToList();

    public async Task<ArtistCatalogSnapshot> SyncAllAsync(
        SourceSyncOptions options,
        CancellationToken cancellationToken = default)
    {
        var mergedByPageUrl = new Dictionary<string, Artist>(StringComparer.OrdinalIgnoreCase);

        foreach (var adapter in _adapters)
        {
            var fetched = await adapter.FetchOpenArtistsAsync(options, cancellationToken);
            foreach (var artist in fetched)
            {
                var key = ArtistNormalizer.NormalizeUrl(artist.ArtistPageUrl);
                if (!mergedByPageUrl.TryGetValue(key, out var existing))
                {
                    mergedByPageUrl[key] = artist;
                }
                else
                {
                    // Merge SourceProfiles, tags, and previews when the same Artist appears on multiple platforms
                    var combinedProfiles = existing.SourceProfiles
                        .Concat(artist.SourceProfiles)
                        .DistinctBy(p => (p.Platform, p.ExternalId))
                        .ToList();

                    var combinedStyles = existing.StyleTags
                        .Concat(artist.StyleTags)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    var combinedCategories = existing.CategoryTags
                        .Concat(artist.CategoryTags)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    var combinedPreviews = existing.Previews
                        .Concat(artist.Previews)
                        .DistinctBy(p => p.ThumbnailUrl, StringComparer.OrdinalIgnoreCase)
                        .Take(4)
                        .ToList();

                    mergedByPageUrl[key] = existing with
                    {
                        StyleTags = combinedStyles,
                        CategoryTags = combinedCategories,
                        Previews = combinedPreviews,
                        SourceProfiles = combinedProfiles,
                        PriceRange = existing.PriceRange ?? artist.PriceRange,
                        ContentRating = existing.ContentRating == ContentRating.Nsfw || artist.ContentRating == ContentRating.Nsfw
                            ? ContentRating.Nsfw : ContentRating.Sfw,
                        LastVerifiedAt = existing.LastVerifiedAt >= artist.LastVerifiedAt
                            ? existing.LastVerifiedAt
                            : artist.LastVerifiedAt
                    };
                }
            }
        }

        var ordered = mergedByPageUrl.Values
            .OrderByDescending(a => a.Previews.Count)
            .ThenByDescending(a => a.LastVerifiedAt)
            .ToList();

        return new ArtistCatalogSnapshot(
            GeneratedAt: DateTimeOffset.UtcNow,
            ActivePlatforms: RegisteredPlatforms,
            Artists: ordered);
    }
}
