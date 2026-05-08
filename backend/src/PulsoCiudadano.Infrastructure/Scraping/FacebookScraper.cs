using Microsoft.Extensions.Logging;
using Microsoft.Playwright;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.Scraping;

/// <summary>
/// Scraper para páginas públicas de Facebook
/// </summary>
public class FacebookScraper : ScraperBase
{
    private readonly ILogger<FacebookScraper> _logger;
    
    public override string TipoFuente => "facebook";

    public FacebookScraper(ILogger<FacebookScraper> logger)
    {
        _logger = logger;
    }

    public override async Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null)
    {
        var posts = new List<PostRaw>();
        
        try
        {
            await using var page = await GetPageAsync();
            
            _logger.LogInformation("Scrapeando Facebook: {Url}", url);
            
            await page.GotoAsync(url, new PageGotoOptions 
            { 
                WaitUntil = WaitUntilState.NetworkIdle,
                Timeout = 30000 
            });

            // Esperar a que carguen los posts
            await page.WaitForTimeoutAsync(3000);

            // Scroll para cargar más posts
            for (int i = 0; i < 3; i++)
            {
                await page.EvaluateAsync("window.scrollBy(0, window.innerHeight)");
                await page.WaitForTimeoutAsync(2000);
            }

            // Extraer posts (selectores pueden variar)
            var postElements = await page.QuerySelectorAllAsync("[data-ad-preview='message'], [data-testid='post_message']");
            
            foreach (var postElement in postElements)
            {
                try
                {
                    var textoContent = await postElement.InnerTextAsync();
                    
                    if (string.IsNullOrWhiteSpace(textoContent) || textoContent.Length < 10)
                        continue;

                    posts.Add(new PostRaw
                    {
                        Id = Guid.NewGuid().ToString(),
                        Fuente = TipoFuente,
                        UrlOrigen = url,
                        Texto = textoContent,
                        Fecha = DateTime.UtcNow, // Facebook oculta fechas sin login
                        MunicipioId = municipioId
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error procesando post de Facebook");
                }
            }

            _logger.LogInformation("Scrapeados {Count} posts de Facebook: {Url}", posts.Count, url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scrapeando Facebook: {Url}", url);
        }

        return posts;
    }
}
