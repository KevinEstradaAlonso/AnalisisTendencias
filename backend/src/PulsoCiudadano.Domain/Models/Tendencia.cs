namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Tendencia calculada por tema y zona
/// </summary>
public class Tendencia
{
    public required string Id { get; set; }
    public required string MunicipioId { get; set; }
    public required string Tema { get; set; }
    public string? Colonia { get; set; }
    public required DateTime Fecha { get; set; }
    
    // Métricas
    public int TotalPosts { get; set; }
    public int PostsNegativos { get; set; }
    public int PostsPositivos { get; set; }
    public int PostsNeutrales { get; set; }
    
    // Cambio respecto al periodo anterior
    public double CambioPorcentaje { get; set; }
    
    // Contadores de tono (para detectar riesgo viral)
    public int TonoEnojado { get; set; }
    public int TonoDesesperado { get; set; }
    
    // Urgencia
    public int UrgenciaAlta { get; set; }
    public int UrgenciaMedia { get; set; }
    public int UrgenciaBaja { get; set; }
}
