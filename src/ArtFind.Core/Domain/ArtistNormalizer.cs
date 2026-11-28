using System.Text.RegularExpressions;

namespace ArtFind.Core.Domain;

public static partial class ArtistNormalizer
{
    private static readonly (string Tag, string[] Patterns)[] StyleRules =
    [
        ("anime", ["anime", "manga", "cel shade", "cel-shade", "jrpg", "webtoon"]),
        ("semi-realistic", ["semi-real", "semireal", "painterly", "rendered", "digital painting"]),
        ("chibi", ["chibi", "sd art", "mini"]),
        ("pixel-art", ["pixel art", "pixelart", "8-bit", "16-bit", "sprite"]),
        ("cartoon", ["cartoon", "toony", "stylized", "western"]),
        ("comic", ["comic", "lineart", "inked", "sketch"]),
        ("fantasy", ["fantasy", "dnd", "d&d", "ttrpg", "rpg", "oc art", "oc"]),
        ("furry", ["furry", "anthro", "fursona"]),
        ("watercolor", ["watercolor", "gouache", "traditional", "oil paint"]),
        ("minimalist", ["minimalist", "vector", "flat color", "icon"])
    ];

    private static readonly (string Tag, string[] Patterns)[] CategoryRules =
    [
        ("character-art", ["character", "oc", "full body", "fullbody", "half body", "bust", "waist up"]),
        ("portrait", ["portrait", "headshot", "pfp", "icon", "avatar"]),
        ("vtuber", ["vtuber", "live2d", "rigging", "pngtuber", "model"]),
        ("emotes", ["emote", "emotes", "badge", "badges", "twitch", "sticker"]),
        ("illustration", ["illustration", "scene", "splash", "background", "landscape"]),
        ("reference-sheet", ["ref sheet", "reference sheet", "character sheet", "turnaround"]),
        ("concept-art", ["concept art", "environment", "prop design", "weapon design"]),
        ("book-cover", ["book cover", "album cover", "cover art", "poster"])
    ];

    private static readonly HashSet<string> IgnoredHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "bsky.app",
        "www.bsky.app",
        "twitter.com",
        "x.com",
        "t.co",
        "youtu.be",
        "youtube.com",
        "tiktok.com",
        "instagram.com",
        "facebook.com",
        "discord.gg",
        "discord.com"
    };

    private static readonly string[] PreferredCommissionHosts =
    [
        "vgen.co",
        "carrd.co",
        "ko-fi.com",
        "artistree.io",
        "straw.page",
        "linktr.ee",
        "linktree.com",
        "trello.com",
        "commiss.io",
        "artstation.com",
        "behance.net",
        "cara.app",
        "portfolio"
    ];

    public static bool HasAdultContentSignal(params string?[] texts) =>
        texts.Any(text => text is not null && AdultContentRegex().IsMatch(NotAdultContentRegex().Replace(text, " ")));

    [GeneratedRegex(@"🔞|(?<!\w)(?:18\+|\+18)(?!\w)|\b(?:nsfw|adults?[- ]only|adult content|no minors|minors dni)\b", RegexOptions.IgnoreCase)]
    private static partial Regex AdultContentRegex();

    [GeneratedRegex(@"\b(?:no\s+(?:nsfw|adult content)|nsfw[- ]free)\b|\bsfw\s*\(nsfw on [^)]*\)", RegexOptions.IgnoreCase)]
    private static partial Regex NotAdultContentRegex();

    public static bool HasOptOutSignal(params string?[] texts)
    {
        foreach (var text in texts)
        {
            if (string.IsNullOrWhiteSpace(text)) continue;
            if (OptOutRegex().IsMatch(text)) return true;
        }
        return false;
    }

    public static CommissionStatus DetectCommissionStatus(
        string? bio,
        string? postText,
        string? pinnedPostText,
        DateTimeOffset? lastSignalAt,
        DateTimeOffset? now = null)
    {
        var referenceNow = now ?? DateTimeOffset.UtcNow;

        // Bio or pinned post explicitly marked closed overrides older open posts
        if (ContainsClosedSignal(bio) || ContainsClosedSignal(pinnedPostText))
            return CommissionStatus.Closed;

        if (ContainsWaitlistSignal(bio) || ContainsWaitlistSignal(pinnedPostText))
            return CommissionStatus.Waitlist;

        if (ContainsClosedSignal(postText))
            return CommissionStatus.Closed;

        var hasOpenSignal =
            ContainsOpenSignal(bio) ||
            ContainsOpenSignal(pinnedPostText) ||
            ContainsOpenSignal(postText);

        if (!hasOpenSignal)
            return CommissionStatus.Unknown;

        // Freshness TTL: 30 days since last verified open signal
        if (lastSignalAt.HasValue && (referenceNow - lastSignalAt.Value).TotalDays > 30)
            return CommissionStatus.Unknown;

        return CommissionStatus.Open;
    }

    public static (string Url, ArtistPageType PageType) SelectCanonicalArtistPage(
        IEnumerable<string> candidateUrls,
        string fallbackProfileUrl,
        ArtistPageType fallbackType = ArtistPageType.Bluesky)
    {
        var normalized = candidateUrls
            .Select(NormalizeUrl)
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // First pass: known commission/portfolio hosts in priority order
        foreach (var preferredHost in PreferredCommissionHosts)
        {
            var match = normalized.FirstOrDefault(u =>
                Uri.TryCreate(u, UriKind.Absolute, out var uri) &&
                uri.Host.Contains(preferredHost, StringComparison.OrdinalIgnoreCase));

            if (match is not null)
                return (match, ClassifyPageType(match));
        }

        // Second pass: any non-social external personal website/portfolio
        var externalSite = normalized.FirstOrDefault(u =>
            Uri.TryCreate(u, UriKind.Absolute, out var uri) &&
            !IgnoredHosts.Contains(uri.Host));

        if (externalSite is not null)
            return (externalSite, ClassifyPageType(externalSite));

        return (NormalizeUrl(fallbackProfileUrl), fallbackType);
    }

    public static ArtistPageType ClassifyPageType(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return ArtistPageType.Other;

        var host = uri.Host.ToLowerInvariant();
        if (host.Contains("vgen.co")) return ArtistPageType.VGen;
        if (host.Contains("carrd.co") || host.Contains("straw.page")) return ArtistPageType.Carrd;
        if (host.Contains("ko-fi.com")) return ArtistPageType.Kofi;
        if (host.Contains("artistree.io")) return ArtistPageType.Artistree;
        if (host.Contains("bsky.app")) return ArtistPageType.Bluesky;
        return ArtistPageType.Portfolio;
    }

    public static IReadOnlyList<string> ExtractUrlsFromText(params string?[] texts)
    {
        var urls = new List<string>();
        foreach (var text in texts)
        {
            if (string.IsNullOrWhiteSpace(text)) continue;
            foreach (Match m in UrlRegex().Matches(text))
            {
                var raw = m.Value.TrimEnd('.', ',', ')', ']', '!', '?');
                if (!raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                    !raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    raw = "https://" + raw;
                }
                if (Uri.TryCreate(raw, UriKind.Absolute, out _))
                    urls.Add(raw);
            }
        }
        return urls;
    }

    public static string NormalizeUrl(string url)
    {
        var trimmed = url.Trim();
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            return trimmed;

        var builder = new UriBuilder(uri)
        {
            Scheme = "https",
            Port = -1,
            Fragment = string.Empty
        };

        var result = builder.Uri.ToString().TrimEnd('/');
        return result;
    }

    public static (IReadOnlyList<string> Styles, IReadOnlyList<string> Categories) ExtractTags(
        params string?[] texts)
    {
        var combined = string.Join(' ', texts.Where(t => !string.IsNullOrWhiteSpace(t))).ToLowerInvariant();
        var styles = new List<string>();
        var categories = new List<string>();

        foreach (var (tag, patterns) in StyleRules)
        {
            if (patterns.Any(p => combined.Contains(p, StringComparison.Ordinal)))
                styles.Add(tag);
        }

        foreach (var (tag, patterns) in CategoryRules)
        {
            if (patterns.Any(p => combined.Contains(p, StringComparison.Ordinal)))
                categories.Add(tag);
        }

        return (styles, categories);
    }

    public static PriceRange? ExtractPriceRange(params string?[] texts)
    {
        var combined = string.Join(' ', texts.Where(t => !string.IsNullOrWhiteSpace(t)));
        if (string.IsNullOrWhiteSpace(combined)) return null;

        var rangeMatch = PriceRangeRegex().Match(combined);
        if (rangeMatch.Success &&
            int.TryParse(rangeMatch.Groups[1].Value, out var minVal) &&
            int.TryParse(rangeMatch.Groups[2].Value, out var maxVal) &&
            minVal > 0 && maxVal >= minVal && maxVal <= 5000)
        {
            return new PriceRange(minVal, maxVal, $"${minVal}–${maxVal}");
        }

        var singleMatches = SinglePriceRegex().Matches(combined)
            .Select(m => int.TryParse(m.Groups[1].Value, out var v) ? v : 0)
            .Where(v => v >= 5 && v <= 5000)
            .Distinct()
            .Order()
            .ToList();

        if (singleMatches.Count == 0) return null;

        if (singleMatches.Count == 1)
            return new PriceRange(singleMatches[0], null, $"From ${singleMatches[0]}");

        return new PriceRange(
            singleMatches[0],
            singleMatches[^1],
            $"${singleMatches[0]}–${singleMatches[^1]}");
    }

    public static string BuildBioSnippet(string? bio, string? postText, int maxLength = 220)
    {
        var source = !string.IsNullOrWhiteSpace(bio) ? bio : (postText ?? string.Empty);
        var cleaned = WhitespaceRegex().Replace(source, " ").Trim();
        if (cleaned.Length <= maxLength) return cleaned;
        return cleaned[..(maxLength - 1)].TrimEnd() + "…";
    }

    private static bool ContainsOpenSignal(string? text) =>
        !string.IsNullOrWhiteSpace(text) && OpenSignalRegex().IsMatch(text);

    private static bool ContainsClosedSignal(string? text) =>
        !string.IsNullOrWhiteSpace(text) && ClosedSignalRegex().IsMatch(text);

    private static bool ContainsWaitlistSignal(string? text) =>
        !string.IsNullOrWhiteSpace(text) && WaitlistSignalRegex().IsMatch(text);

    [GeneratedRegex(@"#noartfind\b", RegexOptions.IgnoreCase)]
    private static partial Regex OptOutRegex();

    [GeneratedRegex(@"(?:#commissions?open|#commsopen|#opencommissions|\bcommissions?\s*[:\-]?\s*open\b|\bcomms?\s*[:\-]?\s*open\b|\bopen\s+for\s+commissions?\b)", RegexOptions.IgnoreCase)]
    private static partial Regex OpenSignalRegex();

    [GeneratedRegex(@"(?:#commissions?closed|#commsclosed|\bcommissions?\s*[:\-]?\s*closed\b|\bcomms?\s*[:\-]?\s*closed\b|\bnot\s+taking\s+commissions?\b)", RegexOptions.IgnoreCase)]
    private static partial Regex ClosedSignalRegex();

    [GeneratedRegex(@"(?:\bcommissions?\s*[:\-]?\s*waitlist\b|\bcomms?\s*[:\-]?\s*waitlist\b)", RegexOptions.IgnoreCase)]
    private static partial Regex WaitlistSignalRegex();

    [GeneratedRegex(@"(?:https?://[^\s<>""']+|(?:vgen\.co|ko-fi\.com|artistree\.io|linktr\.ee|[a-z0-9-]+\.carrd\.co|[a-z0-9-]+\.straw\.page)/?[^\s<>""']*)", RegexOptions.IgnoreCase)]
    private static partial Regex UrlRegex();

    [GeneratedRegex(@"\$\s*(\d{1,4})\s*(?:-|–|—|to)\s*\$?\s*(\d{1,4})\b", RegexOptions.IgnoreCase)]
    private static partial Regex PriceRangeRegex();

    [GeneratedRegex(@"(?:starting\s+at|from|\$|usd\s*)\s*\$?(\d{1,4})(?:\s*usd|\+)?\b", RegexOptions.IgnoreCase)]
    private static partial Regex SinglePriceRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
