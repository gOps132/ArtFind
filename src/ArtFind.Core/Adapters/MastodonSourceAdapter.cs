using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using ArtFind.Core.Domain;

namespace ArtFind.Core.Adapters;

public sealed partial class MastodonSourceAdapter(HttpClient http, IReadOnlyList<string> profileUrls)
    : SourceAdapterBase(http)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public override string PlatformName => "mastodon";

    public override async Task<IReadOnlyList<Artist>> FetchOpenArtistsAsync(
        SourceSyncOptions options, CancellationToken cancellationToken = default)
    {
        // Validate the whole curated list before making requests.
        var seeds = profileUrls.Select(ParseProfileUrl).Distinct().ToArray();
        var results = new List<Artist>();
        foreach (var (origin, username) in seeds)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (results.Count >= options.MaxArtists) break;

            var account = await Http.GetFromJsonAsync<Account>(
                $"{origin}/api/v1/accounts/lookup?acct={Uri.EscapeDataString(username)}", JsonOptions, cancellationToken);
            if (account?.Id is not { Length: > 0 } id || WebUrl(account.Url) is not { } profileUrl ||
                !string.Equals(account.Acct, username, StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(profileUrl, $"{origin}/@{username}", StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException($"Mastodon lookup did not return the expected local profile: {origin}/@{username}");

            var externalId = $"{new Uri(origin).Authority}/{id}";
            var handle = $"{account.Acct}@{new Uri(origin).Authority}";
            var bio = PlainText(account.Note);
            var fields = account.Fields ?? [];
            if (account.Bot || account.Moved is not null || IsOptedOut(externalId, handle, options) ||
                ArtistNormalizer.HasOptOutSignal(bio) ||
                fields.Any(f => ArtistNormalizer.HasOptOutSignal(f.Name, PlainText(f.Value)))) continue;

            var statuses = await Http.GetFromJsonAsync<Status[]>(
                $"{origin}/api/v1/accounts/{Uri.EscapeDataString(id)}/statuses?exclude_reblogs=true&exclude_replies=true&limit=5",
                JsonOptions, cancellationToken) ?? throw new InvalidDataException($"Mastodon returned no statuses array for {handle}.");

            var posts = statuses
                .Where(s => s.Visibility == "public" && s.Reblog is null && s.InReplyToId is null && s.Account?.Id == id)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => (Status: s, Text: $"{s.SpoilerText} {PlainText(s.Content)}"))
                .ToArray();
            if (posts.Any(p => ArtistNormalizer.HasOptOutSignal(p.Text))) continue;

            var now = DateTimeOffset.UtcNow;
            var recent = posts.Where(p => p.Status.CreatedAt <= now && p.Status.CreatedAt >= now.AddDays(-30)).ToArray();
            // Hashtags help find accounts, but a tag alone can also be someone promoting another Artist.
            var signal = recent.FirstOrDefault(p =>
            {
                var status = ArtistNormalizer.DetectCommissionStatus(null, null, p.Text, p.Status.CreatedAt, now);
                return status is CommissionStatus.Closed or CommissionStatus.Waitlist ||
                    ArtistNormalizer.DetectCommissionStatus(null, null, HashtagRegex().Replace(p.Text, ""),
                        p.Status.CreatedAt, now) == CommissionStatus.Open;
            });
            var lastSignalAt = (signal.Status ?? recent.FirstOrDefault().Status)?.CreatedAt;
            // Treat the most recent explicit post signal as authoritative over older posts.
            if (lastSignalAt is null ||
                ArtistNormalizer.DetectCommissionStatus(bio, null, null, lastSignalAt, now) is
                    CommissionStatus.Closed or CommissionStatus.Waitlist ||
                ArtistNormalizer.DetectCommissionStatus(HashtagRegex().Replace(bio, ""), null, signal.Text, lastSignalAt, now) != CommissionStatus.Open)
                continue;

            var previews = recent
                .Where(p => p.Status.Sensitive == false && string.IsNullOrWhiteSpace(p.Status.SpoilerText))
                .SelectMany(p => Images(p.Status))
                .DistinctBy(p => p.ThumbnailUrl, StringComparer.Ordinal)
                .Take(4).ToArray();
            if (previews.Length == 0) continue;

            // Use links the Artist put in profile fields, not URLs from arbitrary posts or hashtags.
            var portfolioLinks = fields.SelectMany(f => HrefRegex().Matches(f.Value ?? "").Cast<Match>())
                .Select(m => WebUrl(WebUtility.HtmlDecode(m.Groups[1].Value)))
                .OfType<string>()
                .Where(link => !string.Equals(new Uri(link).Authority, new Uri(origin).Authority, StringComparison.OrdinalIgnoreCase));
            var (pageUrl, pageType) = ArtistNormalizer.SelectCanonicalArtistPage(portfolioLinks, profileUrl, ArtistPageType.Other);
            var name = string.IsNullOrWhiteSpace(account.DisplayName) ? handle : account.DisplayName;
            var (styles, categories) = ArtistNormalizer.ExtractTags(name, bio, signal.Text);
            results.Add(new Artist
            {
                Id = BuildDeterministicId(PlatformName, externalId),
                DisplayName = name,
                BioSnippet = ArtistNormalizer.BuildBioSnippet(bio, signal.Text),
                AvatarUrl = WebUrl(account.AvatarStatic),
                ArtistPageUrl = pageUrl,
                ArtistPageType = pageType,
                ContentRating = ArtistNormalizer.HasAdultContentSignal(name, bio) ||
                    fields.Any(f => ArtistNormalizer.HasAdultContentSignal(f.Name, PlainText(f.Value))) ||
                    recent.Any(p => ArtistNormalizer.HasAdultContentSignal(p.Text))
                    ? ContentRating.Nsfw : ContentRating.Sfw,
                StyleTags = styles,
                CategoryTags = categories,
                PriceRange = ArtistNormalizer.ExtractPriceRange(signal.Text, bio),
                Previews = previews,
                SourceProfiles = [new(PlatformName, externalId, handle, profileUrl,
                    WebUrl(signal.Status?.Url) ?? previews[0].SourcePostUrl)],
                LastVerifiedAt = lastSignalAt.Value
            });
        }
        return results;
    }

    private static IEnumerable<ArtworkPreview> Images(Status status)
    {
        if (WebUrl(status.Url) is not { } postUrl) yield break;
        foreach (var media in status.MediaAttachments ?? [])
        {
            if (media.Type != "image" || WebUrl(media.PreviewUrl) is not { } thumbnail) continue;
            var size = media.Meta?.Small ?? media.Meta?.Original;
            yield return new ArtworkPreview(thumbnail, media.Description ?? "",
                size is { Width: > 0, Height: > 0 } ? size.Width : 4,
                size is { Width: > 0, Height: > 0 } ? size.Height : 3, postUrl);
        }
    }

    private static (string Origin, string Username) ParseProfileUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != "https" ||
            uri.UserInfo.Length > 0 || !uri.IsDefaultPort || uri.Query.Length > 0 || uri.Fragment.Length > 0 ||
            !ProfilePathRegex().IsMatch(uri.AbsolutePath))
            throw new ArgumentException($"Expected a Mastodon profile URL like https://instance.example/@artist: {value}");
        return (uri.GetLeftPart(UriPartial.Authority), uri.AbsolutePath.TrimEnd('/')[2..].ToLowerInvariant());
    }

    private static string? WebUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.UserInfo.Length == 0
            ? uri.AbsoluteUri : null;

    private static string PlainText(string? html) => WebUtility.HtmlDecode(TagRegex().Replace(
        BreakRegex().Replace(html ?? "", " "), ""));

    [GeneratedRegex(@"^/@[a-zA-Z0-9_]+/?$")]
    private static partial Regex ProfilePathRegex();
    [GeneratedRegex(@"\bhref=""([^""]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex HrefRegex();
    [GeneratedRegex(@"#[\p{L}\p{N}_]+")]
    private static partial Regex HashtagRegex();
    [GeneratedRegex(@"</p>|<br\s*/?>", RegexOptions.IgnoreCase)]
    private static partial Regex BreakRegex();
    [GeneratedRegex("<[^>]*>")]
    private static partial Regex TagRegex();

    private sealed record Account(string? Id, string? Acct, string? Url, string? DisplayName,
        string? Note, string? AvatarStatic, bool Bot, Account? Moved, Field[]? Fields);
    private sealed record Field(string? Name, string? Value);
    private sealed record Status(string? Url, string? Visibility, DateTimeOffset CreatedAt, string? Content,
        string? SpoilerText, bool? Sensitive, Status? Reblog, string? InReplyToId, Account? Account,
        Media[]? MediaAttachments);
    private sealed record Media(string? Type, string? PreviewUrl, string? Description, MediaMeta? Meta);
    private sealed record MediaMeta(Size? Small, Size? Original);
    private sealed record Size(int Width, int Height);
}
