namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Configuración de un municipio
/// </summary>
public class Municipio
{
    public required string Id { get; set; }
    public required string Nombre { get; set; }
    public required List<FuenteConfig> Fuentes { get; set; }
    public required TemasConfig Temas { get; set; }
    public required AlertasConfig Alertas { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

public class FuenteConfig
{
    public required string Tipo { get; set; }
    public required string Url { get; set; }
    public bool Activa { get; set; } = true;
}

public class TemasConfig
{
    public required List<string> Globales { get; set; }
    public required List<TemaPersonalizado> Personalizados { get; set; }
}

public class TemaPersonalizado
{
    public required string Nombre { get; set; }
    public required List<string> Keywords { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
}

public class AlertasConfig
{
    public int UmbralPorcentaje { get; set; } = 30;
    public int VentanaHoras { get; set; } = 24;
}
