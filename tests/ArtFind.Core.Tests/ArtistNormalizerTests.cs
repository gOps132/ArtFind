using ArtFind.Core.Domain;
using Xunit;

namespace ArtFind.Core.Tests;

public class ArtistNormalizerTests
{
    [Fact]
    public void SelectCanonicalArtistPage_PrefersExternalCommissionLinkOverBlueskyProfile()
    {
        var urls = new[]
        {
            "https://twitter.com/example",
            "https://vgen.co/luna_draws",
            "https://luna.carrd.co"
        };

        var (url, pageType) = ArtistNormalizer.SelectCanonicalArtistPage(
            urls,
            "https://bsky.app/profile/luna.bsky.social");

        Assert.Equal("https://vgen.co/luna_draws", url);
        Assert.Equal(ArtistPageType.VGen, pageType);
    }

    [Fact]
    public void SelectCanonicalArtistPage_FallsBackToBlueskyProfileWhenNoExternalLinkExists()
    {
        var (url, pageType) = ArtistNormalizer.SelectCanonicalArtistPage(
            ["https://bsky.app/profile/kai.bsky.social"],
            "https://bsky.app/profile/kai.bsky.social");

        Assert.Equal("https://bsky.app/profile/kai.bsky.social", url);
        Assert.Equal(ArtistPageType.Bluesky, pageType);
    }

    [Fact]
    public void DetectCommissionStatus_BioClosedOverridesOpenPost()
    {
        var status = ArtistNormalizer.DetectCommissionStatus(
            bio: "Illustrator | Comms: Closed",
            postText: "Old post #commissionsopen",
            pinnedPostText: null,
            lastSignalAt: DateTimeOffset.UtcNow);

        Assert.Equal(CommissionStatus.Closed, status);
    }

    [Fact]
    public void DetectCommissionStatus_ExpiresStalePostsPast30Days()
    {
        var now = new DateTimeOffset(2026, 11, 27, 0, 0, 0, TimeSpan.Zero);
        var status = ArtistNormalizer.DetectCommissionStatus(
            bio: "Digital illustrator",
            postText: "#commissionsopen DM me!",
            pinnedPostText: null,
            lastSignalAt: now.AddDays(-35),
            now: now);

        Assert.Equal(CommissionStatus.Unknown, status);
    }

    [Fact]
    public void ExtractPriceRange_ParsesRangeAndSinglePrices()
    {
        var range = ArtistNormalizer.ExtractPriceRange("Portraits $45 - $120 USD");
        Assert.NotNull(range);
        Assert.Equal(45, range!.MinUsd);
        Assert.Equal(120, range.MaxUsd);

        var single = ArtistNormalizer.ExtractPriceRange("Chibi commissions starting at $30");
        Assert.NotNull(single);
        Assert.Equal(30, single!.MinUsd);
        Assert.Null(single.MaxUsd);
    }

    [Fact]
    public void HasOptOutSignal_DetectsNoArtFindTag()
    {
        Assert.True(ArtistNormalizer.HasOptOutSignal("Illustrator #noartfind"));
        Assert.False(ArtistNormalizer.HasOptOutSignal("Illustrator #commissionsopen"));
    }
}
