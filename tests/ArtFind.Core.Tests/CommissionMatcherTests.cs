using ArtFind.Core.Domain;
using Xunit;

namespace ArtFind.Core.Tests;

public class CommissionMatcherTests
{
    private readonly CommissionMatcher _matcher = new();

    private static Artist MakeArtist(
        string id,
        string name,
        string bio,
        string[] styles,
        string[] categories,
        int? minUsd = null,
        CommissionStatus status = CommissionStatus.Open,
        ContentRating rating = ContentRating.Sfw) => new()
    {
        Id = id,
        DisplayName = name,
        BioSnippet = bio,
        ArtistPageUrl = $"https://vgen.co/{id}",
        ArtistPageType = ArtistPageType.VGen,
        CommissionStatus = status,
        ContentRating = rating,
        StyleTags = styles,
        CategoryTags = categories,
        PriceRange = minUsd.HasValue ? new PriceRange(minUsd, null, $"From ${minUsd}") : null,
        Previews = [new ArtworkPreview("https://cdn.bsky.app/img/thumb.jpg", "sample", 4, 3)],
        SourceProfiles = [new SourceProfile("bluesky", $"did:plc:{id}", $"{id}.bsky.social", $"https://bsky.app/profile/{id}.bsky.social")]
    };

    [Fact]
    public void Match_ExcludesClosedAndNsfwByDefault()
    {
        var artists = new[]
        {
            MakeArtist("open-sfw", "Mina", "Anime character illustrator", ["anime"], ["character-art"]),
            MakeArtist("closed", "Theo", "Anime character illustrator", ["anime"], ["character-art"], status: CommissionStatus.Closed),
            MakeArtist("nsfw", "Riku", "Anime character illustrator", ["anime"], ["character-art"], rating: ContentRating.Nsfw)
        };

        var matches = _matcher.Match(artists, new CommissionBrief { Query = "anime character" });

        Assert.Single(matches);
        Assert.Equal("open-sfw", matches[0].Artist.Id);
    }

    [Fact]
    public void Match_FiltersByBudgetAndRanksStyleHitsFirst()
    {
        var artists = new[]
        {
            MakeArtist("expensive", "Sora", "Painterly fantasy DnD portraits", ["fantasy", "semi-realistic"], ["portrait"], minUsd: 250),
            MakeArtist("affordable-exact", "Yuki", "Painterly fantasy DnD portraits", ["fantasy", "semi-realistic"], ["portrait"], minUsd: 65),
            MakeArtist("affordable-loose", "Koi", "Chibi emotes for Twitch", ["chibi"], ["emotes"], minUsd: 25)
        };

        var matches = _matcher.Match(artists, new CommissionBrief
        {
            Query = "fantasy portrait",
            MaxBudgetUsd = 100
        });

        Assert.Single(matches);
        Assert.Equal("affordable-exact", matches[0].Artist.Id);
        Assert.Contains(matches[0].MatchReasons, r => r.Contains("fantasy", StringComparison.OrdinalIgnoreCase));
    }
}
