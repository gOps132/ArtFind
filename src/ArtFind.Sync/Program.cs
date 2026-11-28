using System.Text.Json;
using ArtFind.Core.Adapters;

var mastodonPilot = args.FirstOrDefault() == "--mastodon-pilot";
var mastodonFlag = Array.IndexOf(args, "--mastodon");
var positional = mastodonFlag < 0 ? args : args[..mastodonFlag];
var profiles = mastodonPilot ? args.Skip(2).ToArray() :
    mastodonFlag < 0 ? [] : args[(mastodonFlag + 1)..];

if (mastodonPilot ? mastodonFlag >= 0 || profiles.Length == 0 || string.IsNullOrWhiteSpace(args[1]) :
    positional.Length > 2 || positional.Any(arg => arg.StartsWith("--", StringComparison.Ordinal)) ||
    (mastodonFlag >= 0 && profiles.Length == 0))
{
    Console.Error.WriteLine("Usage: ArtFind.Sync [output.json [max-artists-per-source]] [--mastodon <profile-url> ...]");
    Console.Error.WriteLine("       ArtFind.Sync --mastodon-pilot <output.json> <profile-url> ...");
    return 2;
}

var outputPath = Path.GetFullPath(mastodonPilot ? args[1] : positional.Length > 0
    ? positional[0]
    : Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "ArtFind.Web", "wwwroot", "data", "artists.json"));

var maxArtists = !mastodonPilot && positional.Length > 1 && int.TryParse(positional[1], out var parsedMax) ? parsedMax : 60;

using var http = new HttpClient(new HttpClientHandler { AutomaticDecompression = System.Net.DecompressionMethods.All })
{
    Timeout = TimeSpan.FromSeconds(25)
};

var registry = new SourceAdapterRegistry();
if (!mastodonPilot) registry.Register(new BlueskySourceAdapter(http));
if (profiles.Length > 0) registry.Register(new MastodonSourceAdapter(http, profiles));

Console.WriteLine($"[ArtFind.Sync] Syncing open artists from: {string.Join(", ", registry.RegisteredPlatforms)}...");
ArtFind.Core.Domain.ArtistCatalogSnapshot snapshot;
try
{
    snapshot = await registry.SyncAllAsync(new SourceSyncOptions(MaxArtists: maxArtists));
}
catch (Exception error) when (profiles.Length > 0 && error is (ArgumentException or HttpRequestException
    or OperationCanceledException or JsonException or InvalidDataException))
{
    Console.Error.WriteLine($"[ArtFind.Sync] Sync failed: {error.Message}");
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
