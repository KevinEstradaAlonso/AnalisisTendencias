using Microsoft.Playwright;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.Scraping;

/// <summary>
/// Scraper base con funcionalidad común
/// </summary>
public abstract class ScraperBase : IScraperService, IAsyncDisposable
{
    protected IPlaywright? Playwright;
    protected IBrowser? Browser;
    
    public abstract string TipoFuente { get; }
    
    public abstract Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null);

    protected async Task InitializeAsync()
    {
        if (Playwright == null)
        {
            Playwright = await Microsoft.Playwright.Playwright.CreateAsync();
            Browser = await Playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = true
            });
        }
    }

    protected async Task<IPage> GetPageAsync()
    {
        await InitializeAsync();
        return await Browser!.NewPageAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (Browser != null)
        {
            await Browser.DisposeAsync();
        }
        Playwright?.Dispose();
    }
}
