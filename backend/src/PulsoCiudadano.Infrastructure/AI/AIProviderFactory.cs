using Microsoft.Extensions.Options;
using PulsoCiudadano.Domain.Interfaces;

namespace PulsoCiudadano.Infrastructure.AI;

/// <summary>
/// Factory para seleccionar el proveedor de IA según configuración
/// </summary>
public class AIProviderFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly AISettings _settings;

    public AIProviderFactory(IServiceProvider serviceProvider, IOptions<AISettings> settings)
    {
        _serviceProvider = serviceProvider;
        _settings = settings.Value;
    }

    public IAIProvider GetProvider()
    {
        return _settings.Provider.ToLowerInvariant() switch
        {
            "gemini" => (IAIProvider)_serviceProvider.GetService(typeof(GeminiProvider))!,
            "deepseek" => (IAIProvider)_serviceProvider.GetService(typeof(DeepSeekProvider))!,
            "openai" => (IAIProvider)_serviceProvider.GetService(typeof(OpenAIProvider))!,
            _ => throw new InvalidOperationException($"Proveedor de IA no soportado: {_settings.Provider}")
        };
    }
}
