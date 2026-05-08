using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.AI;

/// <summary>
/// Construye el prompt para clasificación de posts
/// </summary>
public static class PromptBuilder
{
    public static string BuildClasificacionPrompt(string texto, List<string> temas)
    {
        var temasJoined = string.Join(", ", temas);
        
        return $@"Analiza este comentario de redes sociales de un ciudadano mexicano.
El municipio monitorea estos temas: {temasJoined}

Responde SOLO en JSON válido sin markdown ni backticks:
{{
  ""clasificacion"": {{
    ""temas"": [""tema1"", ""tema2""],
    ""tema_principal"": ""el tema más relevante"",
    ""sentimiento"": ""positivo|negativo|neutral"",
    ""urgencia"": ""alta|media|baja"",
    ""tipo_interaccion"": ""queja|sugerencia|denuncia|reconocimiento|pregunta"",
    ""tono"": ""neutral|molesto|enojado|sarcastico|desesperado"",
    ""confianza"": 0.0-1.0,
    ""keywords_detectadas"": [""palabras clave encontradas""]
  }},
  ""ubicacion"": {{
    ""colonia"": ""nombre o null"",
    ""calle"": ""nombre o null"",
    ""referencia"": ""punto de referencia o null"",
    ""precision"": ""exacta|aproximada|solo_colonia|no_detectada""
  }},
  ""contexto"": {{
    ""tiempo_problema"": ""reciente|dias|semanas|meses|recurrente|no_aplica"",
    ""afectacion_estimada"": ""individual|vecinos|colonia|ciudad|no_especificada"",
    ""solicita_accion"": true|false,
    ""menciona_autoridad"": [""autoridades mencionadas""],
    ""evidencia_mencionada"": true|false
  }},
  ""resumen"": ""resumen de máximo 100 caracteres""
}}

Reglas:
- temas: puede tener múltiples si el post menciona varios problemas, usa solo temas de la lista proporcionada o ""otro""
- urgencia alta: peligro, emergencia, muchos afectados, problema grave
- tono desesperado: indica riesgo de viralización
- confianza: qué tan seguro estás de la clasificación (0.0 a 1.0)
- Si no hay información suficiente para un campo, usa null o el valor por defecto

Comentario: ""{texto}""";
    }
}
