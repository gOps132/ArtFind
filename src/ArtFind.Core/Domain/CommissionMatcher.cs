namespace ArtFind.Core.Domain;

public sealed class CommissionMatcher
{
    public IReadOnlyList<ArtistMatch> Match(
        IEnumerable<Artist> artists,
        CommissionBrief brief)
    {
        var tokens = Tokenize(brief.Query);
        var results = new List<ArtistMatch>();

        foreach (var artist in artists)
        {
            if (brief.OpenOnly && artist.CommissionStatus != CommissionStatus.Open)
                continue;

            if (!brief.IncludeNsfw && artist.ContentRating == ContentRating.Nsfw)
                continue;

            if (brief.PreferredPageType.HasValue && artist.ArtistPageType != brief.PreferredPageType.Value)
                continue;

            if (brief.MaxBudgetUsd.HasValue && artist.PriceRange?.MinUsd is int minPrice && minPrice > brief.MaxBudgetUsd.Value)
                continue;

            if (brief.StyleTags.Count > 0 &&
                !brief.StyleTags.Any(st => artist.StyleTags.Any(t => t.Equals(st, StringComparison.OrdinalIgnoreCase))))
                continue;

            if (brief.CategoryTags.Count > 0 &&
                !brief.CategoryTags.Any(ct => artist.CategoryTags.Any(t => t.Equals(ct, StringComparison.OrdinalIgnoreCase))))
                continue;

            var (score, reasons, hasQueryHit) = ScoreArtist(artist, brief, tokens);

            // If the user typed a natural-language brief, require at least one positive text/tag hit
            if (tokens.Count > 0 && !hasQueryHit)
                continue;

            results.Add(new ArtistMatch(artist, Math.Round(score, 3), reasons));
        }

        return results
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.Artist.Previews.Count)
            .ThenByDescending(r => r.Artist.LastVerifiedAt)
            .ToList();
    }

    private static (double Score, IReadOnlyList<string> Reasons, bool HasQueryHit) ScoreArtist(
        Artist artist,
        CommissionBrief brief,
        IReadOnlyList<string> queryTokens)
    {
        double score = 0;
        var reasons = new List<string>();

        var searchableText = string.Join(' ',
            artist.DisplayName,
            artist.BioSnippet,
            artist.PrimarySource?.Handle ?? string.Empty,
            string.Join(' ', artist.StyleTags),
            string.Join(' ', artist.CategoryTags)).ToLowerInvariant();

        // 1. Style & category filter hits
        foreach (var style in brief.StyleTags)
        {
            if (artist.StyleTags.Any(t => t.Equals(style, StringComparison.OrdinalIgnoreCase)))
            {
                score += 2.5;
                reasons.Add($"Style: {style}");
            }
        }

        foreach (var category in brief.CategoryTags)
        {
            if (artist.CategoryTags.Any(t => t.Equals(category, StringComparison.OrdinalIgnoreCase)))
            {
                score += 2.5;
                reasons.Add($"Category: {category}");
            }
        }

        // 2. Natural-language Commission Brief token relevance
        var matchedTerms = 0;
        if (queryTokens.Count > 0)
        {
            var matchedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var token in queryTokens)
            {
                var tagHit = artist.StyleTags.FirstOrDefault(t => t.Contains(token, StringComparison.OrdinalIgnoreCase))
                    ?? artist.CategoryTags.FirstOrDefault(t => t.Contains(token, StringComparison.OrdinalIgnoreCase));

                if (tagHit is not null)
                {
                    score += 3.0;
                    matchedTerms++;
                    if (matchedTags.Add(tagHit))
                        reasons.Add($"Matches {tagHit}");
                }
                else if (searchableText.Contains(token, StringComparison.Ordinal))
                {
                    score += 1.4;
                    matchedTerms++;
                }
            }

            if (matchedTerms > 0 && matchedTags.Count == 0)
                reasons.Add(matchedTerms == 1 ? "Bio keyword match" : $"{matchedTerms} brief keywords");
        }

        // 3. Budget alignment bonus
        if (brief.MaxBudgetUsd.HasValue && artist.PriceRange?.MinUsd is int minUsd)
        {
            if (minUsd <= brief.MaxBudgetUsd.Value)
            {
                score += 1.5;
                reasons.Add($"Fits <= ${brief.MaxBudgetUsd.Value}");
            }
        }

        // 4. Visual preview & dedicated Artist Page quality tie-breakers
        if (artist.Previews.Count > 0)
            score += Math.Min(0.6, artist.Previews.Count * 0.15);

        if (artist.ArtistPageType is ArtistPageType.VGen or ArtistPageType.Carrd or ArtistPageType.Kofi or ArtistPageType.Artistree)
            score += 0.25;

        // 5. Freshness boost (recent open signal within 7 days)
        var ageDays = (DateTimeOffset.UtcNow - artist.LastVerifiedAt).TotalDays;
        if (ageDays <= 7)
            score += 0.2;

        return (score, reasons.Take(3).ToList(), matchedTerms > 0);
    }

    private static IReadOnlyList<string> Tokenize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return [];

        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "a", "an", "the", "for", "of", "to", "in", "on", "with", "and", "or",
            "looking", "need", "want", "artist", "art", "commission", "commissions", "someone", "who", "can", "draw"
        };

        return input
            .Split([' ', ',', '.', ';', ':', '/', '|', '!', '?', '(', ')'], StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length >= 2 && !stopWords.Contains(t))
            .Distinct()
            .ToList();
    }
}
