namespace PulsoCiudadano.Infrastructure.AI;

/// <summary>
/// Configuración para los proveedores de IA
/// </summary>
public class AISettings
{
    public string Provider { get; set; } = "gemini"; // gemini, deepseek, openai
    public required GeminiSettings Gemini { get; set; }
    public required DeepSeekSettings DeepSeek { get; set; }
    public required OpenAISettings OpenAI { get; set; }
}

public class GeminiSettings
{
    public required string ApiKey { get; set; }
    public string Model { get; set; } = "gemini-1.5-flash";
}

public class DeepSeekSettings
{
    public required string ApiKey { get; set; }
    public string Endpoint { get; set; } = "https://api.deepseek.com";
    public string Model { get; set; } = "deepseek-chat";
}

public class OpenAISettings
{
    public required string ApiKey { get; set; }
    public string Model { get; set; } = "gpt-4o-mini";
}
