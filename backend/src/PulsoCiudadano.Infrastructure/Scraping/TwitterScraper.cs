using Microsoft.Extensions.Logging;
using Microsoft.Playwright;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.Scraping;

/// <summary>
/// Scraper para Twitter/X (páginas públicas)
/// </summary>
public class TwitterScraper : ScraperBase
{
    private readonly ILogger<TwitterScraper> _logger;
    
    public override string TipoFuente => "twitter";

    public TwitterScraper(ILogger<TwitterScraper> logger)
    {
        _logger = logger;
    }

    public override async Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null)
    {
        var posts = new List<PostRaw>();
        
        try
        {
            var page = await GetPageAsync();
            
            // Configurar user agent para evitar bloqueos
            await page.SetExtraHTTPHeadersAsync(new Dictionary<string, string>
            {
                { "Accept-Language", "es-MX,es;q=0.9" }
            });

            _logger.LogInformation("Scrapeando Twitter: {Url}", url);
            
            await page.GotoAsync(url, new PageGotoOptions 
            { 
                WaitUntil = WaitUntilState.NetworkIdle,
                Timeout = 30000 
            });

            // Esperar a que carguen los tweets
            await page.WaitForSelectorAsync("article[data-testid='tweet']", new PageWaitForSelectorOptions
            {
                Timeout = 10000
            });

            // Scroll para cargar más tweets
            for (int i = 0; i < 3; i++)
            {
                await page.EvaluateAsync("window.scrollBy(0, window.innerHeight)");
                await page.WaitForTimeoutAsync(1500);
            }

            // Extraer tweets
            var tweetElements = await page.QuerySelectorAllAsync("article[data-testid='tweet']");
            
            foreach (var tweet in tweetElements)
            {
                try
                {
                    var texto = await tweet.QuerySelectorAsync("[data-testid='tweetText']");
                    var textoContent = texto != null ? await texto.InnerTextAsync() : "";
                    
                    if (string.IsNullOrWhiteSpace(textoContent))
                        continue;

                    // Extraer link del tweet
                    var timeElement = await tweet.QuerySelectorAsync("time");
                    var linkElement = timeElement != null ? await timeElement.EvaluateAsync<string>("el => el.closest('a')?.href") : null;
                    var fechaStr = timeElement != null ? await timeElement.GetAttributeAsync("datetime") : null;
                    
                    var fecha = DateTime.TryParse(fechaStr, out var parsedFecha) 
                        ? parsedFecha 
                        : DateTime.UtcNow;

                    // Filtrar por fecha si se especificó
                    if (desde.HasValue && fecha < desde.Value)
                        continue;

                    var stableId = StablePostId.ForTwitter(linkElement, textoContent);

                    posts.Add(new PostRaw
                    {
                        Id = stableId,
                        Fuente = TipoFuente,
                        UrlOrigen = linkElement ?? url,
                        Texto = textoContent,
                        Fecha = fecha,
                        MunicipioId = municipioId
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error procesando tweet individual");
                }
            }

            _logger.LogInformation("Scrapeados {Count} tweets de {Url}", posts.Count, url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scrapeando Twitter: {Url}", url);
        }

        return posts;
    }
}
