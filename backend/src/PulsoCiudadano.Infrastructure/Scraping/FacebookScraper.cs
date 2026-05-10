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
            var page = await GetPageAsync();
            
            _logger.LogInformation("Scrapeando Facebook: {Url}", url);
            
            await page.GotoAsync(url, new PageGotoOptions 
            { 
                WaitUntil = WaitUntilState.NetworkIdle,
                Timeout = 30000 
            });

            // Cerrar modal de login si aparece
            try
            {
                var closeButton = await page.QuerySelectorAsync("[aria-label='Close'], [aria-label='Cerrar']");
                if (closeButton != null)
                {
                    await closeButton.ClickAsync();
                    await page.WaitForTimeoutAsync(1000);
                }
            }
            catch { /* Ignorar si no hay modal */ }

            // Esperar a que carguen los posts
            await page.WaitForTimeoutAsync(3000);

            // Scroll para cargar más posts
            for (int i = 0; i < 3; i++)
            {
                await page.EvaluateAsync("window.scrollBy(0, window.innerHeight)");
                await page.WaitForTimeoutAsync(2000);
            }

            // Expandir todos los "Ver más" para obtener texto completo
            try
            {
                var verMasButtons = await page.QuerySelectorAllAsync("text=Ver más, text=See more, text=See More");
                foreach (var btn in verMasButtons)
                {
                    try
                    {
                        await btn.ClickAsync();
                        await page.WaitForTimeoutAsync(300);
                    }
                    catch { /* Algunos botones pueden no ser clickeables */ }
                }
                _logger.LogInformation("Expandidos {Count} posts con 'Ver más'", verMasButtons.Count);
            }
            catch { /* Continuar si no hay botones */ }

            // Extraer posts (selectores pueden variar)
            var postElements = await page.QuerySelectorAllAsync("[data-ad-preview='message'], [data-testid='post_message'], div[dir='auto']");
            
            foreach (var postElement in postElements)
            {
                try
                {
                    var textoContent = await postElement.InnerTextAsync();
                    
                    if (string.IsNullOrWhiteSpace(textoContent) || textoContent.Length < 20)
                        continue;

                    // Evitar duplicados y textos muy cortos
                    if (posts.Any(p => p.Texto.Contains(textoContent) || textoContent.Contains(p.Texto)))
                        continue;

                    var stableId = StablePostId.ForFacebook(url, textoContent.Trim());

                    posts.Add(new PostRaw
                    {
                        Id = stableId,
                        Fuente = TipoFuente,
                        UrlOrigen = url,
                        Texto = textoContent.Trim(),
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
