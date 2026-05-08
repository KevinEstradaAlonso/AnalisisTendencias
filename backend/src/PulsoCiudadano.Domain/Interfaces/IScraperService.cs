using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Domain.Interfaces;

/// <summary>
/// Servicio de scraping para una fuente específica
/// </summary>
public interface IScraperService
{
    /// <summary>
    /// Tipo de fuente que scrapea (twitter, facebook, google_maps)
    /// </summary>
    string TipoFuente { get; }
    
    /// <summary>
    /// Extrae posts de una URL
    /// </summary>
    /// <param name="url">URL de la fuente a scrapear</param>
    /// <param name="municipioId">ID del municipio para el que se scrapea</param>
    /// <param name="desde">Fecha desde la cual buscar posts (opcional)</param>
    /// <returns>Lista de posts sin procesar</returns>
    Task<List<PostRaw>> ScrapearAsync(string url, string municipioId, DateTime? desde = null);
}
