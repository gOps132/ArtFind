using ArtFind.Core.Adapters;
using ArtFind.Core.Domain;

namespace ArtFind.Core.Tests;

public sealed class SourceAdapterRegistryTests
{
    [Fact]
    public async Task CombinesSourcesWithoutLosingAttributionOrContentRating()
    {
        var bluesky = ArtistFrom("bluesky", "https://artist.example/", ContentRating.Sfw);
        var mastodon = ArtistFrom("mastodon", "https://artist.example", ContentRating.Nsfw);
        var distinctArtist = ArtistFrom("mastodon", "https://other.example", ContentRating.Sfw);
        var registry = new SourceAdapterRegistry([
            new Source("bluesky", [bluesky]), new Source("mastodon", [mastodon, distinctArtist])
        ]);

        var snapshot = await registry.SyncAllAsync(new());

        Assert.Equal(["bluesky", "mastodon"], snapshot.ActivePlatforms);
        Assert.Equal(2, snapshot.Artists.Count);
        var merged = Assert.Single(snapshot.Artists, a => a.Id == bluesky.Id);
        Assert.Equal(bluesky.SourceProfiles.Concat(mastodon.SourceProfiles), merged.SourceProfiles);
        Assert.Equal(bluesky.Previews.Concat(mastodon.Previews), merged.Previews);
        Assert.Equal(ContentRating.Nsfw, merged.ContentRating);
        Assert.DoesNotContain(new CommissionMatcher().Match(snapshot.Artists, new()), m => m.Artist.Id == merged.Id);
    }

    private static Artist ArtistFrom(string platform, string page, ContentRating rating) => new()
    {
        Id = $"{platform}:{page}", DisplayName = platform, ArtistPageUrl = page, ContentRating = rating,
        SourceProfiles = [new(platform, page, "artist", $"https://{platform}.example/artist")],
        Previews = [new($"https://{platform}.example/preview", "", 4, 3, $"https://{platform}.example/post")]
    };

    private sealed record Source(string PlatformName, IReadOnlyList<Artist> Artists) : ISourceAdapter
    {
        public Task<IReadOnlyList<Artist>> FetchOpenArtistsAsync(SourceSyncOptions options, CancellationToken cancellationToken)
            => Task.FromResult(Artists);
    }
}
