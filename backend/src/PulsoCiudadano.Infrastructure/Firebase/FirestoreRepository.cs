using Google.Cloud.Firestore;
using PulsoCiudadano.Domain.Enums;
using PulsoCiudadano.Domain.Interfaces;
using PulsoCiudadano.Domain.Models;

namespace PulsoCiudadano.Infrastructure.Firebase;

/// <summary>
/// Implementación de repositorio usando Firebase Firestore
/// </summary>
public class FirestoreRepository : IFirestoreRepository
{
    private readonly FirestoreDb _db;

    public FirestoreRepository(FirestoreDb db)
    {
        _db = db;
    }

    #region Municipios

    public async Task<Municipio?> GetMunicipioAsync(string municipioId)
    {
        var doc = await _db.Collection("municipios").Document(municipioId).GetSnapshotAsync();
        return doc.Exists ? ConvertToMunicipio(doc) : null;
    }

    public async Task<List<Municipio>> GetMunicipiosActivosAsync()
    {
        var snapshot = await _db.Collection("municipios")
            .WhereEqualTo("activo", true)
            .GetSnapshotAsync();

        return snapshot.Documents.Select(ConvertToMunicipio).ToList();
    }

    public async Task SaveMunicipioAsync(Municipio municipio)
    {
        var docRef = _db.Collection("municipios").Document(municipio.Id);
        await docRef.SetAsync(ConvertFromMunicipio(municipio));
    }

    #endregion

    #region Posts

    public async Task SavePostAsync(string municipioId, Post post)
    {
        var docRef = _db.Collection("municipios").Document(municipioId)
            .Collection("posts").Document(post.Id);
        
        await docRef.SetAsync(ConvertFromPost(post));
    }

    public async Task<List<Post>> GetPostsAsync(string municipioId, DateTime desde, DateTime hasta)
    {
        var snapshot = await _db.Collection("municipios").Document(municipioId)
            .Collection("posts")
            .WhereGreaterThanOrEqualTo("fecha", Timestamp.FromDateTime(desde.ToUniversalTime()))
            .WhereLessThanOrEqualTo("fecha", Timestamp.FromDateTime(hasta.ToUniversalTime()))
            .OrderByDescending("fecha")
            .GetSnapshotAsync();

        return snapshot.Documents.Select(ConvertToPost).ToList();
    }

    public async Task<List<Post>> GetPostsPorTemaAsync(string municipioId, string tema, DateTime desde, DateTime hasta)
    {
        var snapshot = await _db.Collection("municipios").Document(municipioId)
            .Collection("posts")
            .WhereArrayContains("clasificacion.temas", tema)
            .WhereGreaterThanOrEqualTo("fecha", Timestamp.FromDateTime(desde.ToUniversalTime()))
            .WhereLessThanOrEqualTo("fecha", Timestamp.FromDateTime(hasta.ToUniversalTime()))
            .GetSnapshotAsync();

        return snapshot.Documents.Select(ConvertToPost).ToList();
    }

    #endregion

    #region Tendencias

    public async Task SaveTendenciaAsync(string municipioId, Tendencia tendencia)
    {
        var docRef = _db.Collection("municipios").Document(municipioId)
            .Collection("tendencias").Document(tendencia.Id);
        
        await docRef.SetAsync(ConvertFromTendencia(tendencia));
    }

    public async Task<List<Tendencia>> GetTendenciasAsync(string municipioId, DateTime fecha)
    {
        var inicioDelDia = fecha.Date;
        var finDelDia = inicioDelDia.AddDays(1);

        var snapshot = await _db.Collection("municipios").Document(municipioId)
            .Collection("tendencias")
            .WhereGreaterThanOrEqualTo("fecha", Timestamp.FromDateTime(inicioDelDia.ToUniversalTime()))
            .WhereLessThan("fecha", Timestamp.FromDateTime(finDelDia.ToUniversalTime()))
            .GetSnapshotAsync();

        return snapshot.Documents.Select(ConvertToTendencia).ToList();
    }

    #endregion

    #region Alertas

    public async Task SaveAlertaAsync(string municipioId, Alerta alerta)
    {
        var docRef = _db.Collection("municipios").Document(municipioId)
            .Collection("alertas").Document(alerta.Id);
        
        await docRef.SetAsync(ConvertFromAlerta(alerta));
    }

    public async Task<List<Alerta>> GetAlertasActivasAsync(string municipioId)
    {
        var snapshot = await _db.Collection("municipios").Document(municipioId)
            .Collection("alertas")
            .WhereEqualTo("resuelta", false)
            .OrderByDescending("fecha_generacion")
            .GetSnapshotAsync();

        return snapshot.Documents.Select(ConvertToAlerta).ToList();
    }

    public async Task MarcarAlertaLeidaAsync(string municipioId, string alertaId)
    {
        var docRef = _db.Collection("municipios").Document(municipioId)
            .Collection("alertas").Document(alertaId);
        
        await docRef.UpdateAsync("leida", true);
    }

    public async Task ResolverAlertaAsync(string municipioId, string alertaId, string notas)
    {
        var docRef = _db.Collection("municipios").Document(municipioId)
            .Collection("alertas").Document(alertaId);
        
        await docRef.UpdateAsync(new Dictionary<string, object>
        {
            { "resuelta", true },
            { "fecha_resolucion", Timestamp.FromDateTime(DateTime.UtcNow) },
            { "notas_resolucion", notas }
        });
    }

    #endregion

    #region Usuarios

    public async Task<Usuario?> GetUsuarioAsync(string userId)
    {
        var doc = await _db.Collection("users").Document(userId).GetSnapshotAsync();
        return doc.Exists ? ConvertToUsuario(doc) : null;
    }

    public async Task SaveUsuarioAsync(Usuario usuario)
    {
        var docRef = _db.Collection("users").Document(usuario.Id);
        await docRef.SetAsync(ConvertFromUsuario(usuario));
    }

    #endregion

    #region Conversores

    private static Municipio ConvertToMunicipio(DocumentSnapshot doc)
    {
        var data = doc.ToDictionary();
        
        // Deserializar fuentes
        var fuentes = new List<FuenteConfig>();
        if (data.GetValueOrDefault("fuentes") is IEnumerable<object> fuentesArray)
        {
            foreach (var item in fuentesArray)
            {
                if (item is Dictionary<string, object> fuenteDict)
                {
                    fuentes.Add(new FuenteConfig
                    {
                        Tipo = fuenteDict.GetValueOrDefault("tipo")?.ToString() ?? "",
                        Url = fuenteDict.GetValueOrDefault("url")?.ToString() ?? "",
                        Activa = fuenteDict.GetValueOrDefault("activa") as bool? ?? true
                    });
                }
            }
        }

        // Deserializar temas
        var temasConfig = new TemasConfig { Globales = new(), Personalizados = new() };
        if (data.GetValueOrDefault("temas") is Dictionary<string, object> temasDict)
        {
            if (temasDict.GetValueOrDefault("globales") is IEnumerable<object> globales)
            {
                temasConfig.Globales = globales.Select(g => g?.ToString() ?? "").ToList();
            }
        }
        
        return new Municipio
        {
            Id = doc.Id,
            Nombre = data.GetValueOrDefault("nombre")?.ToString() ?? "",
            Activo = data.GetValueOrDefault("activo") as bool? ?? true,
            Fuentes = fuentes,
            Temas = temasConfig,
            Alertas = new AlertasConfig()
        };
    }

    private static Dictionary<string, object> ConvertFromMunicipio(Municipio m) => new()
    {
        { "nombre", m.Nombre },
        { "activo", m.Activo },
        { "fuentes", m.Fuentes.Select(f => new Dictionary<string, object>
            {
                { "tipo", f.Tipo },
                { "url", f.Url },
                { "activa", f.Activa }
            }).ToList() },
        { "temas", new Dictionary<string, object>
            {
                { "globales", m.Temas.Globales },
                { "personalizados", m.Temas.Personalizados.Select(t => new Dictionary<string, object>
                    {
                        { "nombre", t.Nombre },
                        { "keywords", t.Keywords },
                        { "activo", t.Activo }
                    }).ToList() }
            }
        },
        { "alertas", new Dictionary<string, object>
            {
                { "umbral_porcentaje", m.Alertas.UmbralPorcentaje },
                { "ventana_horas", m.Alertas.VentanaHoras }
            }
        },
        { "fecha_creacion", Timestamp.FromDateTime(m.FechaCreacion.ToUniversalTime()) }
    };

    private static Post ConvertToPost(DocumentSnapshot doc)
    {
        var data = doc.ToDictionary();
        // Implementación simplificada - expandir según necesidad
        return new Post
        {
            Id = doc.Id,
            Fuente = Enum.Parse<TipoFuente>(data.GetValueOrDefault("fuente")?.ToString() ?? "Twitter", true),
            UrlOrigen = data.GetValueOrDefault("url_origen")?.ToString() ?? "",
            Texto = data.GetValueOrDefault("texto")?.ToString() ?? "",
            Fecha = (data.GetValueOrDefault("fecha") as Timestamp?)?.ToDateTime() ?? DateTime.UtcNow,
            MunicipioId = data.GetValueOrDefault("municipio_id")?.ToString() ?? "",
            Clasificacion = new ClasificacionDetalle
            {
                Temas = new List<string>(),
                TemaPrincipal = "otro",
                Sentimiento = Sentimiento.Neutral,
                Urgencia = Urgencia.Baja,
                TipoInteraccion = TipoInteraccion.Queja,
                Tono = Tono.Neutral,
                Confianza = 0.5,
                KeywordsDetectadas = new List<string>()
            },
            Ubicacion = new UbicacionDetalle { Precision = PrecisionUbicacion.NoDetectada },
            Contexto = new ContextoDetalle
            {
                TiempoProblema = TiempoProblema.NoAplica,
                AfectacionEstimada = AfectacionEstimada.NoEspecificada,
                SolicitaAccion = false,
                MencionaAutoridad = new List<string>(),
                EvidenciaMencionada = false
            },
            Resumen = ""
        };
    }

    private static Dictionary<string, object> ConvertFromPost(Post p) => new()
    {
        { "fuente", p.Fuente.ToString().ToLower() },
        { "url_origen", p.UrlOrigen },
        { "texto", p.Texto },
        { "fecha", Timestamp.FromDateTime(p.Fecha.ToUniversalTime()) },
        { "municipio_id", p.MunicipioId },
        { "clasificacion", new Dictionary<string, object>
            {
                { "temas", p.Clasificacion.Temas },
                { "tema_principal", p.Clasificacion.TemaPrincipal },
                { "sentimiento", p.Clasificacion.Sentimiento.ToString().ToLower() },
                { "urgencia", p.Clasificacion.Urgencia.ToString().ToLower() },
                { "tipo_interaccion", p.Clasificacion.TipoInteraccion.ToString().ToLower() },
                { "tono", p.Clasificacion.Tono.ToString().ToLower() },
                { "confianza", p.Clasificacion.Confianza },
                { "keywords_detectadas", p.Clasificacion.KeywordsDetectadas }
            }
        },
        { "ubicacion", new Dictionary<string, object?>
            {
                { "colonia", p.Ubicacion.Colonia },
                { "calle", p.Ubicacion.Calle },
                { "referencia", p.Ubicacion.Referencia },
                { "precision", p.Ubicacion.Precision.ToString().ToLower() }
            }
        },
        { "contexto", new Dictionary<string, object>
            {
                { "tiempo_problema", p.Contexto.TiempoProblema.ToString().ToLower() },
                { "afectacion_estimada", p.Contexto.AfectacionEstimada.ToString().ToLower() },
                { "solicita_accion", p.Contexto.SolicitaAccion },
                { "menciona_autoridad", p.Contexto.MencionaAutoridad },
                { "evidencia_mencionada", p.Contexto.EvidenciaMencionada }
            }
        },
        { "resumen", p.Resumen },
        { "fecha_procesamiento", Timestamp.FromDateTime(p.FechaProcesamiento.ToUniversalTime()) },
        { "proveedor_ia", p.ProveedorIA ?? "" }
    };

    private static Tendencia ConvertToTendencia(DocumentSnapshot doc)
    {
        var data = doc.ToDictionary();
        return new Tendencia
        {
            Id = doc.Id,
            MunicipioId = data.GetValueOrDefault("municipio_id")?.ToString() ?? "",
            Tema = data.GetValueOrDefault("tema")?.ToString() ?? "",
            Colonia = data.GetValueOrDefault("colonia")?.ToString(),
            Fecha = (data.GetValueOrDefault("fecha") as Timestamp?)?.ToDateTime() ?? DateTime.UtcNow,
            TotalPosts = Convert.ToInt32(data.GetValueOrDefault("total_posts") ?? 0),
            PostsNegativos = Convert.ToInt32(data.GetValueOrDefault("posts_negativos") ?? 0),
            PostsPositivos = Convert.ToInt32(data.GetValueOrDefault("posts_positivos") ?? 0),
            PostsNeutrales = Convert.ToInt32(data.GetValueOrDefault("posts_neutrales") ?? 0),
            CambioPorcentaje = Convert.ToDouble(data.GetValueOrDefault("cambio_porcentaje") ?? 0),
            TonoEnojado = Convert.ToInt32(data.GetValueOrDefault("tono_enojado") ?? 0),
            TonoDesesperado = Convert.ToInt32(data.GetValueOrDefault("tono_desesperado") ?? 0),
            UrgenciaAlta = Convert.ToInt32(data.GetValueOrDefault("urgencia_alta") ?? 0),
            UrgenciaMedia = Convert.ToInt32(data.GetValueOrDefault("urgencia_media") ?? 0),
            UrgenciaBaja = Convert.ToInt32(data.GetValueOrDefault("urgencia_baja") ?? 0)
        };
    }

    private static Dictionary<string, object?> ConvertFromTendencia(Tendencia t) => new()
    {
        { "municipio_id", t.MunicipioId },
        { "tema", t.Tema },
        { "colonia", t.Colonia },
        { "fecha", Timestamp.FromDateTime(t.Fecha.ToUniversalTime()) },
        { "total_posts", t.TotalPosts },
        { "posts_negativos", t.PostsNegativos },
        { "posts_positivos", t.PostsPositivos },
        { "posts_neutrales", t.PostsNeutrales },
        { "cambio_porcentaje", t.CambioPorcentaje },
        { "tono_enojado", t.TonoEnojado },
        { "tono_desesperado", t.TonoDesesperado },
        { "urgencia_alta", t.UrgenciaAlta },
        { "urgencia_media", t.UrgenciaMedia },
        { "urgencia_baja", t.UrgenciaBaja }
    };

    private static Alerta ConvertToAlerta(DocumentSnapshot doc)
    {
        var data = doc.ToDictionary();
        return new Alerta
        {
            Id = doc.Id,
            MunicipioId = data.GetValueOrDefault("municipio_id")?.ToString() ?? "",
            Tema = data.GetValueOrDefault("tema")?.ToString() ?? "",
            Colonia = data.GetValueOrDefault("colonia")?.ToString(),
            FechaGeneracion = (data.GetValueOrDefault("fecha_generacion") as Timestamp?)?.ToDateTime() ?? DateTime.UtcNow,
            TipoAlerta = data.GetValueOrDefault("tipo_alerta")?.ToString() ?? "",
            Descripcion = data.GetValueOrDefault("descripcion")?.ToString() ?? "",
            TotalPosts = Convert.ToInt32(data.GetValueOrDefault("total_posts") ?? 0),
            CambioPorcentaje = Convert.ToDouble(data.GetValueOrDefault("cambio_porcentaje") ?? 0),
            PostsEnojados = Convert.ToInt32(data.GetValueOrDefault("posts_enojados") ?? 0),
            PostsDesesperados = Convert.ToInt32(data.GetValueOrDefault("posts_desesperados") ?? 0),
            Leida = data.GetValueOrDefault("leida") as bool? ?? false,
            Resuelta = data.GetValueOrDefault("resuelta") as bool? ?? false
        };
    }

    private static Dictionary<string, object?> ConvertFromAlerta(Alerta a) => new()
    {
        { "municipio_id", a.MunicipioId },
        { "tema", a.Tema },
        { "colonia", a.Colonia },
        { "fecha_generacion", Timestamp.FromDateTime(a.FechaGeneracion.ToUniversalTime()) },
        { "tipo_alerta", a.TipoAlerta },
        { "descripcion", a.Descripcion },
        { "total_posts", a.TotalPosts },
        { "cambio_porcentaje", a.CambioPorcentaje },
        { "posts_enojados", a.PostsEnojados },
        { "posts_desesperados", a.PostsDesesperados },
        { "leida", a.Leida },
        { "resuelta", a.Resuelta },
        { "posts_relacionados", a.PostsRelacionados }
    };

    private static Usuario ConvertToUsuario(DocumentSnapshot doc)
    {
        var data = doc.ToDictionary();
        return new Usuario
        {
            Id = doc.Id,
            Email = data.GetValueOrDefault("email")?.ToString() ?? "",
            MunicipioId = data.GetValueOrDefault("municipio_id")?.ToString() ?? "",
            Rol = Enum.Parse<RolUsuario>(data.GetValueOrDefault("rol")?.ToString() ?? "Viewer", true),
            Activo = data.GetValueOrDefault("activo") as bool? ?? true,
            FechaCreacion = (data.GetValueOrDefault("fecha_creacion") as Timestamp?)?.ToDateTime() ?? DateTime.UtcNow
        };
    }

    private static Dictionary<string, object> ConvertFromUsuario(Usuario u) => new()
    {
        { "email", u.Email },
        { "municipio_id", u.MunicipioId },
        { "rol", u.Rol.ToString().ToLower() },
        { "activo", u.Activo },
        { "fecha_creacion", Timestamp.FromDateTime(u.FechaCreacion.ToUniversalTime()) }
    };

    #endregion
}
