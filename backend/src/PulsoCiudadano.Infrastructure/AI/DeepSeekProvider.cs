using System.ClientModel;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.AI;

/// <summary>
/// Proveedor de IA usando DeepSeek (compatible con OpenAI SDK)
/// </summary>
public class DeepSeekProvider : IAIProvider
{
    private readonly ChatClient _client;
    private readonly ILogger<DeepSeekProvider> _logger;
    
    public string Nombre => "deepseek";

    public DeepSeekProvider(IOptions<AISettings> settings, ILogger<DeepSeekProvider> logger)
    {
        _logger = logger;
        var deepSeekSettings = settings.Value.DeepSeek;
        
        var options = new OpenAIClientOptions
        {
            Endpoint = new Uri(deepSeekSettings.Endpoint)
        };
        
        var credential = new ApiKeyCredential(deepSeekSettings.ApiKey);
        var openAIClient = new OpenAIClient(credential, options);
        _client = openAIClient.GetChatClient(deepSeekSettings.Model);
    }

    public async Task<ClasificacionCompleta> ClasificarAsync(string texto, List<string> temas)
    {
        _logger.LogInformation("🤖 LLAMADA A IA: Clasificando texto | Temas: {Temas} | Longitud: {Longitud}", 
            string.Join(",", temas), texto.Length);
        
        var prompt = PromptBuilder.BuildClasificacionPrompt(texto, temas);
        
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("Eres un asistente que analiza comentarios de ciudadanos mexicanos. Responde siempre en JSON válido."),
            new UserChatMessage(prompt)
        };

        var options = new ChatCompletionOptions
        {
            Temperature = 0.1f,
            MaxOutputTokenCount = 1024
        };

        var response = await _client.CompleteChatAsync(messages, options);
        var textResponse = response.Value.Content[0].Text
            ?? throw new InvalidOperationException("Respuesta vacía de DeepSeek");

        _logger.LogInformation("✅ RESPUESTA IA: OK");
        return AIResponseParser.Parse(textResponse);
    }
}
