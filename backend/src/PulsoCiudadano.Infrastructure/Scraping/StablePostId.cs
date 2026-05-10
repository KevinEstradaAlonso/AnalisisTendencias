using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace PulsoCiudadano.Infrastructure.Scraping;

internal static class StablePostId
{
    private static readonly Regex TwitterStatusRegex = new(@"/status/(?<id>\d+)", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static string ForTwitter(string? tweetUrl, string texto)
    {
        var tweetId = ExtractTwitterStatusId(tweetUrl);
        if (!string.IsNullOrWhiteSpace(tweetId))
            return $"tw_{tweetId}";

        return $"tw_{Sha256Hex($"{tweetUrl}|{Normalize(texto)}")}";
    }

    public static string ForFacebook(string pageUrl, string texto)
    {
        // Facebook público no expone un id estable sin login/permalink.
        // Usamos un hash determinístico del contenido + url origen.
        return $"fb_{Sha256Hex($"{pageUrl}|{Normalize(texto)}")}";
    }

    public static string ForGoogleMaps(string? reviewId, string placeUrl, string texto, DateTime fecha)
    {
        if (!string.IsNullOrWhiteSpace(reviewId))
            return $"gm_{Sha256Hex(reviewId)}";

        return $"gm_{Sha256Hex($"{placeUrl}|{fecha:O}|{Normalize(texto)}")}";
    }

    private static string? ExtractTwitterStatusId(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        var match = TwitterStatusRegex.Match(url);
        return match.Success ? match.Groups["id"].Value : null;
    }

    private static string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var sb = new StringBuilder(input.Length);
        var lastWasSpace = false;

        foreach (var ch in input.Trim())
        {
            var c = char.ToLowerInvariant(ch);
            if (char.IsWhiteSpace(c))
            {
                if (!lastWasSpace)
                {
                    sb.Append(' ');
                    lastWasSpace = true;
                }
                continue;
            }

            lastWasSpace = false;
            sb.Append(c);
        }

        return sb.ToString();
    }

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input ?? string.Empty));
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
            sb.Append(b.ToString("x2"));
        return sb.ToString();
    }
}
