using PulsoCiudadano.Domain.Enums;

namespace PulsoCiudadano.Domain.Models;

/// <summary>
/// Usuario del sistema
/// </summary>
public class Usuario
{
    public required string Id { get; set; }
    public required string Email { get; set; }
    public required string MunicipioId { get; set; }
    public required RolUsuario Rol { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
