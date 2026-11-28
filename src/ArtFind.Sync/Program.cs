using System.Text.Json;
using ArtFind.Core.Adapters;

var mastodonPilot = args.FirstOrDefault() == "--mastodon-pilot";
if (mastodonPilot && (args.Length < 3 || string.IsNullOrWhiteSpace(args[1])))
{
    Console.Error.WriteLine("Usage: ArtFind.Sync --mastodon-pilot <output.json> <https://instance/@artist> [...]");
    return 2;
}

var outputPath = Path.GetFullPath(mastodonPilot ? args[1] : args.Length > 0
    ? args[0]
    : Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "ArtFind.Web", "wwwroot", "data", "artists.json"));

var maxArtists = !mastodonPilot && args.Length > 1 && int.TryParse(args[1], out var parsedMax) ? parsedMax : 60;

using var http = new HttpClient(new HttpClientHandler { AutomaticDecompression = System.Net.DecompressionMethods.All })
{
    Timeout = TimeSpan.FromSeconds(25)
};

var registry = new SourceAdapterRegistry([
    mastodonPilot ? new MastodonSourceAdapter(http, args[2..]) : new BlueskySourceAdapter(http)
]);

Console.WriteLine($"[ArtFind.Sync] Syncing open artists from: {string.Join(", ", registry.RegisteredPlatforms)}...");
ArtFind.Core.Domain.ArtistCatalogSnapshot snapshot;
try
{
    snapshot = await registry.SyncAllAsync(new SourceSyncOptions(MaxArtists: maxArtists));
}
catch (Exception error) when (mastodonPilot && error is ArgumentException or HttpRequestException
    or OperationCanceledException or JsonException or InvalidDataException)
{
    Console.Error.WriteLine($"[ArtFind.Sync] Mastodon pilot failed: {error.Message}");
    return 1;
}

Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
var json = JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
{
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
});
await File.WriteAllTextAsync(outputPath, json);

Console.WriteLine($"[ArtFind.Sync] Indexed {snapshot.Artists.Count} open artists -> {outputPath}");
return 0;
