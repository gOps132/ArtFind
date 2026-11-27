using ArtFind.Core.Domain;

namespace ArtFind.Web.Services;

public sealed class SupabaseOptions
{
    public string Url { get; set; } = string.Empty;
    public string AnonKey { get; set; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Url) &&
        !string.IsNullOrWhiteSpace(AnonKey);
}

public interface IArtistCatalogService
{
    bool IsUsingSupabase { get; }
    Task<ArtistCatalogSnapshot> LoadCatalogAsync(CancellationToken cancellationToken = default);
    Task<bool> SubmitOptOutAsync(string handle, string? reason, CancellationToken cancellationToken = default);
}
