using System;
using System.IO;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.WatchParty.Controllers;

/// <summary>
/// Serves the Netflix-style React SPA embedded within the plugin DLL.
/// </summary>
[ApiController]
[Route("tokoshan")]
[AllowAnonymous]
public class SpaController : ControllerBase
{
    private static readonly Assembly PluginAssembly = typeof(SpaController).Assembly;

    /// <summary>
    /// Serves embedded SPA static assets or index.html entrypoint.
    /// </summary>
    /// <param name="path">The optional asset subpath.</param>
    /// <returns>File stream result or NotFound.</returns>
    [HttpGet]
    [HttpGet("{**path}")]
    public IActionResult GetSpa(string? path = null)
    {
        if (!string.IsNullOrEmpty(path) && Path.HasExtension(path))
        {
            var ext = Path.GetExtension(path).ToLowerInvariant();
            var contentType = ext switch
            {
                ".js" or ".mjs" => "application/javascript",
                ".css" => "text/css",
                ".html" => "text/html",
                ".svg" => "image/svg+xml",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                ".ico" => "image/x-icon",
                ".woff" => "font/woff",
                ".woff2" => "font/woff2",
                ".ttf" => "font/ttf",
                ".otf" => "font/otf",
                ".json" or ".map" or ".webmanifest" => "application/json",
                ".wasm" => "application/wasm",
                _ => "application/octet-stream"
            };

            // 1. Direct path lookup in embedded manifest
            var normalized = path.Replace('/', '.').Replace('\\', '.').TrimStart('.');
            var directKey = $"Jellyfin.Plugin.WatchParty.dist.{normalized}";
            var stream = PluginAssembly.GetManifestResourceStream(directKey);

            // 2. Fallback lookup by filename suffix
            if (stream == null)
            {
                var fileName = Path.GetFileName(path);
                var resourceNames = PluginAssembly.GetManifestResourceNames();
                var match = Array.Find(resourceNames, r => r.EndsWith("." + fileName, StringComparison.OrdinalIgnoreCase) || r.EndsWith(fileName, StringComparison.OrdinalIgnoreCase));
                if (match != null)
                {
                    stream = PluginAssembly.GetManifestResourceStream(match);
                }
            }

            if (stream != null)
            {
                Response.Headers.CacheControl = "public, max-age=31536000, immutable";
                return File(stream, contentType);
            }
        }

        // Return index.html for root or SPA fallback routing
        var htmlStream = PluginAssembly.GetManifestResourceStream("Jellyfin.Plugin.WatchParty.dist.index.html");
        if (htmlStream != null)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            return File(htmlStream, "text/html");
        }

        // Fallback placeholder if dist has not been embedded yet
        return Content(
            "<html><head><title>Tokoshan UI</title></head><body style='background:#111;color:#fff;font-family:sans-serif;padding:40px;'>" +
            "<h2>Tokoshan Netflix UI Plugin</h2>" +
            "<p>Plugin is running. Please compile the frontend assets with <code>npm run build</code> into the plugin dist folder.</p>" +
            "</body></html>",
            "text/html");
    }
}
