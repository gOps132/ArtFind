using ArtFind.Core.Domain;
using ArtFind.Web;
using ArtFind.Web.Services;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(_ => new HttpClient
{
    BaseAddress = new Uri(builder.HostEnvironment.BaseAddress)
});

var supabaseOptions = new SupabaseOptions();
builder.Configuration.GetSection("Supabase").Bind(supabaseOptions);
builder.Services.AddSingleton(supabaseOptions);

builder.Services.AddScoped<CommissionMatcher>();
builder.Services.AddScoped<IArtistCatalogService, HybridArtistCatalogService>();

await builder.Build().RunAsync();
