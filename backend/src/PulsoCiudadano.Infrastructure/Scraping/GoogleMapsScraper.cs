using Microsoft.Extensions.Logging;
using Microsoft.Playwright;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.Scraping;

/// <summary>
/// Scraper para reseñas de Google Maps
/// </summary>
public class GoogleMapsScraper : ScraperBase
{
    private readonly ILogger<GoogleMapsScraper> _logger;
    
    public override string TipoFuente => "google_maps";

    public GoogleMapsScraper(ILogger<GoogleMapsScraper> logger)
    {
        _logger = logger;
    }

    public override async Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null)
    {
        var posts = new List<PostRaw>();
        
        try
        {
            var page = await GetPageAsync();
            
            _logger.LogInformation("Scrapeando Google Maps: {Url}", url);
            
            await page.GotoAsync(url, new PageGotoOptions 
            { 
                WaitUntil = WaitUntilState.NetworkIdle,
                Timeout = 30000 
            });

            // Esperar a que carguen las reseñas
            await page.WaitForTimeoutAsync(2000);

            // Click en tab de reseñas si existe
            try
            {
                var reviewsTab = await page.QuerySelectorAsync("button[data-tab-index='1']");
                if (reviewsTab != null)
                {
                    await reviewsTab.ClickAsync();
                    await page.WaitForTimeoutAsync(2000);
                }
            }
            catch { /* Tab puede no existir */ }

            // Scroll para cargar más reseñas
            var scrollContainer = await page.QuerySelectorAsync("[role='main']");
            if (scrollContainer != null)
            {
                for (int i = 0; i < 5; i++)
                {
                    await scrollContainer.EvaluateAsync("el => el.scrollTop = el.scrollHeight");
                    await page.WaitForTimeoutAsync(1500);
                }
            }

            // Extraer reseñas
            var reviewElements = await page.QuerySelectorAllAsync("[data-review-id], .jftiEf");
            
            foreach (var review in reviewElements)
            {
                try
                {
                    // Expandir reseña si está truncada
                    var moreButton = await review.QuerySelectorAsync("button.w8nwRe");
                    if (moreButton != null)
                    {
                        await moreButton.ClickAsync();
                        await page.WaitForTimeoutAsync(300);
                    }

                    var textoElement = await review.QuerySelectorAsync(".wiI7pd, .MyEned");
                    var textoContent = textoElement != null ? await textoElement.InnerTextAsync() : "";
                    
                    if (string.IsNullOrWhiteSpace(textoContent) || textoContent.Length < 10)
                        continue;

                    // Extraer fecha relativa
                    var fechaElement = await review.QuerySelectorAsync(".rsqaWe");
                    var fechaTexto = fechaElement != null ? await fechaElement.InnerTextAsync() : "";
                    var fecha = ParseFechaRelativa(fechaTexto);

                    if (desde.HasValue && fecha < desde.Value)
                        continue;

                    posts.Add(new PostRaw
                    {
                        Id = Guid.NewGuid().ToString(),
                        Fuente = TipoFuente,
                        UrlOrigen = url,
                        Texto = textoContent,
                        Fecha = fecha,
                        MunicipioId = municipioId
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error procesando reseña de Google Maps");
                }
            }

            _logger.LogInformation("Scrapeadas {Count} reseñas de Google Maps: {Url}", posts.Count, url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scrapeando Google Maps: {Url}", url);
        }

        return posts;
    }

    private static DateTime ParseFechaRelativa(string fechaTexto)
    {
        // Parsear fechas como "hace 2 días", "hace una semana", etc.
        fechaTexto = fechaTexto.ToLowerInvariant();
        var now = DateTime.UtcNow;

        if (fechaTexto.Contains("hora"))
        {
            var num = ExtractNumber(fechaTexto);
            return now.AddHours(-num);
        }
        if (fechaTexto.Contains("día") || fechaTexto.Contains("dia"))
        {
            var num = ExtractNumber(fechaTexto);
            return now.AddDays(-num);
        }
        if (fechaTexto.Contains("semana"))
        {
            var num = ExtractNumber(fechaTexto);
            return now.AddDays(-7 * num);
        }
        if (fechaTexto.Contains("mes"))
        {
            var num = ExtractNumber(fechaTexto);
            return now.AddMonths(-num);
        }
        if (fechaTexto.Contains("año"))
        {
            var num = ExtractNumber(fechaTexto);
            return now.AddYears(-num);
        }

        return now;
    }

    private static int ExtractNumber(string text)
    {
        var numbers = new string(text.Where(char.IsDigit).ToArray());
        return int.TryParse(numbers, out var num) ? Math.Max(1, num) : 1;
    }
}
