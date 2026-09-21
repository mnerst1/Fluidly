<?php
declare(strict_types=1);
$config = require __DIR__ . '/config.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function asset(string $path): string { return $path . '?v=' . filemtime(__DIR__ . '/' . $path); }
function e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="en" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f6f5f0">
    <meta name="description" content="A little playground for fluid motion. Paint, experiment, and find your flow with a real-time fluid simulation.">
    <title>Fluidly — Find your flow.</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='12' fill='%23717c4f'/%3E%3Cpath d='M10 24Q15 8 21 19T32 15M8 30Q16 16 22 26T33 23' fill='none' stroke='%23fff' stroke-width='3'/%3E%3C/svg%3E">
    <script>try{const t=localStorage.getItem('fluidly-theme');document.documentElement.dataset.theme=t||((matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light')}catch(e){}</script>
    <link rel="stylesheet" href="<?= e(asset('assets/style.css')) ?>">
</head>
<body>
<svg class="icon-definitions" xmlns="http://www.w3.org/2000/svg"><defs>
<symbol id="i-wave" viewBox="0 0 24 24"><path d="M2 10c4-10 6 10 10 0S18 20 22 10M2 17c4-10 6 10 10 0s6 10 10 0"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M7 17 17 7M6 7h11v11"/></symbol>
<symbol id="i-reset" viewBox="0 0 24 24"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></symbol>
<symbol id="i-pause" viewBox="0 0 24 24"><path d="M9 5v14M16 5v14"/></symbol>
<symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/></symbol>
<symbol id="i-expand" viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></symbol>
<symbol id="i-spark" viewBox="0 0 24 24"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM21 2v4m-2-2h4"/></symbol>
<symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h16M4 17h16M9 4v6m6 4v6"/></symbol>
<symbol id="i-draw" viewBox="0 0 24 24"><path d="m4 16-1 5 5-1L21 7l-4-4ZM14 6l4 4"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path d="M20.5 15.5A9 9 0 0 1 8.5 3.5a9 9 0 1 0 12 12Z"/></symbol>
</defs></svg>
<header class="site-header">
    <a class="brand" href="./" aria-label="Fluidly home"><span class="brand-mark"><svg><use href="#i-wave"/></svg></span>fluidly<span class="brand-dot">.</span></a>
    <span class="header-note" data-i18n="header.note">A playground for the curious.</span>
    <div class="site-preferences">
        <div class="language-picker" role="group" data-i18n-aria="language.group" aria-label="Language"><button type="button" data-language="kk" lang="kk">ҚАЗ</button><button type="button" data-language="ru" lang="ru">РУС</button><button type="button" data-language="en" lang="en">ENG</button></div>
        <button class="icon-button theme-toggle" id="theme-button" data-i18n-aria="theme.dark" aria-label="Use dark mode" title="Use dark mode"><svg class="theme-sun"><use href="#i-sun"/></svg><svg class="theme-moon"><use href="#i-moon"/></svg></button>
        <button class="text-button" id="about-button"><span data-i18n="header.about">Behind the flow</span> <svg><use href="#i-arrow"/></svg></button>
    </div>
</header>
<main>
    <section class="intro"><div><div class="eyebrow"><span class="eyebrow-dot"></span><span data-i18n="hero.eyebrow">AN INTERACTIVE FLUID LAB</span></div><h1 data-i18n-html="hero.title">A little motion.<br class="mobile-break"> Endless possibility<span>.</span></h1><p data-i18n="hero.subtitle">Make a move. Mix some color. See where the current takes you.</p></div><span class="intro-flourish" aria-hidden="true">↝</span></section>
    <div class="workspace">
        <section class="simulation" id="simulation" data-i18n-aria="simulation.label" aria-label="Interactive fluid simulation">
            <canvas id="fluid-canvas" tabindex="0" data-i18n-aria="simulation.canvas" aria-label="Fluid canvas. Click and drag to paint. Press B for a burst, Space to pause, R to reset."></canvas>
            <div class="canvas-top"><span class="live-badge"><i></i><span id="run-status">LIVE SIMULATION</span></span><span class="canvas-preset" id="canvas-preset">01 / Aurora</span></div>
            <div id="canvas-error" class="canvas-error" hidden><h2 data-i18n="error.heading">Let’s get things flowing.</h2><p id="error-message"></p><button class="primary-button" onclick="location.reload()" data-i18n="error.retry">Try again</button></div>
            <div class="canvas-instruction" id="canvas-instruction"><span class="instruction-icon"><svg><use href="#i-draw"/></svg></span><span><span data-i18n="simulation.invite">Make yourself a little space to play.</span><small data-i18n="simulation.instruction">Click & drag to stir the fluid</small></span></div>
            <div class="canvas-bottom"><div class="canvas-tools"><button id="pause-button" aria-label="Pause simulation" title="Pause (Space)"><svg><use href="#i-pause"/></svg></button><span class="tool-divider"></span><button id="reset-button" aria-label="Reset simulation" title="Reset (R)"><svg><use href="#i-reset"/></svg></button><button id="capture-button" aria-label="Save image" title="Save image"><svg><use href="#i-camera"/></svg></button></div><div class="canvas-right"><span class="fps"><i></i><span id="fps">—</span> FPS</span><button id="fullscreen-button" aria-label="Enter fullscreen" title="Fullscreen (F)"><svg><use href="#i-expand"/></svg></button></div></div>
        </section>
        <aside class="controls"><div class="panel-heading"><div><svg><use href="#i-sliders"/></svg><h2 data-i18n="controls.heading">Your experiment</h2></div><button id="defaults-button" data-i18n-aria="controls.restore" title="Restore preset settings" aria-label="Restore preset settings"><svg><use href="#i-reset"/></svg></button></div>
            <section class="control-section"><div class="section-label"><span data-i18n="controls.feel">THE FEEL</span><span>01</span></div>
            <div class="range-control"><label for="swirl"><span data-i18n="controls.swirl">Swirl</span><output id="swirl-value" for="swirl">28</output></label><input id="swirl" type="range" min="0" max="60" step="1" value="28"><div class="range-ends"><span data-i18n="controls.gentle">Gentle</span><span data-i18n="controls.wild">Wild</span></div></div>
            <div class="range-control"><label for="diffusion"><span data-i18n="controls.resistance">Flow resistance</span><output id="diffusion-value" for="diffusion">0.70</output></label><input id="diffusion" type="range" min="0" max="3" step="0.05" value="0.7"><div class="range-ends"><span data-i18n="controls.free">Free-flowing</span><span data-i18n="controls.slower">Slower</span></div></div>
            <div class="range-control"><label for="persistence"><span data-i18n="controls.fade">Color fade</span><output id="persistence-value" for="persistence">0.22</output></label><input id="persistence" type="range" min="0.05" max="1.2" step="0.01" value="0.22"><div class="range-ends"><span data-i18n="controls.lingering">Lingering</span><span data-i18n="controls.fleeting">Fleeting</span></div></div></section>
            <section class="control-section"><div class="section-label"><span data-i18n="controls.brushSection">YOUR BRUSH</span><span>02</span></div><div class="range-control compact"><label for="radius"><span data-i18n="controls.brushSize">Brush size</span><output id="radius-value" for="radius">0.25</output></label><input id="radius" type="range" min="0.05" max="0.8" step="0.01" value="0.25"></div><div class="palette-label"><span data-i18n="controls.palette">Color palette</span><span id="palette-name">Aurora</span></div><div class="palettes" role="group" data-i18n-aria="controls.palette" aria-label="Color palette"><button data-palette="aurora" class="palette aurora active" aria-pressed="true"><svg><use href="#i-check"/></svg></button><button data-palette="ember" class="palette ember" aria-pressed="false"><svg><use href="#i-check"/></svg></button><button data-palette="ocean" class="palette ocean" aria-pressed="false"><svg><use href="#i-check"/></svg></button><button data-palette="bloom" class="palette bloom" aria-pressed="false"><svg><use href="#i-check"/></svg></button><button data-palette="mono" class="palette mono" aria-pressed="false"><svg><use href="#i-check"/></svg></button></div></section>
            <section class="control-section last-section"><label class="toggle-row" for="autopilot"><span><span data-i18n="controls.autopilot">Let it flow</span><small data-i18n="controls.autopilotHint">A little motion, all on its own</small></span><input type="checkbox" id="autopilot" checked><span class="toggle-track"></span></label><label class="quality-row" for="quality"><span data-i18n="controls.quality">Render quality</span><select id="quality"><option value="low" data-i18n="quality.low">Light</option><option value="medium" selected data-i18n="quality.medium">Balanced</option><option value="high" data-i18n="quality.high">High detail</option></select></label></section>
            <button class="primary-button" id="burst-button"><svg><use href="#i-spark"/></svg><span class="button-copy" data-i18n="controls.chaos">Add a little chaos</span><span>B</span></button><p class="panel-footnote" data-i18n="controls.footnote">There’s no right way to play.</p>
        </aside>
    </div>
    <section class="presets-section"><div class="presets-heading"><h2 data-i18n="presets.heading">A starting point, not a rule.</h2><span data-i18n="presets.prompt">PICK A MOOD</span></div><div class="presets">
    <?php foreach ($config['presets'] as $i => $preset): ?>
        <button class="preset <?= $i === 0 ? 'active' : '' ?>" data-preset="<?= e($preset['id']) ?>" aria-pressed="<?= $i === 0 ? 'true' : 'false' ?>"><span class="preset-art <?= e($preset['id']) ?>"><span></span></span><span class="preset-copy"><strong data-preset-name><?= e($preset['name']) ?></strong><small data-preset-description><?= e($preset['description']) ?></small></span><span class="preset-indicator"><svg><use href="#i-arrow"/></svg></span></button>
    <?php endforeach; ?>
    </div></section>
</main>
<footer><span data-i18n-html="footer.made">Made for moments of <em>flow.</em></span><span data-i18n-html="footer.tech">REAL-TIME FLUID DYNAMICS <span class="footer-dot">·</span> IN YOUR BROWSER</span><button class="text-button" id="help-button"><span data-i18n="footer.shortcuts">Keyboard shortcuts</span><kbd>?</kbd></button></footer>
<dialog id="info-dialog"><button class="dialog-close" data-i18n-aria="dialog.close" aria-label="Close dialog">×</button><div class="eyebrow" data-i18n="dialog.eyebrow">A LITTLE UNDER THE SURFACE</div><h2 data-i18n-html="dialog.title">Beautiful things<br>come from a little chaos.</h2><p data-i18n="dialog.p1">Fluidly is a real-time, two-dimensional fluid playground. Your brush adds color and momentum. Advection, pressure projection, and swirling vortices do the rest.</p><p data-i18n="dialog.p2">PHP serves the studio. Your GPU brings it to life using WebGL 2. Everything runs locally in your browser, including image exports.</p><p class="dialog-note" data-i18n="dialog.note">An artistic simulation for exploration, rather than an engineering or measurement tool.</p><div class="shortcuts"><span><kbd>Space</kbd><span data-i18n="shortcuts.pause">Pause / resume</span></span><span><kbd>B</kbd><span data-i18n="shortcuts.burst">Add a burst</span></span><span><kbd>R</kbd><span data-i18n="shortcuts.reset">Start fresh</span></span><span><kbd>F</kbd><span data-i18n="shortcuts.fullscreen">Fullscreen</span></span><span><kbd>?</kbd><span data-i18n="shortcuts.guide">This little guide</span></span><span><kbd>Esc</kbd><span data-i18n="shortcuts.close">Close</span></span></div></dialog>
<div id="toast" role="status" aria-live="polite"></div>
<script id="app-config" type="application/json"><?= json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
<script type="module" src="<?= e(asset('assets/app.js')) ?>"></script>
</body>
</html>