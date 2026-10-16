<?php
// ============================================================================
// PADELBLOX: SITEMAP DINÁMICO DE ENTRENADORES Y CLUBES PÚBLICOS
// ============================================================================
header("Content-Type: application/xml; charset=UTF-8");
header("Cache-Control: public, max-age=3600"); // 1 hora de caché

echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Rutas Estáticas Principales -->
    <url>
        <loc>https://padelblox.cl/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://padelblox.cl/gestion-club-padel</loc>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://padelblox.cl/software-entrenadores-padel</loc>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://padelblox.cl/precios-planes</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>

    <?php
    // Obtener perfiles de entrenadores publicados desde la API
    $apiCoaches = "https://api.padelmanager.cl/prd/packs/get_all_packs.php";
    $resp = @file_get_contents("https://api.padelmanager.cl/prd/entrenador_publico/get_all_published.php");
    $slugs = [];
    if ($resp) {
        $json = json_decode($resp, true);
        if ($json && !empty($json['entrenadores'])) {
            foreach ($json['entrenadores'] as $c) {
                if (!empty($c['slug'])) {
                    $slugs[] = [
                        'slug' => $c['slug'],
                        'updated_at' => $c['updated_at'] ?? date('Y-m-d')
                    ];
                }
            }
        }
    }
    
    foreach ($slugs as $item): ?>
    <url>
        <loc>https://padelblox.cl/entrenador/<?= htmlspecialchars($item['slug']) ?></loc>
        <lastmod><?= date('Y-m-d', strtotime($item['updated_at'])) ?></lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <?php endforeach; ?>
</urlset>
