using System.Text.Json;
using System.Text.Json.Serialization;
using PulsoCiudadano.Domain.Enums;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.AI;

/// <summary>
/// Parser para respuestas JSON de la IA
/// </summary>
public static class AIResponseParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) }
    };

    public static ClasificacionCompleta Parse(string jsonResponse)
    {
        // Limpiar respuesta (quitar markdown si viene)
        var cleanJson = jsonResponse
            .Replace("```json", "")
            .Replace("```", "")
            .Trim();

        var response = JsonSerializer.Deserialize<AIResponseDto>(cleanJson, JsonOptions)
            ?? throw new InvalidOperationException("No se pudo parsear la respuesta de la IA");

        return new ClasificacionCompleta
        {
            Clasificacion = new ClasificacionDetalle
            {
                Temas = response.Clasificacion?.Temas ?? new List<string> { "otro" },
                TemaPrincipal = response.Clasificacion?.TemaPrincipal ?? "otro",
                Sentimiento = ParseEnum(response.Clasificacion?.Sentimiento, Sentimiento.Neutral),
                Urgencia = ParseEnum(response.Clasificacion?.Urgencia, Urgencia.Baja),
                TipoInteraccion = ParseEnum(response.Clasificacion?.TipoInteraccion, TipoInteraccion.Queja),
                Tono = ParseEnum(response.Clasificacion?.Tono, Tono.Neutral),
                Confianza = response.Clasificacion?.Confianza ?? 0.5,
                KeywordsDetectadas = response.Clasificacion?.KeywordsDetectadas ?? new List<string>()
            },
            Ubicacion = new UbicacionDetalle
            {
                Colonia = response.Ubicacion?.Colonia,
                Calle = response.Ubicacion?.Calle,
                Referencia = response.Ubicacion?.Referencia,
                Precision = ParseEnum(response.Ubicacion?.Precision, PrecisionUbicacion.NoDetectada)
            },
            Contexto = new ContextoDetalle
            {
                TiempoProblema = ParseEnum(response.Contexto?.TiempoProblema, TiempoProblema.NoAplica),
                AfectacionEstimada = ParseEnum(response.Contexto?.AfectacionEstimada, AfectacionEstimada.NoEspecificada),
                SolicitaAccion = response.Contexto?.SolicitaAccion ?? false,
                MencionaAutoridad = response.Contexto?.MencionaAutoridad ?? new List<string>(),
                EvidenciaMencionada = response.Contexto?.EvidenciaMencionada ?? false
            },
            Resumen = response.Resumen ?? "Sin resumen disponible"
        };
    }

    private static TEnum ParseEnum<TEnum>(string? value, TEnum defaultValue) where TEnum : struct
    {
        if (string.IsNullOrEmpty(value))
            return defaultValue;

        // Normalizar valor
        var normalized = value
            .Replace("_", "")
            .Replace("-", "")
            .Replace(" ", "");

        if (Enum.TryParse<TEnum>(normalized, ignoreCase: true, out var result))
            return result;

        return defaultValue;
    }
}

// DTOs para deserialización
internal class AIResponseDto
{
    public ClasificacionDto? Clasificacion { get; set; }
    public UbicacionDto? Ubicacion { get; set; }
    public ContextoDto? Contexto { get; set; }
    public string? Resumen { get; set; }
}

internal class ClasificacionDto
{
    public List<string>? Temas { get; set; }
    public string? TemaPrincipal { get; set; }
    public string? Sentimiento { get; set; }
    public string? Urgencia { get; set; }
    public string? TipoInteraccion { get; set; }
    public string? Tono { get; set; }
    public double? Confianza { get; set; }
    public List<string>? KeywordsDetectadas { get; set; }
}

internal class UbicacionDto
{
    public string? Colonia { get; set; }
    public string? Calle { get; set; }
    public string? Referencia { get; set; }
    public string? Precision { get; set; }
}

internal class ContextoDto
{
    public string? TiempoProblema { get; set; }
    public string? AfectacionEstimada { get; set; }
    public bool? SolicitaAccion { get; set; }
    public List<string>? MencionaAutoridad { get; set; }
    public bool? EvidenciaMencionada { get; set; }
}
