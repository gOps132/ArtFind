namespace ArtFind.Core.Domain;

public sealed record CommissionBrief
{
    public string Query { get; init; } = string.Empty;
    public IReadOnlyList<string> StyleTags { get; init; } = [];
    public IReadOnlyList<string> CategoryTags { get; init; } = [];
    public int? MaxBudgetUsd { get; init; }
    public ArtistPageType? PreferredPageType { get; init; }
    public bool IncludeNsfw { get; init; } = false;
    public bool OpenOnly { get; init; } = true;
}

public sealed record ArtistMatch(
    Artist Artist,
    double Score,
    IReadOnlyList<string> MatchReasons
);
