using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Domain.Interfaces;

/// <summary>
/// Cola de procesamiento de posts (Channel<T>)
/// </summary>
public interface IPostQueue
{
    /// <summary>
    /// Encola un post para procesamiento
    /// </summary>
    ValueTask EnqueueAsync(PostRaw post, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Desencola un post para procesamiento
    /// </summary>
    ValueTask<PostRaw> DequeueAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Cantidad de posts en cola
    /// </summary>
    int Count { get; }
}
