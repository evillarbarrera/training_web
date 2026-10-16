<?php
// ============================================================================
// PADELBLOX: SSR SEO LANDING PAGE PARA ENTRENADORES DE PÁDEL
// Optimizado para indexación en Google, Core Web Vitals y Schema.org JSON-LD
// ============================================================================

$slug = trim($_GET['slug'] ?? '');
if (empty($slug)) {
    header("Location: https://padelblox.cl/", true, 301);
    exit;
}

// 1. Cargar datos con caché local en archivo (10 minutos)
$cacheDir = sys_get_temp_dir() . '/padelblox_cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0777, true);
}
$cacheFile = $cacheDir . '/coach_' . md5($slug) . '.json';
$data = null;

$previewMode = isset($_GET['preview']) && $_GET['preview'] === '1';

if (file_exists($cacheFile) && !$previewMode && (time() - filemtime($cacheFile) < 600)) {
    $cached = @file_get_contents($cacheFile);
    if ($cached) {
        $data = json_decode($cached, true);
    }
}

$errorMessage = "El perfil de este entrenador no está disponible o el enlace ha cambiado.";

if (!$data) {
    $apiUrl = "https://api.padelmanager.cl/prd/entrenador_publico/get_public_profile.php?slug=" . urlencode($slug);
    if ($previewMode) {
        $apiUrl .= "&preview=1";
    }
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 5,
            'ignore_errors' => true,
            'header' => "User-Agent: PadelBlox-SSR/1.0\r\n"
        ]
    ]);
    $resp = @file_get_contents($apiUrl, false, $ctx);
    if ($resp) {
        $json = json_decode($resp, true);
        if ($json && ($json['status'] ?? '') === 'success') {
            $data = $json;
            if (!$previewMode) {
                @file_put_contents($cacheFile, $resp);
            }
        } elseif ($json && !empty($json['message'])) {
            $errorMessage = $json['message'];
        }
    }
}

if (!$data || ($data['status'] ?? '') !== 'success') {
    http_response_code(404);
    ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Perfil de Entrenador | PadelBlox</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #fff; text-align: center; padding: 80px 20px; }
            h1 { font-size: 32px; margin-bottom: 12px; }
            p { color: #94a3b8; font-size: 16px; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6; }
            .btn { display: inline-block; background: #ccff00; color: #000; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; margin: 6px; }
            .btn-outline { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.2); }
        </style>
    </head>
    <body>
        <h1>Perfil no disponible</h1>
        <p><?php echo htmlspecialchars($errorMessage); ?></p>
        <div>
            <a href="https://padelblox.cl/" class="btn">Ir a PadelBlox</a>
            <a href="https://padelblox.cl/#/perfil-publico" class="btn btn-outline">Editar mi Perfil</a>
        </div>
    </body>
    </html>
    <?php
    exit;
}

$perfil = $data['perfil'];
$coach = $data['entrenador'];
$packs = $data['packs'] ?? [];
$packsIndividuales = array_filter($packs, function($p) {
    return (($p['tipo'] ?? 'individual') === 'individual') && (empty($p['cantidad_personas']) || intval($p['cantidad_personas']) <= 1);
});
$packsMultijugador = array_filter($packs, function($p) {
    return (($p['tipo'] ?? '') === 'individual' && intval($p['cantidad_personas'] ?? 0) > 1) || in_array($p['tipo'] ?? '', ['multijugador', 'parejas']);
});
$packsGrupales = array_filter($packs, function($p) {
    return in_array($p['tipo'] ?? '', ['grupal', 'pack_grupal']);
});
$horarios = $data['horarios_disponibles'] ?? [];
$diasDisponibles = [];
$horariosPorDia = [];
$diasNombres = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
$mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
$diasCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
$mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
$hoyStr = date('Y-m-d');
$mananaStr = date('Y-m-d', strtotime('+1 day'));

foreach ($horarios as $h) {
    $f = $h['fecha'] ?? '';
    if (!$f) continue;
    $horariosPorDia[$f][] = $h;
}

foreach (array_keys($horariosPorDia) as $f) {
    $ts = strtotime($f);
    $w = intval(date('w', $ts));
    $m = intval(date('n', $ts)) - 1;
    $isHoy = ($f === $hoyStr);
    $isManana = ($f === $mananaStr);
    $diasDisponibles[] = [
        'fecha' => $f,
        'tag' => $isHoy ? 'HOY' : ($isManana ? 'MAÑANA' : $diasNombres[$w]),
        'isToday' => $isHoy,
        'isTomorrow' => $isManana,
        'diaNumero' => date('d', $ts),
        'mes' => $mesesNombres[$m],
        'header' => $diasCompletos[$w] . ' ' . date('j', $ts) . ' de ' . $mesesCompletos[$m],
        'total' => count($horariosPorDia[$f])
    ];
}
$activeDate = !empty($diasDisponibles) ? $diasDisponibles[0]['fecha'] : '';

$resenas = $data['resenas'] ?? [];
$stats = $data['estadisticas'] ?? ['promedio_rating' => 5.0, 'total_resenas' => 0];
$clubes = $data['clubes'] ?? [];
$certificados = $data['certificados'] ?? [];

$coachNombre = htmlspecialchars($coach['nombre'] ?? 'Entrenador de Pádel', ENT_QUOTES, 'UTF-8');
$rawCoachFoto = $coach['foto'] ?? '';
if (!empty($rawCoachFoto) && strpos($rawCoachFoto, 'uploads/') === 0) {
    $rawCoachFoto = 'https://api.padelmanager.cl/prd/' . $rawCoachFoto;
}
$coachFoto = !empty($rawCoachFoto) ? htmlspecialchars($rawCoachFoto, ENT_QUOTES, 'UTF-8') : 'https://padelblox.cl/assets/icons/icon-512x512.png';

$titulo = htmlspecialchars($perfil['titulo'] ?? 'Profesor de Pádel', ENT_QUOTES, 'UTF-8');
$bio = htmlspecialchars($perfil['bio'] ?? '', ENT_QUOTES, 'UTF-8');
$comuna = htmlspecialchars($coach['comuna'] ?? 'Chile', ENT_QUOTES, 'UTF-8');
$region = htmlspecialchars($coach['region'] ?? '', ENT_QUOTES, 'UTF-8');
$locationText = $comuna . ($region ? ", $region" : "");

$rawBannerUrl = $perfil['banner_url'] ?? '';
if (!empty($rawBannerUrl) && strpos($rawBannerUrl, 'uploads/') === 0) {
    $rawBannerUrl = 'https://api.padelmanager.cl/prd/' . $rawBannerUrl;
}
$bannerUrl = !empty($rawBannerUrl) ? htmlspecialchars($rawBannerUrl, ENT_QUOTES, 'UTF-8') : 'https://padelblox.cl/assets/images/padel-court-hero.jpg';

$rawFondoUrl = $perfil['fondo_url'] ?? '';
if (!empty($rawFondoUrl) && strpos($rawFondoUrl, 'uploads/') === 0) {
    $rawFondoUrl = 'https://api.padelmanager.cl/prd/' . $rawFondoUrl;
}
$fondoUrl = !empty($rawFondoUrl) ? htmlspecialchars($rawFondoUrl, ENT_QUOTES, 'UTF-8') : '';

$colorPrimary = htmlspecialchars($perfil['color_primary'] ?: '#070a12', ENT_QUOTES, 'UTF-8');
$colorAccent = htmlspecialchars($perfil['color_accent'] ?: '#ccff00', ENT_QUOTES, 'UTF-8');

$pageTitle = "$coachNombre | Clases de Pádel en $locationText | PadelBlox";
$pageDesc = mb_substr(strip_tags($perfil['bio'] ?: "Aprende y perfecciona tu pádel con $coachNombre en $locationText. Clases particulares y grupales, paquetes de entrenamiento y horarios flexibles."), 0, 160) . '...';
$canonicalUrl = "https://padelblox.cl/entrenador/" . htmlspecialchars($slug, ENT_QUOTES, 'UTF-8');
$spaAppUrl = "https://padelblox.cl/#/e/" . htmlspecialchars($slug, ENT_QUOTES, 'UTF-8');

// Schema.org JSON-LD
$schemaJson = [
    "@context" => "https://schema.org",
    "@type" => "Person",
    "name" => $coachNombre,
    "jobTitle" => "Entrenador de Pádel",
    "description" => $pageDesc,
    "image" => $coachFoto,
    "url" => $canonicalUrl,
    "address" => [
        "@type" => "PostalAddress",
        "addressLocality" => $comuna,
        "addressRegion" => $region,
        "addressCountry" => "CL"
    ]
];

if (!empty($stats['total_resenas']) && $stats['total_resenas'] > 0) {
    $schemaJson["aggregateRating"] = [
        "@type" => "AggregateRating",
        "ratingValue" => (string)$stats['promedio_rating'],
        "reviewCount" => (string)$stats['total_resenas'],
        "bestRating" => "5",
        "worstRating" => "1"
    ];
}

if (!empty($packs)) {
    $offers = [];
    foreach ($packs as $p) {
        $offers[] = [
            "@type" => "Offer",
            "name" => $p['nombre'],
            "price" => (string)$p['precio'],
            "priceCurrency" => "CLP",
            "availability" => "https://schema.org/InStock",
            "url" => "$spaAppUrl?pack=" . $p['id']
        ];
    }
    $schemaJson["makesOffer"] = $offers;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?= $pageTitle ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDesc, ENT_QUOTES, 'UTF-8') ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="<?= $canonicalUrl ?>">

    <!-- Open Graph -->
    <meta property="og:type" content="profile">
    <meta property="og:title" content="<?= $pageTitle ?>">
    <meta property="og:description" content="<?= htmlspecialchars($pageDesc, ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:image" content="<?= $coachFoto ?>">
    <meta property="og:url" content="<?= $canonicalUrl ?>">
    <meta property="og:site_name" content="PadelBlox">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= $pageTitle ?>">
    <meta name="twitter:description" content="<?= htmlspecialchars($pageDesc, ENT_QUOTES, 'UTF-8') ?>">
    <meta name="twitter:image" content="<?= $coachFoto ?>">

    <!-- JSON-LD -->
    <script type="application/ld+json">
    <?= json_encode($schemaJson, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>
    </script>

    <!-- Font & Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --bg-dark: <?= $colorPrimary ?>;
            --bg-card: #0f172a;
            --bg-card-hover: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-lime: <?= $colorAccent ?>;
            --accent-blue: #3b82f6;
            --border-card: rgba(255, 255, 255, 0.08);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg-dark);
            <?php if (!empty($fondoUrl)): ?>
            background-image: linear-gradient(rgba(7, 10, 18, 0.82), rgba(7, 10, 18, 0.94)), url('<?= $fondoUrl ?>');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            background-repeat: no-repeat;
            <?php endif; ?>
            color: var(--text-main);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }
        a { text-decoration: none; color: inherit; }

        /* Top Brand Header */
        .top-nav {
            display: flex; justify-content: space-between; align-items: center;
            max-width: 1200px; margin: 0 auto; padding: 14px 24px;
            position: sticky; top: 0; z-index: 50;
            background: rgba(7, 10, 18, 0.9);
            backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .brand-logo {
            font-size: 20px; font-weight: 900; letter-spacing: -0.6px;
            display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none;
        }
        .brand-logo-img {
            height: 32px; width: auto; object-fit: contain;
            filter: drop-shadow(0 2px 8px rgba(204, 255, 0, 0.3));
        }
        .brand-logo span { color: var(--accent-lime); }
        .nav-cta {
            background: linear-gradient(135deg, rgba(204, 255, 0, 0.2) 0%, rgba(204, 255, 0, 0.08) 100%);
            color: #fff; padding: 8px 16px; border-radius: 10px;
            font-size: 13px; font-weight: 800; transition: 0.2s; border: 1px solid rgba(204, 255, 0, 0.4);
            display: inline-flex; align-items: center; gap: 7px;
        }
        .nav-cta:hover { background: var(--accent-lime); color: #000; box-shadow: 0 4px 14px rgba(204, 255, 0, 0.35); }

        /* Hero */
        .hero-banner {
            max-width: 1200px; margin: 0 auto; padding: 16px 24px 0;
        }
        .banner-cover {
            height: 240px; border-radius: 24px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            background-size: cover; background-position: center; position: relative; overflow: hidden;
            border: 1px solid var(--border-card);
        }
        .banner-cover::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(7, 10, 18, 0.3) 0%, rgba(7, 10, 18, 0.85) 100%);
        }

        .coach-card-header {
            max-width: 1120px; margin: -70px auto 36px; padding: 0;
            background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 24px;
            box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.75);
            overflow: hidden; position: relative; z-index: 2;
        }
        .coach-header-upper {
            padding: 28px 32px; display: flex; gap: 30px; align-items: center;
        }
        @media (max-width: 768px) {
            .coach-card-header { margin-top: -80px; border-radius: 20px; }
            .coach-header-upper {
                flex-direction: column; align-items: center; text-align: center;
                padding: 22px 18px; gap: 16px;
            }
        }
        .avatar-wrap {
            width: 140px; height: 140px; border-radius: 24px; overflow: visible;
            border: 4px solid #0f172a; background: #1e293b; flex-shrink: 0;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6); position: relative;
        }
        .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; }
        .avatar-wrap .verified-avatar-badge {
            position: absolute; bottom: -6px; right: -6px; width: 34px; height: 34px;
            background: var(--accent-lime); color: #000; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; font-size: 15px;
            border: 3px solid #0f172a; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }
        .coach-meta { flex: 1; min-width: 0; }
        .coach-name { font-size: 34px; font-weight: 900; letter-spacing: -0.8px; line-height: 1.15; color: #fff; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4); margin: 0 0 6px 0; }
        .verified-badge {
            display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800;
            letter-spacing: 0.8px; text-transform: uppercase; padding: 5px 11px; border-radius: 100px;
            background: rgba(204, 255, 0, 0.15); color: var(--accent-lime); border: 1px solid rgba(204, 255, 0, 0.35); margin-bottom: 8px;
        }
        .coach-title { color: #cbd5e1; font-size: 16px; font-weight: 600; margin-top: 6px; }
        .coach-quick-info {
            display: flex; align-items: center; gap: 10px; margin-top: 14px; font-size: 13px; flex-wrap: wrap;
        }
        @media (max-width: 768px) {
            .coach-quick-info { justify-content: center; }
        }
        .coach-quick-info span {
            display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700;
            color: #f1f5f9; background: rgba(255, 255, 255, 0.06); padding: 5px 12px;
            border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .coach-quick-info i { color: var(--accent-lime); }

        .header-actions { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
        @media (max-width: 768px) {
            .header-actions { justify-content: center; }
        }
        .btn-primary {
            background: var(--accent-lime); color: #000; padding: 13px 24px; border-radius: 14px;
            font-weight: 800; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;
            transition: 0.2s; box-shadow: 0 10px 25px rgba(204, 255, 0, 0.25);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(204, 255, 0, 0.35); }
        .btn-whatsapp {
            background: #25d366; color: #fff; padding: 13px 22px; border-radius: 14px;
            font-weight: 800; font-size: 14px; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-whatsapp:hover { opacity: 0.95; transform: translateY(-2px); }

        /* Container Layout */
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px 80px; }
        .profile-grid { display: flex; flex-direction: column; gap: 32px; width: 100%; }
        .main-column { width: 100%; min-width: 0; }

        /* Lower Shelf: Información del Profesor */
        .coach-info-shelf {
            border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(10, 15, 29, 0.6);
            padding: 20px 32px 24px;
        }
        @media (max-width: 768px) {
            .coach-info-shelf { padding: 16px 18px 20px; }
        }
        .shelf-title {
            font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
            color: var(--accent-lime); margin-bottom: 14px; display: inline-flex; align-items: center; gap: 6px;
        }
        .shelf-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 18px; align-items: start;
        }
        @media (max-width: 600px) {
            .shelf-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        .shelf-item { display: flex; gap: 12px; align-items: flex-start; }
        .shelf-item i { color: var(--accent-lime); font-size: 16px; margin-top: 2px; flex-shrink: 0; }
        .si-label {
            display: block; font-size: 11px; font-weight: 800; text-transform: uppercase;
            letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 2px;
        }
        .si-val { font-size: 13.5px; color: #ffffff; font-weight: 700; }
        .si-link {
            font-size: 13px; color: var(--accent-lime); text-decoration: none; font-weight: 700;
            display: inline-flex; align-items: center; gap: 4px;
        }
        .si-link:hover { text-decoration: underline; }
        .si-clubs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
        .club-chip {
            background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border-card);
            padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #e2e8f0;
        }

        /* Profile Tabs Navigation */
        .profile-tabs-bar {
            display: flex; align-items: center; gap: 8px; margin-bottom: 24px;
            background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            padding: 6px; border-radius: 18px; border: 1px solid var(--border-card);
            overflow-x: auto; scrollbar-width: none;
        }
        .profile-tabs-bar::-webkit-scrollbar { display: none; }
        .tab-item-btn {
            flex: 1; min-width: max-content; background: transparent; border: none;
            color: var(--text-muted); font-family: inherit; font-size: 13.5px; font-weight: 800;
            padding: 12px 18px; border-radius: 13px; cursor: pointer; display: inline-flex;
            align-items: center; justify-content: center; gap: 8px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
        }
        .tab-item-btn i { font-size: 14px; color: var(--accent-lime); transition: color 0.2s; }
        .tab-badge-pill {
            font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 100px;
            background: rgba(255, 255, 255, 0.1); color: #cbd5e1; display: inline-flex; align-items: center; gap: 3px;
        }
        .tab-badge-pill.rating { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .tab-badge-pill.rating i { font-size: 10px; color: #f59e0b; }
        .tab-item-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.06); }
        .tab-item-btn.active {
            background: var(--accent-lime); color: #000; box-shadow: 0 4px 16px rgba(204, 255, 0, 0.25);
        }
        .tab-item-btn.active i { color: #000; }
        .tab-item-btn.active .tab-badge-pill { background: #000; color: #fff; }
        .tab-item-btn.active .tab-badge-pill.rating { background: #000; color: #f59e0b; }
        .tab-pane { display: none; }
        .tab-pane.active { display: block; animation: fadeInTab 0.22s ease-out; }
        @keyframes fadeInTab {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Panels */
        .card-panel {
            background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 24px;
            padding: 30px; margin-bottom: 24px;
        }
        .panel-heading {
            display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 900;
            letter-spacing: -0.5px; margin-bottom: 18px;
        }
        .panel-heading i { color: var(--accent-lime); }

        .bio-text { color: #cbd5e1; font-size: 15px; line-height: 1.7; white-space: pre-line; margin: 0; }

        /* About Coach Layout */
        .about-coach-layout {
            display: grid; grid-template-columns: 240px 1fr; gap: 28px; align-items: start; margin-top: 16px;
        }
        @media (max-width: 700px) {
            .about-coach-layout { grid-template-columns: 1fr; gap: 20px; }
        }
        .about-photo-card {
            position: relative; border-radius: 20px; overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
            background: #0a0f1d; aspect-ratio: 4 / 5;
        }
        .about-photo-img {
            width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .about-photo-overlay {
            position: absolute; bottom: 0; left: 0; right: 0;
            background: linear-gradient(180deg, transparent 0%, rgba(7, 10, 18, 0.95) 90%);
            padding: 24px 14px 14px; display: flex; flex-direction: column; gap: 3px;
        }
        .about-photo-name {
            font-size: 15px; font-weight: 900; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .about-photo-badge {
            font-size: 11px; font-weight: 800; color: var(--accent-lime); display: inline-flex; align-items: center; gap: 4px;
        }
        .about-quick-stats {
            display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;
        }
        .aqs-item {
            background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-card);
            border-radius: 12px; padding: 10px; text-align: center;
        }
        .aqs-num {
            display: block; font-size: 15px; font-weight: 900; color: var(--accent-lime);
        }
        .aqs-lbl {
            font-size: 11px; font-weight: 700; color: var(--text-muted); margin-top: 2px;
        }

        /* Chips */
        .chips-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .chip {
            background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-card);
            padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; color: #cbd5e1;
        }

        /* Pack Subtabs */
        .pack-subtabs-nav {
            display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto;
            padding-bottom: 4px; scrollbar-width: none;
        }
        .pack-subtabs-nav::-webkit-scrollbar { display: none; }
        .subtab-btn {
            background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-card);
            color: var(--text-muted); font-family: inherit; font-size: 13px; font-weight: 800;
            padding: 8px 16px; border-radius: 12px; cursor: pointer; display: inline-flex;
            align-items: center; gap: 7px; transition: all 0.2s ease; white-space: nowrap;
        }
        .subtab-btn i { font-size: 13px; }
        .subtab-count {
            font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 100px;
            background: rgba(255, 255, 255, 0.1); color: #cbd5e1;
        }
        .subtab-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
        .subtab-btn.active {
            background: rgba(204, 255, 0, 0.15); color: var(--accent-lime); border-color: rgba(204, 255, 0, 0.35);
        }
        .subtab-btn.active .subtab-count { background: var(--accent-lime); color: #000; }

        /* Packs Grid */
        .packs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .pack-card {
            background: #0a0f1d; border: 1px solid var(--border-card); border-radius: 20px;
            padding: 22px; display: flex; flex-direction: column; justify-content: space-between;
            transition: 0.2s; position: relative;
        }
        .pack-card:hover { border-color: var(--accent-lime); transform: translateY(-3px); }
        .pack-type {
            font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
            padding: 3px 8px; border-radius: 6px; background: rgba(59, 130, 246, 0.15); color: var(--accent-blue);
            width: fit-content; margin-bottom: 8px;
        }
        .pack-name { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
        .pack-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
        .pack-price { font-size: 26px; font-weight: 900; color: #fff; margin-bottom: 16px; }
        .pack-btn {
            background: #fff; color: #000; padding: 12px; border-radius: 12px; text-align: center;
            font-weight: 800; font-size: 13px; transition: 0.2s; display: block;
        }
        .pack-btn:hover { background: var(--accent-lime); }

        /* Available Slots & Interactive Calendar UX */
        .live-agenda-badge {
            display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.6px; color: var(--accent-lime);
            background: rgba(204, 255, 0, 0.08); border: 1px solid rgba(204, 255, 0, 0.25);
            padding: 5px 12px; border-radius: 100px; white-space: nowrap;
        }
        .live-pulse {
            width: 8px; height: 8px; border-radius: 50%; background: var(--accent-lime);
            box-shadow: 0 0 10px var(--accent-lime); animation: livePulseAnim 1.8s infinite;
        }
        @keyframes livePulseAnim {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.7; }
        }
        .calendar-timeline-scroll {
            display: flex; gap: 12px; overflow-x: auto; padding: 6px 4px 14px;
            scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
        .cal-day-card {
            flex: 0 0 88px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px; padding: 14px 8px 12px; display: flex; flex-direction: column;
            align-items: center; gap: 3px; cursor: pointer; transition: 0.2s ease; font-family: inherit;
            color: #fff; text-align: center;
        }
        @media (max-width: 640px) {
            .cal-day-card { flex: 0 0 76px; padding: 12px 6px 10px; border-radius: 16px; }
        }
        .cal-day-card .cdc-tag {
            font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8;
        }
        .cal-day-card .cdc-tag.highlight { color: var(--accent-lime); }
        .cal-day-card .cdc-num { font-size: 26px; font-weight: 900; line-height: 1.1; color: #fff; }
        .cal-day-card .cdc-month { font-size: 11.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .cal-day-card .cdc-badge {
            margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; font-size: 10px;
            font-weight: 800; color: #e2e8f0; background: rgba(255, 255, 255, 0.08);
            padding: 3px 8px; border-radius: 100px; white-space: nowrap;
        }
        .cal-day-card .cdc-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent-lime); }
        .cal-day-card:hover { border-color: rgba(204, 255, 0, 0.4); transform: translateY(-2px); }
        .cal-day-card.active {
            background: var(--accent-lime); border-color: var(--accent-lime); color: #070a12;
            transform: translateY(-3px); box-shadow: 0 10px 24px rgba(204, 255, 0, 0.35);
        }
        .cal-day-card.active .cdc-tag, .cal-day-card.active .cdc-num { color: #070a12; }
        .cal-day-card.active .cdc-month { color: #1e293b; }
        .cal-day-card.active .cdc-badge { background: rgba(0, 0, 0, 0.15); color: #000; }
        .cal-day-card.active .cdc-dot { background: #000; }

        .calendar-day-focus {
            background: rgba(10, 15, 29, 0.55); border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 20px; padding: 22px 24px; margin-top: 16px;
        }
        @media (max-width: 640px) {
            .calendar-day-focus { padding: 16px 14px; border-radius: 16px; }
        }
        .focus-date-header {
            margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            display: flex; align-items: center; gap: 14px;
        }
        .focus-date-header i { font-size: 26px; color: var(--accent-lime); }
        .focus-date-header h3 { font-size: 20px; font-weight: 900; color: #fff; margin: 0; text-transform: capitalize; }
        .focus-date-header .fdh-sub { font-size: 13px; font-weight: 600; color: var(--text-muted); display: block; margin-top: 2px; }

        .period-group { margin-bottom: 20px; }
        .period-title {
            display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.6px; color: #e2e8f0; margin-bottom: 12px;
        }
        .period-count {
            font-size: 11px; padding: 1px 7px; border-radius: 100px;
            background: rgba(255, 255, 255, 0.08); color: var(--accent-lime);
        }
        .period-slots-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
        }
        @media (max-width: 640px) {
            .period-slots-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        }
        .slot-tile {
            background: #0a0f1d; border: 1px solid var(--border-card); border-radius: 16px;
            padding: 16px; display: flex; flex-direction: column; justify-content: space-between;
            gap: 10px; cursor: pointer; transition: 0.2s ease; min-height: 110px;
        }
        @media (max-width: 480px) {
            .slot-tile { padding: 12px; border-radius: 14px; min-height: 95px; }
        }
        .slot-tile:hover {
            border-color: var(--accent-lime); transform: translateY(-2px);
            background: rgba(204, 255, 0, 0.03); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }
        .st-time {
            display: flex; align-items: center; gap: 7px; font-size: 17px; font-weight: 900;
            color: #fff; letter-spacing: -0.3px;
        }
        .st-time i { color: var(--accent-lime); font-size: 14px; }
        .st-club {
            font-size: 11.5px; font-weight: 600; color: #94a3b8; display: flex;
            align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .st-club i { color: var(--accent-lime); font-size: 10px; }
        .btn-tile-book {
            border: none; font-family: inherit; font-size: 11.5px; font-weight: 800;
            padding: 6px 10px; border-radius: 8px; background: rgba(204, 255, 0, 0.12);
            color: var(--accent-lime); display: inline-flex; align-items: center; justify-content: center;
            gap: 5px; cursor: pointer; transition: 0.2s; width: 100%; margin-top: 2px;
        }
        .slot-tile:hover .btn-tile-book { background: var(--accent-lime); color: #000; }

        /* Calendar Booking Banner */
        .calendar-booking-banner {
            position: relative; margin-top: 32px;
            background: linear-gradient(135deg, rgba(204, 255, 0, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%);
            border: 1px solid rgba(204, 255, 0, 0.3); border-radius: 22px; padding: 26px 30px;
            overflow: hidden; box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.6);
        }
        @media (max-width: 768px) {
            .calendar-booking-banner { padding: 20px 18px; border-radius: 18px; margin-top: 24px; }
        }
        .cbb-glow {
            position: absolute; top: -40%; right: -10%; width: 320px; height: 320px;
            background: radial-gradient(circle, rgba(204, 255, 0, 0.12) 0%, transparent 70%); pointer-events: none;
        }
        .cbb-inner {
            position: relative; z-index: 1; display: flex; align-items: center;
            justify-content: space-between; gap: 24px; flex-wrap: wrap;
        }
        @media (max-width: 860px) {
            .cbb-inner { flex-direction: column; align-items: stretch; gap: 18px; }
        }
        .cbb-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 260px; }
        .cbb-icon-box {
            width: 52px; height: 52px; border-radius: 16px; background: rgba(204, 255, 0, 0.15);
            border: 1px solid rgba(204, 255, 0, 0.35); color: var(--accent-lime);
            display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
        }
        .cbb-text h4 { margin: 0 0 4px; font-size: 16.5px; font-weight: 800; color: #fff; }
        .cbb-text p { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.4; }
        .cbb-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 860px) {
            .cbb-actions { width: 100%; flex-direction: column; gap: 10px; }
        }
        .btn-calendar-primary {
            border: none; font-family: inherit; font-size: 14px; font-weight: 800;
            padding: 14px 26px; border-radius: 14px; cursor: pointer; display: inline-flex;
            align-items: center; justify-content: center; gap: 9px; background: var(--accent-lime);
            color: #070a12; box-shadow: 0 8px 24px rgba(204, 255, 0, 0.35); transition: 0.2s;
            text-decoration: none; white-space: nowrap;
        }
        .btn-calendar-primary:hover {
            transform: translateY(-2px); box-shadow: 0 14px 30px rgba(204, 255, 0, 0.45); background: #bbf000; color: #000;
        }
        .btn-calendar-wsp {
            border: 1px solid rgba(37, 211, 102, 0.4); font-family: inherit; font-size: 13.5px;
            font-weight: 800; padding: 13px 22px; border-radius: 14px; cursor: pointer;
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            background: rgba(37, 211, 102, 0.12); color: #4ade80; transition: 0.2s; text-decoration: none;
            white-space: nowrap;
        }
        .btn-calendar-wsp:hover {
            background: #25d366; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);
        }
        @media (max-width: 860px) {
            .btn-calendar-primary, .btn-calendar-wsp { width: 100%; }
        }

        /* Reviews */
        .reviews-summary {
            display: flex; align-items: center; gap: 24px; padding: 20px; background: rgba(255, 255, 255, 0.02);
            border-radius: 16px; margin-bottom: 20px;
        }
        .rating-number { font-size: 48px; font-weight: 900; color: var(--accent-lime); line-height: 1; }
        .stars { color: #f59e0b; font-size: 16px; margin-bottom: 4px; }
        .review-card {
            padding: 18px 0; border-bottom: 1px solid var(--border-card);
        }
        .review-card:last-child { border-bottom: none; }
        .reviewer-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .reviewer-avatar {
            width: 36px; height: 36px; border-radius: 50%; background: #1e293b; overflow: hidden;
        }
        .reviewer-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .reviewer-name { font-weight: 700; font-size: 14px; }
        .review-date { font-size: 12px; color: var(--text-muted); margin-left: auto; }
        .coach-reply {
            margin-top: 12px; margin-left: 20px; padding: 12px 16px; background: rgba(204, 255, 0, 0.05);
            border-left: 3px solid var(--accent-lime); border-radius: 8px; font-size: 13px;
        }

        /* Sidebar Info */
        .info-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .info-row i { color: var(--accent-lime); font-size: 18px; margin-top: 2px; }
        .info-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
        .info-val { font-size: 14px; font-weight: 600; color: #fff; margin-top: 2px; }

        html, body {
            overflow-x: hidden;
            width: 100%;
            max-width: 100vw;
        }

        @media (max-width: 900px) {
            .profile-grid { grid-template-columns: 1fr; gap: 20px; }
            .sidebar { position: static; margin-top: 10px; }
        }

        @media (max-width: 768px) {
            .top-nav { padding: 12px 16px; }
            .hero-banner { padding: 12px 14px 0; }
            .banner-cover { height: 160px; border-radius: 18px; }
            .coach-card-header {
                flex-direction: column;
                align-items: center;
                text-align: center;
                margin: -50px 14px 24px;
                padding: 22px 18px;
                gap: 16px;
                border-radius: 20px;
            }
            .avatar-wrap {
                width: 110px;
                height: 110px;
                border-radius: 22px;
            }
            .coach-name { font-size: 26px; }
            .coach-quick-info { justify-content: center; }
            .header-actions { justify-content: center; }
            .container { padding: 0 14px 50px; }
            .card-panel { padding: 20px 16px; border-radius: 20px; margin-bottom: 20px; }
            .profile-tabs-bar { padding: 5px; gap: 6px; -webkit-overflow-scrolling: touch; }
            .tab-item-btn { padding: 10px 14px; font-size: 12.5px; }
            .about-coach-layout { grid-template-columns: 1fr; gap: 18px; }
            .about-photo-card { max-width: 220px; margin: 0 auto; width: 100%; }
        }

        @media (max-width: 650px) {
            .header-actions {
                flex-direction: column;
                width: 100%;
                gap: 8px;
            }
            .btn-primary, .btn-whatsapp {
                width: 100%;
                justify-content: center;
                padding: 12px 16px;
                font-size: 13.5px;
            }
            .packs-grid { grid-template-columns: 1fr; gap: 12px; }
            .pack-card { padding: 16px 14px; border-radius: 16px; }
            .pack-btn { width: 100%; padding: 12px; }
            .reviews-summary {
                flex-direction: column;
                text-align: center;
                gap: 12px;
                padding: 16px 12px;
            }
            .rating-number { font-size: 38px; }
            .slots-list {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                max-height: 340px;
            }
        }

        @media (max-width: 480px) {
            .top-nav { padding: 10px 12px; }
            .brand-logo { font-size: 17px; }
            .brand-logo-img { height: 26px; }
            .nav-cta { padding: 6px 10px; font-size: 11.5px; border-radius: 8px; }
            .hero-banner { padding: 10px 10px 0; }
            .banner-cover { height: 130px; border-radius: 14px; }
            .coach-card-header {
                margin: -38px 10px 18px;
                padding: 18px 12px;
                gap: 12px;
                border-radius: 16px;
            }
            .avatar-wrap {
                width: 88px;
                height: 88px;
                border-radius: 18px;
                border-width: 3px;
            }
            .avatar-wrap .verified-avatar-badge {
                width: 26px;
                height: 26px;
                font-size: 11px;
                bottom: -4px;
                right: -4px;
            }
            .coach-name {
                font-size: 21px;
                letter-spacing: -0.5px;
                word-break: break-word;
            }
            .coach-title { font-size: 13.5px; }
            .coach-quick-info { gap: 6px; }
            .coach-quick-info span { font-size: 11.5px; padding: 4px 8px; }
            .container { padding: 0 10px 40px; }
            .card-panel { padding: 15px 12px; border-radius: 16px; margin-bottom: 16px; }
            .panel-heading { font-size: 17px; margin-bottom: 12px; }
            .tab-item-btn { padding: 8px 10px; font-size: 11.5px; gap: 5px; }
            .tab-item-btn i { font-size: 12px; }
            .tab-badge-pill { font-size: 10px; padding: 1px 5px; }
            .bio-text { font-size: 14px; line-height: 1.6; }
        }

        @media (max-width: 360px) {
            .slots-list {
                grid-template-columns: 1fr;
            }
            .coach-name { font-size: 19px; }
            .tab-item-btn { font-size: 11px; padding: 7px 8px; }
        }

        /* Mobile App Sheet */
        .app-booking-overlay {
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(7, 10, 18, 0.82);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            display: none; align-items: flex-end; justify-content: center;
        }
        .app-booking-overlay.active { display: flex; animation: fadeInOverlay 0.2s ease-out; }
        @media (min-width: 601px) {
            .app-booking-overlay { align-items: center; padding: 20px; }
        }
        .app-booking-sheet {
            background: #0f172a; border: 1px solid rgba(204, 255, 0, 0.25);
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.85); width: 100%; max-width: 480px;
            border-radius: 28px 28px 0 0; padding: 28px 24px 32px; position: relative;
            animation: slideUpSheet 0.26s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (min-width: 601px) {
            .app-booking-sheet { border-radius: 28px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85); padding: 32px 28px; }
        }
        .sheet-close-btn {
            position: absolute; top: 16px; right: 18px; background: rgba(255, 255, 255, 0.08);
            border: none; color: #94a3b8; width: 32px; height: 32px; border-radius: 50%;
            font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: 0.2s;
        }
        .sheet-close-btn:hover { background: rgba(255, 255, 255, 0.16); color: #fff; }
        .abs-header { text-align: center; margin-bottom: 20px; }
        .abs-app-icon {
            width: 58px; height: 58px; margin: 0 auto 12px;
            background: radial-gradient(circle, rgba(204, 255, 0, 0.18) 0%, rgba(15, 23, 42, 0.8) 70%);
            border: 1px solid rgba(204, 255, 0, 0.35); border-radius: 18px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 8px 24px rgba(204, 255, 0, 0.18);
        }
        .abs-app-icon img { width: 38px; height: auto; object-fit: contain; }
        .abs-tag {
            font-size: 10.5px; font-weight: 900; letter-spacing: 0.8px; color: var(--accent-lime);
            text-transform: uppercase; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 5px;
        }
        .abs-title { margin: 0 0 6px; font-size: 21px; font-weight: 900; color: #fff; letter-spacing: -0.4px; }
        .abs-subtitle { margin: 0 auto; font-size: 13px; color: #94a3b8; line-height: 1.5; max-width: 380px; }
        .abs-target-pill {
            background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .atp-icon {
            width: 36px; height: 36px; border-radius: 10px; background: rgba(204, 255, 0, 0.12);
            color: var(--accent-lime); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;
        }
        .atp-title { display: block; font-size: 14px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .atp-sub { display: block; font-size: 11.5px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .abs-actions { display: flex; flex-direction: column; gap: 10px; }
        .btn-sheet-primary, .btn-sheet-store, .btn-sheet-web {
            font-family: inherit; border-radius: 14px; padding: 13px 18px; font-weight: 800; font-size: 13.5px;
            display: flex; align-items: center; justify-content: center; gap: 9px; text-decoration: none;
            cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; width: 100%;
        }
        .btn-sheet-primary {
            background: var(--accent-lime); color: #000; border: none;
            box-shadow: 0 6px 20px rgba(204, 255, 0, 0.35);
        }
        .btn-sheet-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(204, 255, 0, 0.45); }
        .btn-sheet-store {
            background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.16);
        }
        .btn-sheet-store:hover { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.28); }
        .btn-sheet-web {
            background: transparent; color: #94a3b8; border: 1px dashed rgba(255, 255, 255, 0.14);
            font-size: 12.5px; margin-top: 4px;
        }
        .btn-sheet-web:hover { color: #fff; background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.24); }
        .abs-opening-status {
            display: none; align-items: center; gap: 10px; background: rgba(204, 255, 0, 0.08);
            border: 1px solid rgba(204, 255, 0, 0.2); border-radius: 12px; padding: 10px 14px;
            font-size: 12px; color: #e2e8f0; line-height: 1.4;
        }
        .abs-opening-status.active { display: flex; }
        .pulse-indicator {
            width: 10px; height: 10px; border-radius: 50%; background: var(--accent-lime);
            box-shadow: 0 0 10px var(--accent-lime); animation: pulseLime 1s infinite alternate; flex-shrink: 0;
        }
        .abs-footer-note {
            margin-top: 18px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b;
            display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .abs-footer-note i { color: var(--accent-lime); font-size: 12px; }
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpSheet { from { transform: translateY(100%); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseLime { from { opacity: 0.4; transform: scale(0.9); } to { opacity: 1; transform: scale(1.15); } }

        /* Diplomas y Certificaciones Verificadas */
        .certs-public-block {
            margin-top: 36px; padding-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .cpb-header { margin-bottom: 20px; }
        .cpb-badge {
            display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.8px; color: #10b981; background: rgba(16, 185, 129, 0.12);
            padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .cpb-title { font-size: 20px; font-weight: 900; color: #ffffff; margin: 0 0 6px; }
        .cpb-desc { font-size: 13.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }
        .certs-public-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px;
        }
        @media (max-width: 480px) {
            .certs-public-grid { grid-template-columns: 1fr; }
        }
        .cert-public-card {
            background: rgba(15, 23, 42, 0.7); border: 1.5px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px; overflow: hidden; cursor: pointer; transition: all 0.25s ease;
            backdrop-filter: blur(8px); display: flex; flex-direction: column;
        }
        .cert-public-card:hover {
            transform: translateY(-4px); border-color: rgba(204, 255, 0, 0.4);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4), 0 0 15px rgba(204, 255, 0, 0.1);
        }
        .cert-public-card:hover .cpc-media img { transform: scale(1.05); }
        .cert-public-card:hover .cpc-overlay-hover { opacity: 1; }
        .cert-public-card:hover .coh-pill { transform: scale(1); }
        .cert-public-card:hover .cpc-name { color: var(--accent-lime); }
        .cpc-media {
            position: relative; height: 170px; background: #070a12; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
        }
        .cpc-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s ease; }
        .cpc-pdf-view { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #ef4444; }
        .pdf-icon-ring {
            width: 52px; height: 52px; border-radius: 50%; background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; font-size: 24px;
        }
        .pdf-lbl {
            font-size: 11px; font-weight: 800; letter-spacing: 0.6px; color: #f1f5f9;
            background: rgba(239, 68, 68, 0.25); padding: 3px 8px; border-radius: 6px;
        }
        .cpc-overlay-hover {
            position: absolute; inset: 0; background: rgba(7, 10, 18, 0.65);
            display: flex; align-items: center; justify-content: center; opacity: 0;
            transition: opacity 0.2s ease; backdrop-filter: blur(2px);
        }
        .coh-pill {
            display: inline-flex; align-items: center; gap: 8px; background: var(--accent-lime);
            color: #000; font-size: 12px; font-weight: 900; padding: 8px 16px; border-radius: 999px;
            transform: scale(0.9); transition: transform 0.2s ease; box-shadow: 0 4px 14px rgba(204, 255, 0, 0.4);
        }
        .cpc-type-tag {
            position: absolute; top: 10px; right: 10px; background: rgba(10, 15, 29, 0.85);
            color: #fff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.12); display: flex; align-items: center; gap: 4px;
        }
        .cpc-meta { padding: 16px; flex: 1; display: flex; flex-direction: column; }
        .cpc-name {
            margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #ffffff;
            line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
            transition: color 0.2s;
        }
        .cpc-issuer {
            font-size: 12px; color: var(--text-muted); font-weight: 600;
            display: flex; align-items: center; gap: 6px; margin-bottom: 12px;
        }
        .cpc-issuer i { color: var(--accent-lime); font-size: 11px; }
        .cpc-footer-row { margin-top: auto; display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
        .cpc-status {
            color: #10b981; font-weight: 800; display: flex; align-items: center; gap: 4px;
            background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 6px;
        }
        .cpc-action-hint { color: var(--accent-lime); font-weight: 700; display: flex; align-items: center; gap: 4px; }

        /* Lightbox Modal */
        .cert-lightbox-modal {
            position: fixed; inset: 0; z-index: 99999; background: rgba(3, 7, 18, 0.88);
            backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px;
            animation: fadeInOverlay 0.2s ease;
        }
        @media (max-width: 600px) { .cert-lightbox-modal { padding: 10px; } }
        .clm-dialog {
            width: 100%; max-width: 820px; max-height: 92vh; background: #0f172a;
            border: 1.5px solid rgba(255, 255, 255, 0.15); border-radius: 24px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column; overflow: hidden;
        }
        @media (max-width: 600px) { .clm-dialog { border-radius: 18px; max-height: 96vh; } }
        .clm-header {
            padding: 18px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: #131d35;
        }
        @media (max-width: 600px) { .clm-header { padding: 14px 16px; } }
        .clm-tag {
            display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px;
            font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 4px;
        }
        .clm-title { margin: 0 0 4px; font-size: 18px; font-weight: 900; color: #ffffff; line-height: 1.3; }
        @media (max-width: 600px) { .clm-title { font-size: 15px; } }
        .clm-inst { margin: 0; font-size: 12.5px; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
        .clm-inst i { color: var(--accent-lime); font-size: 12px; }
        .btn-close-modal {
            width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.08);
            border: none; color: #fff; cursor: pointer; display: flex; align-items: center;
            justify-content: center; font-size: 16px; transition: all 0.2s; flex-shrink: 0;
        }
        .btn-close-modal:hover { background: #ef4444; transform: scale(1.08); }
        .clm-body {
            padding: 20px; overflow-y: auto; flex: 1; background: #070a12;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        @media (max-width: 600px) { .clm-body { padding: 12px; } }
        .clm-image-container { width: 100%; display: flex; align-items: center; justify-content: center; }
        .clm-img { max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); }
        .clm-pdf-container { width: 100%; display: flex; flex-direction: column; gap: 14px; }
        .clm-pdf-frame { width: 100%; height: 52vh; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; background: #ffffff; }
        .clm-pdf-fallback {
            background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
        }
        .clm-pdf-fallback i { font-size: 24px; color: #ef4444; }
        .btn-open-pdf-direct {
            display: inline-flex; align-items: center; gap: 8px; background: #ef4444; color: #ffffff;
            text-decoration: none; font-size: 12.5px; font-weight: 800; padding: 10px 18px; border-radius: 10px; transition: all 0.2s;
        }
        .btn-open-pdf-direct:hover { background: #dc2626; transform: translateY(-1px); }
        .clm-footer {
            padding: 16px 24px; border-top: 1px solid rgba(255, 255, 255, 0.08);
            background: #131d35; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
        }
        @media (max-width: 600px) { .clm-footer { padding: 12px 16px; } }
        .btn-download-cert {
            display: inline-flex; align-items: center; gap: 8px; background: var(--accent-lime);
            color: #000000; text-decoration: none; font-size: 13px; font-weight: 900;
            padding: 10px 20px; border-radius: 10px; transition: all 0.2s;
        }
        .btn-download-cert:hover { background: #b8e600; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(204, 255, 0, 0.35); }
        .btn-close-cert {
            background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ffffff; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
        }
        .btn-close-cert:hover { background: rgba(255, 255, 255, 0.16); }
    </style>
</head>
<body>

    <!-- Top Nav -->
    <header class="top-nav">
        <a href="https://padelblox.cl/" class="brand-logo" title="Ir a PadelBlox">
            <img src="https://padelblox.cl/assets/images/logo-transparent.png" alt="PadelBlox Logo" class="brand-logo-img">
            <span>Padel<span>Blox</span></span>
        </a>
        <a href="<?= $spaAppUrl ?>" class="nav-cta">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir en App
        </a>
    </header>

    <!-- Banner & Header -->
    <section class="hero-banner">
        <div class="banner-cover" style="background-image: url('<?= $bannerUrl ?>');"></div>
    </section>

    <div class="coach-card-header">
        <div class="coach-header-upper">
            <div class="avatar-wrap">
                <img src="<?= $coachFoto ?>" alt="<?= $coachNombre ?>">
                <div class="verified-avatar-badge" title="Entrenador Verificado PadelBlox">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
            <div class="coach-meta">
                <h1 class="coach-name"><?= $coachNombre ?></h1>
                <div class="verified-badge"><i class="fa-solid fa-circle-check"></i> Entrenador Verificado PadelBlox</div>
                <p class="coach-title"><?= $titulo ?></p>
                <div class="header-actions">
                    <a href="#tabs-anchor" class="btn-primary" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, null, 'Clase con <?= addslashes(htmlspecialchars($coachNombre)) ?>');">
                        <i class="fa-solid fa-calendar-check"></i> Reservar Clase / Pack
                    </a>
                    <?php if (!empty($perfil['whatsapp'])): ?>
                        <?php 
                            $cleanWsp = preg_replace('/[^0-9]/', '', $perfil['whatsapp']);
                            $wspMsg = urlencode("Hola $coachNombre, te contacto a través de tu perfil público en PadelBlox para consultar por tus clases de pádel.");
                        ?>
                        <a href="https://wa.me/<?= $cleanWsp ?>?text=<?= $wspMsg ?>" target="_blank" rel="noopener" class="btn-whatsapp">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <?php if ($locationText || !empty($clubes) || $perfil['anios_experiencia'] || !empty($perfil['instagram']) || !empty($perfil['google_business_url']) || !empty($perfil['certificaciones'])): ?>
        <div class="coach-info-shelf">
            <div class="shelf-title">
                <i class="fa-solid fa-id-card"></i> Información del Profesor
            </div>
            <div class="shelf-grid">
                <?php if ($locationText): ?>
                <div class="shelf-item">
                    <i class="fa-solid fa-map-pin"></i>
                    <div>
                        <span class="si-label">Zona de Entrenamiento</span>
                        <div class="si-val"><?= $locationText ?></div>
                    </div>
                </div>
                <?php endif; ?>

                <?php if (!empty($clubes)): ?>
                <div class="shelf-item">
                    <i class="fa-solid fa-building"></i>
                    <div>
                        <span class="si-label">Clubes Asociados</span>
                        <div class="si-clubs">
                            <?php foreach ($clubes as $c): ?>
                                <span class="club-chip"><?= htmlspecialchars($c['nombre']) ?></span>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <?php if ($perfil['anios_experiencia']): ?>
                <div class="shelf-item">
                    <i class="fa-solid fa-award"></i>
                    <div>
                        <span class="si-label">Experiencia</span>
                        <div class="si-val"><?= $perfil['anios_experiencia'] ?> años formando jugadores</div>
                    </div>
                </div>
                <?php endif; ?>

                <?php if (!empty($perfil['instagram'])): ?>
                <div class="shelf-item">
                    <i class="fa-brands fa-instagram"></i>
                    <div>
                        <span class="si-label">Instagram</span>
                        <a class="si-link" href="https://instagram.com/<?= ltrim(htmlspecialchars($perfil['instagram']), '@') ?>" target="_blank" rel="noopener">
                            @<?= ltrim(htmlspecialchars($perfil['instagram']), '@') ?> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i>
                        </a>
                    </div>
                </div>
                <?php endif; ?>

                <?php if (!empty($perfil['google_business_url'])): ?>
                <div class="shelf-item">
                    <i class="fa-brands fa-google"></i>
                    <div>
                        <span class="si-label">Google Maps</span>
                        <a class="si-link" href="<?= htmlspecialchars($perfil['google_business_url']) ?>" target="_blank" rel="noopener">
                            Ver Ubicación <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i>
                        </a>
                    </div>
                </div>
                <?php endif; ?>

                <?php if (!empty($perfil['certificaciones'])): ?>
                <div class="shelf-item">
                    <i class="fa-solid fa-graduation-cap"></i>
                    <div>
                        <span class="si-label">Certificaciones</span>
                        <div class="si-val"><?= htmlspecialchars($perfil['certificaciones']) ?></div>
                    </div>
                </div>
                <?php endif; ?>

                <?php if (!empty($certificados)): ?>
                <div class="shelf-item shelf-clickable" onclick="switchCoachTab('sobre-mi'); document.getElementById('certs-gallery')?.scrollIntoView({behavior:'smooth'});" style="cursor: pointer; padding: 8px 12px; border-radius: 12px; background: rgba(16, 185, 129, 0.08); border: 1px dashed rgba(16, 185, 129, 0.4);">
                    <i class="fa-solid fa-file-shield" style="color: #10b981;"></i>
                    <div>
                        <span class="si-label">Diplomas Oficiales</span>
                        <div class="si-val" style="color: #ccff00;"><?= count($certificados) ?> <?= count($certificados) === 1 ? 'Título Verificado' : 'Títulos Verificados' ?> &rarr;</div>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Main Content -->
    <main class="container" id="tabs-anchor">
        <div class="profile-grid">
            
            <!-- Columna Principal -->
            <div class="main-column">
                
                <!-- Navigation Tabs Bar -->
                <nav class="profile-tabs-bar" role="tablist">
                    <button type="button" class="tab-item-btn active" onclick="switchCoachTab('sobre-mi', this)">
                        <i class="fa-solid fa-user"></i> <span>Sobre Mí</span>
                    </button>
                    <?php if ($perfil['mostrar_packs'] && !empty($packs)): ?>
                    <button type="button" class="tab-item-btn" onclick="switchCoachTab('packs', this)">
                        <i class="fa-solid fa-box-archive"></i> <span>Packs & Precios</span>
                        <span class="tab-badge-pill"><?= count($packs) ?></span>
                    </button>
                    <?php endif; ?>
                    <?php if ($perfil['mostrar_horarios'] && !empty($horarios)): ?>
                    <button type="button" class="tab-item-btn" onclick="switchCoachTab('horarios', this)">
                        <i class="fa-solid fa-calendar-check"></i> <span>Horarios</span>
                        <span class="tab-badge-pill"><?= count($horarios) ?></span>
                    </button>
                    <?php endif; ?>
                    <?php if ($perfil['mostrar_resenas']): ?>
                    <button type="button" class="tab-item-btn" onclick="switchCoachTab('resenas', this)">
                        <i class="fa-solid fa-star"></i> <span>Reseñas</span>
                        <?php if (!empty($stats['total_resenas'])): ?>
                            <span class="tab-badge-pill rating"><i class="fa-solid fa-star"></i> <?= $stats['promedio_rating'] ?></span>
                        <?php endif; ?>
                    </button>
                    <?php endif; ?>
                </nav>

                <!-- TAB 1: Biografía -->
                <div id="tab-pane-sobre-mi" class="tab-pane active">
                    <section class="card-panel">
                        <h2 class="panel-heading"><i class="fa-solid fa-user"></i> Sobre Mí</h2>
                        
                        <div class="about-coach-layout">
                            <!-- Columna Foto del Profesor -->
                            <div class="about-coach-photo-col">
                                <div class="about-photo-card">
                                    <img src="<?= $coachFoto ?>" alt="<?= $coachNombre ?>" class="about-photo-img">
                                    <div class="about-photo-overlay">
                                        <span class="about-photo-name"><?= $coachNombre ?></span>
                                        <span class="about-photo-badge"><i class="fa-solid fa-certificate"></i> Entrenador Verificado</span>
                                    </div>
                                </div>

                                <?php if (!empty($perfil['anios_experiencia']) || !empty($stats['total_resenas'])): ?>
                                    <div class="about-quick-stats">
                                        <?php if (!empty($perfil['anios_experiencia'])): ?>
                                            <div class="aqs-item">
                                                <span class="aqs-num"><?= $perfil['anios_experiencia'] ?>+</span>
                                                <span class="aqs-lbl">Años Exp.</span>
                                            </div>
                                        <?php endif; ?>
                                        <?php if (!empty($stats['total_resenas'])): ?>
                                            <div class="aqs-item">
                                                <span class="aqs-num">⭐ <?= $stats['promedio_rating'] ?></span>
                                                <span class="aqs-lbl"><?= $stats['total_resenas'] ?> <?= $stats['total_resenas'] === 1 ? 'Reseña' : 'Reseñas' ?></span>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                <?php endif; ?>
                            </div>

                            <!-- Columna Texto y Especialidades -->
                            <div class="about-coach-text-col">
                                <p class="bio-text"><?= nl2br($bio) ?></p>

                                <?php if (!empty($perfil['especialidades'])): ?>
                                    <div style="margin-top: 20px;">
                                        <span style="font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Especialidades Técnicas y Tácticas</span>
                                        <div class="chips-wrap">
                                            <?php foreach ($perfil['especialidades'] as $esp): ?>
                                                <span class="chip"><i class="fa-solid fa-check" style="color: var(--accent-lime); margin-right: 4px;"></i> <?= htmlspecialchars($esp) ?></span>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php endif; ?>

                                <?php if (!empty($perfil['niveles'])): ?>
                                    <div style="margin-top: 16px;">
                                        <span style="font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Niveles Impartidos</span>
                                        <div class="chips-wrap">
                                            <?php foreach ($perfil['niveles'] as $niv): ?>
                                                <span class="chip"><?= htmlspecialchars($niv) ?></span>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php endif; ?>

                                <?php if (!empty($perfil['certificaciones'])): ?>
                                    <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">
                                        <span style="font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Certificaciones</span>
                                        <p style="margin-top: 8px; color: #fff; font-size: 14px;"><i class="fa-solid fa-graduation-cap" style="color: var(--accent-lime); margin-right: 6px;"></i> <?= htmlspecialchars($perfil['certificaciones']) ?></p>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <?php if (!empty($certificados)): ?>
                        <!-- Diplomas y Certificaciones Verificadas -->
                        <div class="certs-public-block" id="certs-gallery">
                            <div class="cpb-header">
                                <span class="cpb-badge"><i class="fa-solid fa-shield-check"></i> Acreditación Oficial</span>
                                <h3 class="cpb-title">Diplomas y Certificaciones (<?= count($certificados) ?>)</h3>
                                <p class="cpb-desc">Documentos presentados por el entrenador que acreditan su formación técnica y pedagógica. Haz clic para ver en alta resolución.</p>
                            </div>

                            <div class="certs-public-grid">
                                <?php foreach ($certificados as $cert): ?>
                                    <?php 
                                        $certUrl = htmlspecialchars($cert['archivo_url'], ENT_QUOTES, 'UTF-8');
                                        $certTitulo = htmlspecialchars($cert['titulo'], ENT_QUOTES, 'UTF-8');
                                        $certInst = htmlspecialchars($cert['institucion'] ?? '', ENT_QUOTES, 'UTF-8');
                                        $tipo = $cert['tipo_archivo'] ?? 'image';
                                    ?>
                                    <div class="cert-public-card" onclick="openCertModal('<?= $certUrl ?>', '<?= $certTitulo ?>', '<?= $certInst ?>', '<?= $tipo ?>')">
                                        <div class="cpc-media">
                                            <?php if ($tipo === 'image'): ?>
                                                <img src="<?= $certUrl ?>" alt="<?= $certTitulo ?>" loading="lazy">
                                            <?php else: ?>
                                                <div class="cpc-pdf-view">
                                                    <div class="pdf-icon-ring"><i class="fa-solid fa-file-pdf"></i></div>
                                                    <span class="pdf-lbl">DOCUMENTO PDF</span>
                                                </div>
                                            <?php endif; ?>
                                            <div class="cpc-overlay-hover">
                                                <div class="coh-pill">
                                                    <i class="fa-solid <?= $tipo === 'pdf' ? 'fa-arrow-up-right-from-square' : 'fa-magnifying-glass-plus' ?>"></i>
                                                    <span><?= $tipo === 'pdf' ? 'Abrir PDF' : 'Ver Diploma' ?></span>
                                                </div>
                                            </div>
                                            <span class="cpc-type-tag">
                                                <i class="fa-solid <?= $tipo === 'pdf' ? 'fa-file-pdf' : 'fa-image' ?>"></i>
                                                <?= $tipo === 'pdf' ? 'PDF' : 'IMAGEN' ?>
                                            </span>
                                        </div>
                                        <div class="cpc-meta">
                                            <h4 class="cpc-name"><?= $certTitulo ?></h4>
                                            <?php if ($certInst): ?>
                                                <span class="cpc-issuer"><i class="fa-solid fa-building-columns"></i> <?= $certInst ?></span>
                                            <?php endif; ?>
                                            <div class="cpc-footer-row">
                                                <span class="cpc-status"><i class="fa-solid fa-circle-check"></i> Verificado</span>
                                                <span class="cpc-action-hint">Ampliar <i class="fa-solid fa-chevron-right"></i></span>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                        <?php endif; ?>
                    </section>
                </div>

                <!-- TAB 2: Packs y Precios -->
                <?php if ($perfil['mostrar_packs'] && !empty($packs)): ?>
                    <div id="tab-pane-packs" class="tab-pane">
                        <section class="card-panel">
                            <h2 class="panel-heading"><i class="fa-solid fa-box-archive"></i> Planes y Precios de Clases</h2>
                            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 20px;">Elige la modalidad de entrenamiento que mejor se adapte a tu nivel y objetivos:</p>

                            <!-- Subtabs Modalidades -->
                            <div class="pack-subtabs-nav">
                                <button type="button" class="subtab-btn active" onclick="filterCoachPacks('todos', this)">
                                    <i class="fa-solid fa-layer-group"></i> <span>Todos</span> <span class="subtab-count"><?= count($packs) ?></span>
                                </button>
                                <button type="button" class="subtab-btn" onclick="filterCoachPacks('individual', this)">
                                    <i class="fa-solid fa-user"></i> <span>Individual</span> <span class="subtab-count"><?= count($packsIndividuales) ?></span>
                                </button>
                                <button type="button" class="subtab-btn" onclick="filterCoachPacks('multijugador', this)">
                                    <i class="fa-solid fa-user-group"></i> <span>Multijugador</span> <span class="subtab-count"><?= count($packsMultijugador) ?></span>
                                </button>
                                <button type="button" class="subtab-btn" onclick="filterCoachPacks('grupal', this)">
                                    <i class="fa-solid fa-users-rectangle"></i> <span>Grupal</span> <span class="subtab-count"><?= count($packsGrupales) ?></span>
                                </button>
                            </div>

                            <div class="packs-grid">
                                <?php foreach ($packs as $p): ?>
                                    <?php 
                                        $isGrupal = in_array($p['tipo'] ?? '', ['grupal', 'pack_grupal']);
                                        $isMulti = (!$isGrupal && (intval($p['cantidad_personas'] ?? 0) > 1 || in_array($p['tipo'] ?? '', ['multijugador', 'parejas'])));
                                        $segment = $isGrupal ? 'grupal' : ($isMulti ? 'multijugador' : 'individual');
                                        $tipoLabel = $isGrupal ? 'Grupal' : ($isMulti ? 'Multijugador (' . ($p['cantidad_personas'] ?? 2) . ' pers.)' : 'Individual');
                                    ?>
                                    <div class="pack-card" data-segment="<?= $segment ?>">
                                        <div>
                                            <span class="pack-type"><?= $tipoLabel ?></span>
                                            <h3 class="pack-name"><?= htmlspecialchars($p['nombre']) ?></h3>
                                            <?php if (!empty($p['descripcion'])): ?>
                                                <p class="pack-desc"><?= htmlspecialchars($p['descripcion']) ?></p>
                                            <?php endif; ?>
                                            <?php if (!empty($p['sesiones_totales']) || !empty($p['club_nombre'])): ?>
                                                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
                                                    <?php if (!empty($p['club_nombre'])): ?>
                                                        <span style="font-size: 11px; color: #94a3b8;"><i class="fa-solid fa-building" style="color: var(--accent-lime); margin-right: 4px;"></i> <?= htmlspecialchars($p['club_nombre']) ?></span>
                                                    <?php endif; ?>
                                                    <?php if (!empty($p['sesiones_totales'])): ?>
                                                        <span style="font-size: 11px; color: #94a3b8;"><i class="fa-solid fa-calendar-check" style="color: var(--accent-lime); margin-right: 4px;"></i> <?= $p['sesiones_totales'] ?> clases</span>
                                                    <?php endif; ?>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                        <div>
                                            <div class="pack-price">$<?= number_format($p['precio'], 0, ',', '.') ?> <span style="font-size: 13px; color: var(--text-muted); font-weight: 500;">CLP</span></div>
                                            <a href="https://padelblox.cl/#/jugador-reservas?entrenador_id=<?= $coach['id'] ?>&pack_id=<?= $p['id'] ?>" class="pack-btn" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, <?= $p['id'] ?>, '<?= addslashes(htmlspecialchars($p['nombre'])) ?>');">
                                                Comprar / Inscribirme <i class="fa-solid fa-arrow-right"></i>
                                            </a>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>

                            <div id="empty-packs-msg" style="display: none; text-align: center; padding: 36px 20px; background: #0a0f1d; border-radius: 18px; border: 1px dashed var(--border-card); margin-top: 10px;">
                                <i class="fa-solid fa-box-open" style="font-size: 32px; color: rgba(255,255,255,0.2); margin-bottom: 10px; display: block;"></i>
                                <p style="margin: 0 0 14px; font-size: 14px; color: var(--text-muted);">No hay packs disponibles en esta modalidad actualmente.</p>
                                <button type="button" class="subtab-btn" onclick="filterCoachPacks('todos', document.querySelector('.pack-subtabs-nav .subtab-btn'))">Ver todos los packs</button>
                            </div>
                        </section>
                    </div>
                <?php endif; ?>

                <!-- TAB 3: Horarios Disponibles (Calendario Interactivo UX) -->
                <?php if ($perfil['mostrar_horarios']): ?>
                    <div id="tab-pane-horarios" class="tab-pane">
                        <section class="card-panel">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 8px;">
                                <div>
                                    <h2 class="panel-heading" style="margin-bottom: 4px;"><i class="fa-solid fa-calendar-days"></i> Agenda & Disponibilidad en Vivo</h2>
                                    <p style="font-size: 13.5px; color: var(--text-muted); margin: 0;">Selecciona una fecha en el calendario para ver los horarios disponibles de <?= $coachNombre ?>:</p>
                                </div>
                                <span class="live-agenda-badge">
                                    <span class="live-pulse"></span>
                                    <span>Agenda Actualizada</span>
                                </span>
                            </div>

                            <?php if (!empty($horarios)): ?>
                                <!-- Calendar Date Timeline Strip -->
                                <div style="margin: 18px 0 20px;">
                                    <div class="calendar-timeline-scroll">
                                        <?php foreach ($diasDisponibles as $idx => $d): ?>
                                            <button 
                                                type="button" 
                                                class="cal-day-card <?= $d['fecha'] === $activeDate ? 'active' : '' ?>"
                                                data-fecha="<?= $d['fecha'] ?>"
                                                onclick="selectCoachScheduleDate('<?= $d['fecha'] ?>', this)">
                                                <span class="cdc-tag <?= ($d['isToday'] || $d['isTomorrow']) ? 'highlight' : '' ?>"><?= $d['tag'] ?></span>
                                                <span class="cdc-num"><?= $d['diaNumero'] ?></span>
                                                <span class="cdc-month"><?= $d['mes'] ?></span>
                                                <div class="cdc-badge">
                                                    <span class="cdc-dot"></span>
                                                    <span><?= $d['total'] ?> <?= $d['total'] === 1 ? 'hora' : 'horas' ?></span>
                                                </div>
                                            </button>
                                        <?php endforeach; ?>
                                    </div>
                                </div>

                                <!-- Day Focus Views -->
                                <?php foreach ($diasDisponibles as $d): ?>
                                    <?php 
                                        $diaHorarios = $horariosPorDia[$d['fecha']] ?? [];
                                        $morning = array_filter($diaHorarios, function($h) { return intval(substr($h['hora'] ?? '00:00', 0, 2)) < 12; });
                                        $afternoon = array_filter($diaHorarios, function($h) { 
                                            $hNum = intval(substr($h['hora'] ?? '00:00', 0, 2));
                                            return $hNum >= 12 && $hNum < 18; 
                                        });
                                        $evening = array_filter($diaHorarios, function($h) { return intval(substr($h['hora'] ?? '00:00', 0, 2)) >= 18; });
                                    ?>
                                    <div class="calendar-day-focus coach-day-panel" id="coach-day-<?= $d['fecha'] ?>" style="display: <?= $d['fecha'] === $activeDate ? 'block' : 'none' ?>;">
                                        <div class="focus-date-header">
                                            <i class="fa-solid fa-calendar-day"></i>
                                            <div>
                                                <h3><?= $d['header'] ?></h3>
                                                <span class="fdh-sub"><?= count($diaHorarios) ?> <?= count($diaHorarios) === 1 ? 'bloque horario disponible' : 'bloques horarios disponibles' ?> para reservar</span>
                                            </div>
                                        </div>

                                        <?php if (!empty($morning)): ?>
                                            <div class="period-group">
                                                <div class="period-title">
                                                    <span>🌅 Bloques de Mañana (08:00 - 12:00)</span>
                                                    <span class="period-count"><?= count($morning) ?></span>
                                                </div>
                                                <div class="period-slots-grid">
                                                    <?php foreach ($morning as $h): ?>
                                                        <div class="slot-tile" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, null, 'Clase el <?= date('d/m', strtotime($h['fecha'])) ?> a las <?= $h['hora'] ?> hrs');">
                                                            <div class="st-time">
                                                                <i class="fa-regular fa-clock"></i>
                                                                <span><?= $h['hora'] ?> hrs</span>
                                                            </div>
                                                            <?php if (!empty($h['club_nombre'])): ?>
                                                                <div class="st-club"><i class="fa-solid fa-location-dot"></i> <?= htmlspecialchars($h['club_nombre']) ?></div>
                                                            <?php endif; ?>
                                                            <button class="btn-tile-book" type="button">
                                                                <i class="fa-solid fa-calendar-plus"></i> Reservar
                                                            </button>
                                                        </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>

                                        <?php if (!empty($afternoon)): ?>
                                            <div class="period-group">
                                                <div class="period-title">
                                                    <span>☀️ Bloques de Tarde (12:00 - 18:00)</span>
                                                    <span class="period-count"><?= count($afternoon) ?></span>
                                                </div>
                                                <div class="period-slots-grid">
                                                    <?php foreach ($afternoon as $h): ?>
                                                        <div class="slot-tile" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, null, 'Clase el <?= date('d/m', strtotime($h['fecha'])) ?> a las <?= $h['hora'] ?> hrs');">
                                                            <div class="st-time">
                                                                <i class="fa-regular fa-clock"></i>
                                                                <span><?= $h['hora'] ?> hrs</span>
                                                            </div>
                                                            <?php if (!empty($h['club_nombre'])): ?>
                                                                <div class="st-club"><i class="fa-solid fa-location-dot"></i> <?= htmlspecialchars($h['club_nombre']) ?></div>
                                                            <?php endif; ?>
                                                            <button class="btn-tile-book" type="button">
                                                                <i class="fa-solid fa-calendar-plus"></i> Reservar
                                                            </button>
                                                        </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>

                                        <?php if (!empty($evening)): ?>
                                            <div class="period-group">
                                                <div class="period-title">
                                                    <span>🌙 Bloques de Noche (18:00 - 23:00)</span>
                                                    <span class="period-count"><?= count($evening) ?></span>
                                                </div>
                                                <div class="period-slots-grid">
                                                    <?php foreach ($evening as $h): ?>
                                                        <div class="slot-tile" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, null, 'Clase el <?= date('d/m', strtotime($h['fecha'])) ?> a las <?= $h['hora'] ?> hrs');">
                                                            <div class="st-time">
                                                                <i class="fa-regular fa-clock"></i>
                                                                <span><?= $h['hora'] ?> hrs</span>
                                                            </div>
                                                            <?php if (!empty($h['club_nombre'])): ?>
                                                                <div class="st-club"><i class="fa-solid fa-location-dot"></i> <?= htmlspecialchars($h['club_nombre']) ?></div>
                                                            <?php endif; ?>
                                                            <button class="btn-tile-book" type="button">
                                                                <i class="fa-solid fa-calendar-plus"></i> Reservar
                                                            </button>
                                                        </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                <?php endforeach; ?>

                                <!-- Premium Booking Banner ("Mejorar ese botón") -->
                                <div class="calendar-booking-banner">
                                    <div class="cbb-glow"></div>
                                    <div class="cbb-inner">
                                        <div class="cbb-left">
                                            <div class="cbb-icon-box">
                                                <i class="fa-solid fa-calendar-check"></i>
                                            </div>
                                            <div class="cbb-text">
                                                <h4>¿Buscas un horario recurrente o agendar con pack?</h4>
                                                <p>Elige tu horario favorito arriba o accede directamente a la agenda completa de <?= $coachNombre ?> para reservar tu clase.</p>
                                            </div>
                                        </div>
                                        <div class="cbb-actions">
                                            <a href="#tabs-anchor" class="btn-calendar-primary" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, null, 'Clase con <?= addslashes(htmlspecialchars($coachNombre)) ?>');">
                                                <i class="fa-solid fa-calendar-check"></i>
                                                <span>Ver Agenda Completa y Reservar Clase</span>
                                            </a>
                                            <?php if (!empty($perfil['whatsapp'])): ?>
                                                <a href="https://wa.me/<?= $cleanWsp ?>?text=<?= $wspMsg ?>" target="_blank" rel="noopener" class="btn-calendar-wsp">
                                                    <i class="fa-brands fa-whatsapp"></i>
                                                    <span>Consultar por WhatsApp</span>
                                                </a>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php else: ?>
                                <div style="text-align: center; padding: 44px 20px; background: rgba(10, 15, 29, 0.4); border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 20px; margin-top: 16px;">
                                    <i class="fa-solid fa-calendar-xmark" style="font-size: 40px; color: var(--accent-lime); margin-bottom: 12px; display: block;"></i>
                                    <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 6px;">Sin bloques públicos disponibles por el momento</h3>
                                    <p style="font-size: 13.5px; color: var(--text-muted); max-width: 480px; margin: 0 auto 20px; line-height: 1.5;">El profesor <?= $coachNombre ?> está actualizando su agenda o gestiona sus cupos de forma directa.</p>
                                    <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                                        <a href="#tabs-anchor" class="btn-calendar-primary" onclick="return handleMobileBooking(event, <?= $coach['id'] ?>, null, 'Clase con <?= addslashes(htmlspecialchars($coachNombre)) ?>');">
                                            <i class="fa-solid fa-calendar-plus"></i> Ir a Reservas de Jugador
                                        </a>
                                        <?php if (!empty($perfil['whatsapp'])): ?>
                                            <a href="https://wa.me/<?= $cleanWsp ?>?text=<?= $wspMsg ?>" target="_blank" rel="noopener" class="btn-calendar-wsp">
                                                <i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            <?php endif; ?>
                        </section>
                    </div>
                <?php endif; ?>

                <!-- TAB 4: Reseñas -->
                <?php if ($perfil['mostrar_resenas']): ?>
                    <div id="tab-pane-resenas" class="tab-pane">
                        <section class="card-panel">
                            <h2 class="panel-heading"><i class="fa-solid fa-comments"></i> Opiniones de Alumnos Verificados</h2>
                            
                            <div class="reviews-summary">
                                <div class="rating-number"><?= $stats['promedio_rating'] ?></div>
                                <div>
                                    <div class="stars">
                                        <?php for ($i = 1; $i <= 5; $i++): ?>
                                            <i class="fa-solid fa-star<?= $i <= round($stats['promedio_rating']) ? '' : '-half-stroke' ?>"></i>
                                        <?php endfor; ?>
                                    </div>
                                    <div style="font-size: 13px; color: var(--text-muted);">
                                        Basado en <?= $stats['total_resenas'] ?> <?= $stats['total_resenas'] === 1 ? 'reseña verificada' : 'reseñas verificadas' ?>
                                    </div>
                                </div>
                            </div>

                            <?php if (empty($resenas)): ?>
                                <p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px;">
                                    Aún no hay reseñas registradas para este entrenador. ¡Sé el primero en tomar una clase y evaluarlo!
                                </p>
                            <?php else: ?>
                                <div class="reviews-list">
                                    <?php foreach ($resenas as $r): ?>
                                        <div class="review-card">
                                            <div class="reviewer-meta">
                                                <div class="reviewer-avatar">
                                                    <img src="<?= htmlspecialchars($r['alumno_foto'] ?: 'https://padelblox.cl/assets/icons/icon-192x192.png') ?>" alt="Alumno">
                                                </div>
                                                <div>
                                                    <div class="reviewer-name"><?= htmlspecialchars($r['alumno_nombre']) ?></div>
                                                    <div class="stars" style="font-size: 12px;">
                                                        <?php for ($s = 1; $s <= 5; $s++): ?>
                                                            <i class="fa-solid fa-star<?= $s <= intval($r['rating']) ? '' : '-half-stroke' ?>"></i>
                                                        <?php endfor; ?>
                                                    </div>
                                                </div>
                                                <div class="review-date"><?= date('d/m/Y', strtotime($r['created_at'])) ?></div>
                                            </div>
                                            <p style="font-size: 14px; color: #cbd5e1;"><?= nl2br(htmlspecialchars($r['comentario'])) ?></p>

                                            <?php if (!empty($r['respuesta_entrenador'])): ?>
                                                <div class="coach-reply">
                                                    <strong>Respuesta de <?= $coachNombre ?>:</strong>
                                                    <p style="margin-top: 4px;"><?= nl2br(htmlspecialchars($r['respuesta_entrenador'])) ?></p>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </section>
                    </div>
                <?php endif; ?>

            </div>

            <!-- Banner PadelBlox Inferior (Ancho Completo) -->
            <div class="card-panel" style="background: linear-gradient(135deg, rgba(204,255,0,0.08), rgba(15, 23, 42, 0.8)); border-color: rgba(204,255,0,0.25); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 20px;">
                <div>
                    <h4 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px;">¿Eres Entrenador de Pádel?</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Crea tu propio perfil público gratis, recibe reservas directas y gestiona tus alumnos con PadelBlox.</p>
                </div>
                <a href="https://padelblox.cl/register" class="btn-primary" style="padding: 10px 20px; font-size: 13px;">Crear mi perfil gratis &rarr;</a>
            </div>
        </div>
    </main>

    <!-- Mobile App Reservation Bottom Sheet / Modal -->
    <div id="appBookingModal" class="app-booking-overlay" onclick="closeAppModal()">
        <div class="app-booking-sheet" onclick="event.stopPropagation()">
            <button class="sheet-close-btn" onclick="closeAppModal()" aria-label="Cerrar modal">&times;</button>
            <div class="abs-header">
                <div class="abs-app-icon">
                    <img src="https://padelblox.cl/assets/images/logo-transparent.png" alt="PadelBlox Logo">
                </div>
                <div class="abs-tag"><i class="fa-solid fa-bolt"></i> APP OFICIAL PADELBLOX</div>
                <h3 class="abs-title">Reserva en la App PadelBlox</h3>
                <p class="abs-subtitle">
                    Para una experiencia más rápida, recordatorios en tu celular y seguimiento de tus clases:
                </p>
            </div>

            <div class="abs-target-pill" id="absTargetPill">
                <div class="atp-icon"><i class="fa-solid fa-ticket"></i></div>
                <div class="atp-info">
                    <span class="atp-title" id="absTargetTitle">Reserva de Clases</span>
                    <span class="atp-sub" id="absTargetSub"><?= htmlspecialchars($coachNombre) ?></span>
                </div>
            </div>

            <div class="abs-actions">
                <button type="button" class="btn-sheet-primary" onclick="executeOpenMobileApp()">
                    <i class="fa-solid fa-mobile-screen-button"></i>
                    <span>Abrir en la App PadelBlox</span>
                </button>

                <div class="abs-opening-status" id="absOpeningStatus">
                    <div class="pulse-indicator"></div>
                    <span>Abriendo PadelBlox... Si no la tienes instalada, te redirigiremos a la tienda.</span>
                </div>

                <a id="btnStoreDownload" href="#" target="_blank" rel="noopener noreferrer" class="btn-sheet-store">
                    <i class="fa-brands fa-google-play" id="iconStore"></i>
                    <span id="textStore">Descargar en la Tienda</span>
                </a>

                <button type="button" class="btn-sheet-web" onclick="continueWebBooking()">
                    <i class="fa-solid fa-globe"></i>
                    <span>Continuar en el navegador web</span>
                </button>
            </div>

            <div class="abs-footer-note">
                <i class="fa-solid fa-shield-halved"></i> Reserva segura y garantizada por PadelBlox
            </div>
        </div>
    </div>

    <!-- Modal Visualizador de Certificados (SSR) -->
    <div id="certLightboxModal" class="cert-lightbox-modal" style="display: none;" onclick="closeCertModal()">
        <div class="clm-dialog" onclick="event.stopPropagation()">
            <div class="clm-header">
                <div class="clm-title-box">
                    <div class="clm-tag"><i class="fa-solid fa-shield-check"></i> Documento Acreditado PadelBlox</div>
                    <h3 id="clmTitle" class="clm-title"></h3>
                    <p id="clmInst" class="clm-inst"></p>
                </div>
                <button type="button" class="btn-close-modal" onclick="closeCertModal()" aria-label="Cerrar modal">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="clm-body">
                <div id="clmImageContainer" class="clm-image-container" style="display: none;">
                    <img id="clmImg" src="" alt="Certificado" class="clm-img">
                </div>
                <div id="clmPdfContainer" class="clm-pdf-container" style="display: none;">
                    <iframe id="clmPdfFrame" src="" class="clm-pdf-frame"></iframe>
                    <div class="clm-pdf-fallback">
                        <i class="fa-solid fa-file-pdf"></i>
                        <div>
                            <strong>Documento PDF</strong>
                            <p>Si la vista previa no se despliega en tu navegador:</p>
                        </div>
                        <a id="clmOpenPdfDirect" href="" target="_blank" class="btn-open-pdf-direct">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir PDF
                        </a>
                    </div>
                </div>
            </div>
            <div class="clm-footer">
                <a id="clmDownloadBtn" href="" target="_blank" class="btn-download-cert">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Original
                </a>
                <button type="button" class="btn-close-cert" onclick="closeCertModal()">Cerrar</button>
            </div>
        </div>
    </div>

    <script>
        var activeBookingTarget = { coachId: null, packId: null, label: '' };
        var PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=cl.padelacademy.app&pcampaignid=web_share';
        var APP_STORE_URL = 'https://apps.apple.com/cl/app/padelblox-chile/id6759664729';

        function isMobileDevice() {
            return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        }
        function isIOSDevice() {
            return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        }

        function handleMobileBooking(event, coachId, packId, label) {
            if (!isMobileDevice()) {
                if (packId) {
                    window.location.href = 'https://padelblox.cl/#/jugador-reservas?entrenador_id=' + coachId + '&pack_id=' + packId;
                } else {
                    switchCoachTab('packs');
                }
                return false;
            }

            if (event) event.preventDefault();
            activeBookingTarget = { coachId: coachId, packId: packId, label: label || 'Clase con <?= addslashes(htmlspecialchars($coachNombre)) ?>' };
            
            var titleEl = document.getElementById('absTargetTitle');
            if (titleEl) titleEl.innerText = activeBookingTarget.label;

            var storeBtn = document.getElementById('btnStoreDownload');
            var iconStore = document.getElementById('iconStore');
            var textStore = document.getElementById('textStore');
            if (isIOSDevice()) {
                if (storeBtn) storeBtn.href = APP_STORE_URL;
                if (iconStore) iconStore.className = 'fa-brands fa-apple';
                if (textStore) textStore.innerText = 'Descargar en App Store (iPhone)';
            } else {
                if (storeBtn) storeBtn.href = PLAY_STORE_URL;
                if (iconStore) iconStore.className = 'fa-brands fa-google-play';
                if (textStore) textStore.innerText = 'Descargar en Google Play (Android)';
            }

            var statusEl = document.getElementById('absOpeningStatus');
            if (statusEl) statusEl.classList.remove('active');

            var modal = document.getElementById('appBookingModal');
            if (modal) modal.classList.add('active');
            return false;
        }

        function closeAppModal() {
            var modal = document.getElementById('appBookingModal');
            if (modal) modal.classList.remove('active');
        }

        function executeOpenMobileApp() {
            var query = 'jugador-reservas?entrenador_id=' + (activeBookingTarget.coachId || <?= $coach['id'] ?>);
            if (activeBookingTarget.packId) {
                query += '&pack_id=' + activeBookingTarget.packId;
            }

            var storeUrl = isIOSDevice() ? APP_STORE_URL : PLAY_STORE_URL;
            var statusEl = document.getElementById('absOpeningStatus');
            if (statusEl) statusEl.classList.add('active');

            if (/Android/i.test(navigator.userAgent)) {
                var intentUrl = 'intent://' + query + '#Intent;scheme=padelblox;package=cl.padelacademy.app;S.browser_fallback_url=' + encodeURIComponent(storeUrl) + ';end';
                var timer = setTimeout(function() {
                    if (document.visibilityState === 'visible') {
                        window.location.href = storeUrl;
                    }
                }, 2000);
                window.addEventListener('visibilitychange', function() {
                    if (document.visibilityState === 'hidden') clearTimeout(timer);
                }, { once: true });
                window.location.href = intentUrl;
                return;
            }

            if (isIOSDevice()) {
                var customUrl = 'padelblox://' + query;
                var startTime = Date.now();
                var timer = setTimeout(function() {
                    if (document.visibilityState === 'visible' && (Date.now() - startTime < 3000)) {
                        window.location.href = storeUrl;
                    }
                }, 1800);
                window.addEventListener('visibilitychange', function() {
                    if (document.visibilityState === 'hidden') clearTimeout(timer);
                }, { once: true });
                window.location.href = customUrl;
                return;
            }

            window.location.href = storeUrl;
        }

        function continueWebBooking() {
            closeAppModal();
            var url = 'https://padelblox.cl/#/jugador-reservas?entrenador_id=' + (activeBookingTarget.coachId || <?= $coach['id'] ?>);
            if (activeBookingTarget.packId) {
                url += '&pack_id=' + activeBookingTarget.packId;
            }
            window.location.href = url;
        }

        function selectCoachScheduleDate(fecha, btn) {
            var days = document.querySelectorAll('.cal-day-card');
            days.forEach(function(d) { d.classList.remove('active'); });
            if (btn) btn.classList.add('active');

            var panels = document.querySelectorAll('.coach-day-panel');
            panels.forEach(function(p) { p.style.display = 'none'; });

            var targetPanel = document.getElementById('coach-day-' + fecha);
            if (targetPanel) {
                targetPanel.style.display = 'block';
            }
        }

        function switchCoachTab(tabName, btn) {
            var tabs = document.querySelectorAll('.profile-tabs-bar .tab-item-btn');
            tabs.forEach(function(b) { b.classList.remove('active'); });

            if (btn) {
                btn.classList.add('active');
            } else {
                tabs.forEach(function(b) {
                    if (b.innerText.toLowerCase().includes(tabName === 'packs' ? 'pack' : tabName)) {
                        b.classList.add('active');
                    }
                });
            }

            document.querySelectorAll('.tab-pane').forEach(function(p) {
                p.classList.remove('active');
            });
            var targetPane = document.getElementById('tab-pane-' + tabName);
            if (targetPane) {
                targetPane.classList.add('active');
            }

            var anchor = document.getElementById('tabs-anchor');
            if (anchor) {
                var rect = anchor.getBoundingClientRect();
                if (rect.top < 70) {
                    anchor.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }

        function filterCoachPacks(segment, btn) {
            var subtabs = document.querySelectorAll('.pack-subtabs-nav .subtab-btn');
            subtabs.forEach(function(b) { b.classList.remove('active'); });
            if (btn) btn.classList.add('active');

            var cards = document.querySelectorAll('.packs-grid .pack-card');
            var visibleCount = 0;
            cards.forEach(function(c) {
                if (segment === 'todos' || c.getAttribute('data-segment') === segment) {
                    c.style.display = 'flex';
                    visibleCount++;
                } else {
                    c.style.display = 'none';
                }
            });

            var emptyMsg = document.getElementById('empty-packs-msg');
            if (emptyMsg) {
                emptyMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
            }
        function openCertModal(url, title, inst, type) {
            document.getElementById('clmTitle').textContent = title;
            var instEl = document.getElementById('clmInst');
            if (inst) {
                instEl.innerHTML = '<i class="fa-solid fa-building-columns"></i> ' + inst;
                instEl.style.display = 'block';
            } else {
                instEl.style.display = 'none';
            }
            document.getElementById('clmDownloadBtn').href = url;
            
            var imgContainer = document.getElementById('clmImageContainer');
            var pdfContainer = document.getElementById('clmPdfContainer');
            
            if (type === 'pdf') {
                imgContainer.style.display = 'none';
                pdfContainer.style.display = 'flex';
                document.getElementById('clmPdfFrame').src = url;
                document.getElementById('clmOpenPdfDirect').href = url;
            } else {
                pdfContainer.style.display = 'none';
                imgContainer.style.display = 'flex';
                document.getElementById('clmImg').src = url;
            }
            
            document.getElementById('certLightboxModal').style.display = 'flex';
        }

        function closeCertModal() {
            document.getElementById('certLightboxModal').style.display = 'none';
            document.getElementById('clmPdfFrame').src = '';
            document.getElementById('clmImg').src = '';
        }

        (function() {
            try {
                fetch('https://api.padelmanager.cl/prd/entrenador_publico/track_visita.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug: '<?= addslashes($slug) ?>' })
                });
            } catch(e) {}
        })();
    </script>
</body>
</html>
