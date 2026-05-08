using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Domain.Interfaces;

/// <summary>
/// Proveedor de IA para clasificación de posts
/// </summary>
public interface IAIProvider
{
    /// <summary>
    /// Nombre del proveedor (gemini, deepseek, openai)
    /// </summary>
    string Nombre { get; }
    
    /// <summary>
    /// Clasifica un texto usando IA
    /// </summary>
    /// <param name="texto">Texto del post a clasificar</param>
    /// <param name="temas">Lista de temas configurados para el municipio</param>
    /// <returns>Clasificación completa del post</returns>
    Task<ClasificacionCompleta> ClasificarAsync(string texto, List<string> temas);
}
