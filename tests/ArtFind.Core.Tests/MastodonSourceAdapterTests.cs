using System.Net;
using System.Text.Json.Nodes;
using ArtFind.Core.Adapters;
using ArtFind.Core.Domain;

namespace ArtFind.Core.Tests;

public sealed class MastodonSourceAdapterTests
{
    private const string Profile = "https://art.example/@artist";
    private const string PostsPath = "/api/v1/accounts/42/statuses?exclude_reblogs=true&exclude_replies=true&limit=5";
    private const string LookupPath = "/api/v1/accounts/lookup?acct=artist";
    private const string Account = """
        {"id":"42","acct":"artist","url":"https://art.example/@artist","display_name":"Example Artist",
         "note":"<p>Fantasy &amp; anime<br>Commissions OPEN</p>","avatar_static":"https://art.example/avatar.png",
         "fields":[{"name":"Portfolio","value":"<a href=\"https://artist.example/work?a=1&amp;b=2\">Portfolio</a>"}]}
        """;

    [Fact]
    public async Task MapsLiveApiShapeAndOnlyUsesEligibleUniqueImages()
    {
        var hidden = Post();
        hidden["sensitive"] = true;
        hidden["media_attachments"]![0]!["preview_url"] = "https://art.example/hidden.png";
        var warned = Post();
        warned["spoiler_text"] = "Content warning";
        warned["media_attachments"]![0]!["preview_url"] = "https://art.example/warned.png";
        using var handler = new Responses(Account, new JsonArray(hidden, warned, Post(), Post()).ToJsonString());
        using var http = new HttpClient(handler);
        var registry = new SourceAdapterRegistry([new MastodonSourceAdapter(http, [Profile, Profile + "/"])]);

        var snapshot = await registry.SyncAllAsync(new());

        Assert.Equal(["mastodon"], snapshot.ActivePlatforms);
        var artist = Assert.Single(snapshot.Artists);
        Assert.Equal("mastodon:art.example/42", artist.Id);
        Assert.Equal("Example Artist", artist.DisplayName);
        Assert.Equal("Fantasy & anime Commissions OPEN", artist.BioSnippet);
        Assert.Equal("https://art.example/avatar.png", artist.AvatarUrl);
        Assert.Equal("https://artist.example/work?a=1&b=2", artist.ArtistPageUrl);
        Assert.Equal(CommissionStatus.Open, artist.CommissionStatus);
        Assert.Equal("artist@art.example", artist.PrimarySource?.Handle);
        Assert.Equal(Profile, artist.PrimarySource?.ProfileUrl);
        var preview = Assert.Single(artist.Previews);
        Assert.Equal("A painting", preview.AltText);
        Assert.Equal((320, 240), (preview.AspectWidth, preview.AspectHeight));
        Assert.Equal(Profile + "/100", preview.SourcePostUrl);
        Assert.Equal([LookupPath, PostsPath], handler.Paths);
    }

    [Theory]
    [InlineData("unlisted")]
    [InlineData("boost")]
    [InlineData("reply")]
    [InlineData("different author")]
    [InlineData("sensitive")]
    [InlineData("video")]
    [InlineData("invalid preview")]
    [InlineData("stale")]
    [InlineData("closed")]
    [InlineData("waitlist")]
    [InlineData("post opt-out")]
    public async Task ExcludesIneligiblePosts(string reason)
    {
        var post = Post();
        switch (reason)
        {
            case "unlisted": post["visibility"] = "unlisted"; break;
            case "boost": post["reblog"] = new JsonObject(); break;
            case "reply": post["in_reply_to_id"] = "10"; break;
            case "different author": post["account"]!["id"] = "9"; break;
            case "sensitive": post["sensitive"] = true; break;
            case "video": post["media_attachments"]![0]!["type"] = "video"; break;
            case "invalid preview": post["media_attachments"]![0]!["preview_url"] = "file:///preview"; break;
            case "stale": post["created_at"] = DateTimeOffset.UtcNow.AddDays(-31); break;
            case "closed": post["content"] = "Commissions closed"; break;
            case "waitlist": post["content"] = "Commissions waitlist"; break;
            case "post opt-out": post["content"] = "<a>#<span>noartfind</span></a>"; break;
        }
        using var handler = new Responses(Account, new JsonArray(post).ToJsonString());
        using var http = new HttpClient(handler);
        Assert.Empty(await new MastodonSourceAdapter(http, [Profile]).FetchOpenArtistsAsync(new()));
        Assert.Equal([LookupPath, PostsPath], handler.Paths);
    }

    [Theory]
    [InlineData("id")]
    [InlineData("handle")]
    [InlineData("bio")]
    [InlineData("field")]
    [InlineData("bot")]
    [InlineData("moved")]
    public async Task SkipsExcludedAccountBeforeReadingPosts(string reason)
    {
        var account = JsonNode.Parse(Account)!;
        var options = new SourceSyncOptions();
        switch (reason)
        {
            case "id": options = new(OptOutExternalIds: new HashSet<string> { "art.example/42" }); break;
            case "handle": options = new(OptOutHandles: new HashSet<string> { "artist@art.example" }); break;
            case "bio": account["note"] = "#noartfind"; break;
            case "field": account["fields"]![0]!["value"] = "#noartfind"; break;
            case "bot": account["bot"] = true; break;
            case "moved": account["moved"] = new JsonObject(); break;
        }
        using var handler = new Responses(account.ToJsonString(), "[]");
        using var http = new HttpClient(handler);
        Assert.Empty(await new MastodonSourceAdapter(http, [Profile]).FetchOpenArtistsAsync(options));
        Assert.Equal([LookupPath], handler.Paths);
    }

    [Theory]
    [InlineData("Sharing a friend's work #CommissionsOpen", false)]
    [InlineData("My commissions are ready: commissions open", true)]
    public async Task RequiresMoreThanAnOpenHashtagWhenBioHasNoSignal(string text, bool expected)
    {
        var account = JsonNode.Parse(Account)!;
        account["note"] = "Digital illustrator";
        var post = Post();
        post["content"] = text;
        using var handler = new Responses(account.ToJsonString(), new JsonArray(post).ToJsonString());
        using var http = new HttpClient(handler);
        var artists = await new MastodonSourceAdapter(http, [Profile]).FetchOpenArtistsAsync(new());
        Assert.Equal(expected, artists.Count == 1);
    }

    [Fact]
    public async Task InvalidSeedAndCancellationDoNotSendRequests()
    {
        using var handler = new Responses(Account, "[]");
        using var http = new HttpClient(handler);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            new MastodonSourceAdapter(http, [Profile, Profile + "/1"]).FetchOpenArtistsAsync(new()));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            new MastodonSourceAdapter(http, [Profile]).FetchOpenArtistsAsync(new(), new CancellationToken(true)));
        Assert.Empty(handler.Paths);
    }

    [Fact]
    public async Task SurfacesHttpErrorsInsteadOfReturningAnEmptyCatalog()
    {
        using var handler = new Responses(Account, "[]", HttpStatusCode.TooManyRequests);
        using var http = new HttpClient(handler);
        var error = await Assert.ThrowsAsync<HttpRequestException>(() =>
            new MastodonSourceAdapter(http, [Profile]).FetchOpenArtistsAsync(new()));
        Assert.Equal(HttpStatusCode.TooManyRequests, error.StatusCode);
    }

    private static JsonNode Post()
    {
        var post = JsonNode.Parse("""
            {"url":"https://art.example/@artist/100","visibility":"public","sensitive":false,
             "content":"<p>My painting</p>","account":{"id":"42"},"media_attachments":[{
               "type":"image","preview_url":"https://art.example/image.png","description":"A painting",
               "meta":{"small":{"width":320,"height":240}}}]}
            """)!;
        post["created_at"] = DateTimeOffset.UtcNow.AddDays(-1);
        return post;
    }

    private sealed class Responses(string account, string posts, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
    {
        public List<string> Paths { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var path = request.RequestUri!.PathAndQuery;
            Paths.Add(path);
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(path switch
            {
                LookupPath => account,
                PostsPath => posts,
                _ => throw new InvalidOperationException(path)
            }) });
        }
    }
}
