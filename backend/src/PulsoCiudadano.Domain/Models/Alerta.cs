using PulsoCiudadano.Domain.Enums;

namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Alerta generada cuando un tema supera el umbral configurado
/// </summary>
public class Alerta
{
    public required string Id { get; set; }
    public required string MunicipioId { get; set; }
    public required string Tema { get; set; }
    public string? Colonia { get; set; }
    public required DateTime FechaGeneracion { get; set; }
    
    // Motivo de la alerta
    public required string TipoAlerta { get; set; } // "umbral_superado", "riesgo_viral", "problema_cronico"
    public required string Descripcion { get; set; }
    
    // Métricas que dispararon la alerta
    public int TotalPosts { get; set; }
    public double CambioPorcentaje { get; set; }
    public int PostsEnojados { get; set; }
    public int PostsDesesperados { get; set; }
    
    // Estado
    public bool Leida { get; set; }
    public bool Resuelta { get; set; }
    public DateTime? FechaResolucion { get; set; }
    public string? NotasResolucion { get; set; }
    
    // Posts relacionados (IDs)
    public List<string> PostsRelacionados { get; set; } = new();
}
