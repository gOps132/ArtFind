using ArtFind.Core.Domain;

namespace ArtFind.Core.Adapters;

public sealed record SourceSyncOptions(
    int MaxArtists = 80,
    ISet<string>? OptOutExternalIds = null,
    ISet<string>? OptOutHandles = null
);

/// <summary>
/// Pluggable contract for any Source Platform (Bluesky, DeviantArt, opt-in VGen, etc.).
/// </summary>
public interface ISourceAdapter
{
    string PlatformName { get; }
    Task<IReadOnlyList<Artist>> FetchOpenArtistsAsync(
        SourceSyncOptions options,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Shared OOP base class providing HTTP user-agent defaults, opt-out filtering,
/// and canonical ID helpers for concrete Source Platform adapters.
/// </summary>
public abstract class SourceAdapterBase : ISourceAdapter
{
    protected const string DefaultUserAgent = "ArtFind/0.1 (+https://github.com/gOps132/ArtFind)";

    protected HttpClient Http { get; }

    protected SourceAdapterBase(HttpClient http)
    {
        Http = http;
        if (!Http.DefaultRequestHeaders.UserAgent.Any())
        {
            Http.DefaultRequestHeaders.UserAgent.ParseAdd(DefaultUserAgent);
        }
    }

    public abstract string PlatformName { get; }

    public abstract Task<IReadOnlyList<Artist>> FetchOpenArtistsAsync(
        SourceSyncOptions options,
        CancellationToken cancellationToken = default);

    protected static bool IsOptedOut(string externalId, string handle, SourceSyncOptions options)
    {
        var normalizedHandle = handle.Trim().TrimStart('@').ToLowerInvariant();
        if (options.OptOutExternalIds?.Contains(externalId) == true) return true;
        if (options.OptOutHandles?.Contains(normalizedHandle) == true) return true;
        return false;
    }

    protected static string BuildDeterministicId(string platform, string externalId) =>
        $"{platform.ToLowerInvariant()}:{externalId}";
}
