using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.AI;

/// <summary>
/// Proveedor de IA usando OpenAI
/// </summary>
public class OpenAIProvider : IAIProvider
{
    private readonly ChatClient _client;
    
    public string Nombre => "openai";

    public OpenAIProvider(IOptions<AISettings> settings)
    {
        var openAISettings = settings.Value.OpenAI;
        var openAIClient = new OpenAIClient(openAISettings.ApiKey);
        _client = openAIClient.GetChatClient(openAISettings.Model);
    }

    public async Task<ClasificacionCompleta> ClasificarAsync(string texto, List<string> temas)
    {
        var prompt = PromptBuilder.BuildClasificacionPrompt(texto, temas);
        
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage("Eres un asistente que analiza comentarios de ciudadanos mexicanos. Responde siempre en JSON válido sin markdown."),
            new UserChatMessage(prompt)
        };

        var options = new ChatCompletionOptions
        {
            Temperature = 0.1f,
            MaxOutputTokenCount = 1024,
            ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
        };

        var response = await _client.CompleteChatAsync(messages, options);
        var textResponse = response.Value.Content[0].Text
            ?? throw new InvalidOperationException("Respuesta vacía de OpenAI");

        return AIResponseParser.Parse(textResponse);
    }
}
