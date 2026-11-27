using System.Text.Json.Serialization;

namespace ArtFind.Core.Domain;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ArtistPageType
{
    VGen,
    Carrd,
    Kofi,
    Artistree,
    Portfolio,
    Bluesky,
    Other
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CommissionStatus
{
    Open,
    Closed,
    Waitlist,
    Unknown
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContentRating
{
    Sfw,
    Nsfw
}

public sealed record ArtworkPreview(
    string ThumbnailUrl,
    string AltText,
    int AspectWidth,
    int AspectHeight,
    string? SourcePostUrl = null
);

public sealed record PriceRange(
    int? MinUsd,
    int? MaxUsd,
    string RawText
);

public sealed record SourceProfile(
    string Platform,
    string ExternalId,
    string Handle,
    string ProfileUrl,
    string? SourcePostUrl = null
);

public sealed record Artist
{
    public required string Id { get; init; }
    public required string DisplayName { get; init; }
    public string BioSnippet { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public required string ArtistPageUrl { get; init; }
    public ArtistPageType ArtistPageType { get; init; } = ArtistPageType.Bluesky;
    public CommissionStatus CommissionStatus { get; init; } = CommissionStatus.Open;
    public ContentRating ContentRating { get; init; } = ContentRating.Sfw;
    public IReadOnlyList<string> StyleTags { get; init; } = [];
    public IReadOnlyList<string> CategoryTags { get; init; } = [];
    public PriceRange? PriceRange { get; init; }
    public IReadOnlyList<ArtworkPreview> Previews { get; init; } = [];
    public IReadOnlyList<SourceProfile> SourceProfiles { get; init; } = [];
    public DateTimeOffset LastVerifiedAt { get; init; } = DateTimeOffset.UtcNow;

    public SourceProfile? PrimarySource => SourceProfiles.FirstOrDefault();
}

public sealed record ArtistCatalogSnapshot(
    DateTimeOffset GeneratedAt,
    IReadOnlyList<string> ActivePlatforms,
    IReadOnlyList<Artist> Artists
);
