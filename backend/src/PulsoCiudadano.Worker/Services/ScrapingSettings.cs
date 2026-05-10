namespace PulsoCiudadano.Worker.Services;

public class ScrapingSettings
{
    /// <summary>
    /// Intervalo entre ciclos de scraping.
    /// </summary>
    public int IntervalSeconds { get; set; } = 120;

    /// <summary>
    /// Ventana hacia atrás para buscar posts nuevos cuando no hay estado previo.
    /// En cada ciclo subsecuente, se usa desde el último ciclo (con un pequeño buffer).
    /// </summary>
    public int LookbackMinutes { get; set; } = 60;

    /// <summary>
    /// Buffer para evitar perder posts por pequeñas variaciones de reloj.
    /// </summary>
    public int BufferSeconds { get; set; } = 120;
}
