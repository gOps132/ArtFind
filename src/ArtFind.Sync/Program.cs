using System.Text.Json;
using ArtFind.Core.Adapters;

var outputPath = args.Length > 0
    ? args[0]
    : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "ArtFind.Web", "wwwroot", "data", "artists.json"));

var maxArtists = args.Length > 1 && int.TryParse(args[1], out var parsedMax) ? parsedMax : 60;

using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(25) };

var registry = new SourceAdapterRegistry([
    new BlueskySourceAdapter(http)
    // Future Source Adapters plug in here:
    // new DeviantArtSourceAdapter(http),
]);

Console.WriteLine($"[ArtFind.Sync] Syncing open artists from: {string.Join(", ", registry.RegisteredPlatforms)}...");
var snapshot = await registry.SyncAllAsync(new SourceSyncOptions(MaxArtists: maxArtists));

Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
var json = JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
{
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
});
await File.WriteAllTextAsync(outputPath, json);

Console.WriteLine($"[ArtFind.Sync] Indexed {snapshot.Artists.Count} open artists -> {outputPath}");
