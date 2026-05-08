using System.Threading.Channels;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Worker.Queue;

/// <summary>
/// Cola de posts usando Channel<T> para procesamiento async
/// </summary>
public class PostChannel : IPostQueue
{
    private readonly Channel<PostRaw> _channel;

    public PostChannel()
    {
        // Canal sin límite para MVP - en producción considerar BoundedChannel
        _channel = Channel.CreateUnbounded<PostRaw>(new UnboundedChannelOptions
        {
            SingleReader = false,
            SingleWriter = false
        });
    }

    public int Count => _channel.Reader.Count;

    public async ValueTask EnqueueAsync(PostRaw post, CancellationToken cancellationToken = default)
    {
        await _channel.Writer.WriteAsync(post, cancellationToken);
    }

    public async ValueTask<PostRaw> DequeueAsync(CancellationToken cancellationToken = default)
    {
        return await _channel.Reader.ReadAsync(cancellationToken);
    }

    public IAsyncEnumerable<PostRaw> ReadAllAsync(CancellationToken cancellationToken = default)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
