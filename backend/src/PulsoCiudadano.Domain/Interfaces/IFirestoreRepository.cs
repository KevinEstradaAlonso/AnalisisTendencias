using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Domain.Interfaces;

/// <summary>
/// Repositorio para operaciones con Firestore
/// </summary>
public interface IFirestoreRepository
{
    // Municipios
    Task<Municipio?> GetMunicipioAsync(string municipioId);
    Task<List<Municipio>> GetMunicipiosActivosAsync();
    Task SaveMunicipioAsync(Municipio municipio);
    
    // Posts
    Task SavePostAsync(string municipioId, Post post);
    Task<List<Post>> GetPostsAsync(string municipioId, DateTime desde, DateTime hasta);
    Task<List<Post>> GetPostsPorTemaAsync(string municipioId, string tema, DateTime desde, DateTime hasta);
    
    // Tendencias
    Task SaveTendenciaAsync(string municipioId, Tendencia tendencia);
    Task<List<Tendencia>> GetTendenciasAsync(string municipioId, DateTime fecha);
    
    // Alertas
    Task SaveAlertaAsync(string municipioId, Alerta alerta);
    Task<List<Alerta>> GetAlertasActivasAsync(string municipioId);
    Task MarcarAlertaLeidaAsync(string municipioId, string alertaId);
    Task ResolverAlertaAsync(string municipioId, string alertaId, string notas);
    
    // Usuarios
    Task<Usuario?> GetUsuarioAsync(string userId);
    Task SaveUsuarioAsync(Usuario usuario);
}
