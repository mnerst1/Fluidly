# Fluidly

Fluidly is an interactive, real-time fluid dynamics playground built with PHP and WebGL 2. Paint with color and momentum, shape the flow with responsive controls, and export the result as an image—all directly in the browser.

## Features

- Real-time GPU fluid simulation powered by WebGL 2
- Mouse, touch, and multi-touch drawing
- Adjustable swirl, flow resistance, color fade, and brush size
- Four visual presets and five color palettes
- Automatic flow mode for continuous motion
- Light and dark interface themes
- English, Russian, and Kazakh interfaces
- Three rendering quality levels
- Fullscreen mode and PNG export
- Responsive desktop, tablet, and mobile layout
- Keyboard shortcuts and accessible controls
- No database, package manager, or build process required

## Requirements

- PHP 7.4 or newer
- A modern browser with WebGL 2 support
- The `EXT_color_buffer_float` WebGL extension
- Hardware acceleration enabled for the best performance

Google Chrome is recommended. Fluidly displays a recovery message when the required graphics features are unavailable.

## Installation with OpenServer

1. Clone or copy the repository into your OpenServer domains directory:

   ```text
   C:\OSPanel\domains\fluidly
   ```

2. Enable PHP 7.4 or newer and an HTTP server in OpenServer.
3. Restart OpenServer so it discovers the domain.
4. Open [http://fluidly/](http://fluidly/) in Chrome.

If your OpenServer installation uses a custom domain, configure its document root to point to the repository directory.

## Run with PHP's development server

From the project directory, run:

```bash
php -S 127.0.0.1:8080 -t .
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080) in your browser.

Fluidly does not require Composer, npm, a database, an internet connection, or a build step.

## How to use

Click or touch the fluid canvas and drag to inject color and momentum. Select a preset for a quick starting point, choose a palette, and adjust the simulation controls to create different flow patterns.

Enable **Let it flow** to add subtle automatic motion. Use the camera button to download the current canvas as a PNG image.

Theme and language preferences are saved in local browser storage. On the first visit, the interface follows the browser language and the operating system color preference. Changing the interface theme does not alter the fluid simulation colors.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Pause or resume the simulation |
| `B` | Add a burst of color and momentum |
| `R` | Reset the current preset |
| `F` | Enter or leave fullscreen mode |
| `?` | Open the guide |
| `Esc` | Close the guide or leave fullscreen mode |

Keyboard shortcuts are disabled while a form control or button has focus. When reduced motion is enabled at the operating system level, Fluidly starts paused with automatic motion disabled.

## Project structure

```text
fluidly/
├── assets/
│   ├── app.js          # Application controls, input, state, and lifecycle
│   ├── fluid.js        # WebGL 2 fluid solver and renderer
│   ├── i18n.js         # Interface translations
│   └── style.css       # Responsive interface and themes
├── tests/
│   └── browser.cjs     # Chrome interaction and regression tests
├── config.php          # Simulation preset configuration
├── index.php           # Main PHP page
└── README.md
```

## How the simulation works

The simulation uses separate GPU texture grids for velocity and dye. The solver combines:

- Semi-Lagrangian advection
- Manual bilinear texture sampling
- Vorticity confinement
- Divergence calculation
- Jacobi pressure iterations
- Pressure-gradient subtraction
- Dissipation-based velocity and dye fading

Balanced quality uses a 144-cell short side for velocity, a 640-cell short side for dye, and 16 pressure iterations. The **Light** and **High detail** options adjust the working resolution. Background tabs stop the animation loop to avoid unnecessary GPU usage.

Fluidly is an artistic two-dimensional approximation of incompressible flow. It is intended for interactive exploration rather than scientific measurement or validated computational fluid dynamics work.

## Browser testing

The browser test requires Chrome and Playwright. Start the PHP server at `http://127.0.0.1:8765`, then run:

```bash
node tests/browser.cjs
```

If Playwright is installed outside the default Node.js module path, set `PLAYWRIGHT_PATH` to its package directory before running the test.

The suite verifies:

- WebGL shader compilation and rendering
- Pointer drawing and simulation controls
- Light and dark themes
- Interface translations and saved preferences
- Fluid palette isolation during theme changes
- All rendering quality levels
- PNG export and fullscreen mode
- Responsive mobile layout
- Reduced-motion behavior
- Graphics-context loss and recovery
- Unsupported-device messaging

Generated screenshots and exported test images are written to `tests/artifacts/`.

## License

Add a license file before distributing or publishing the project under a specific open-source license.