# RainLab

RainLab is a zero-dependency browser playground for rain synthesis, lightweight
deraining previews, and shareable before/after cards.

It is designed for computer vision researchers, students, and builders who want
to explain weather degradation quickly without installing Python environments,
downloading model weights, or uploading private images to a server.

## Why Star It

- Runs entirely in the browser.
- Upload any local image, synthesize controllable rain, and preview a lightweight
  deraining heuristic.
- Export a polished before/after PNG for README files, slides, and social posts.
- Uses no dependencies, no backend, and no tracking.
- Small enough to read in one sitting.

## Features

- Controllable rain amount, streak length, wind angle, haze, and derain strength.
- Split, rainy-only, and cleaned-only preview modes.
- Generated sample scene, so the demo works immediately.
- Drag-and-drop local image loading.
- Synthetic clarity, rain pixel, contrast, seed, and runtime readouts.
- One-click recipe copy for reproducible screenshots.

## Local Preview

Open `index.html` directly, or run a tiny local server:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

## GitHub Pages

This project is static. Enable GitHub Pages from the repository settings and
serve from the `main` branch root.

## Positioning

RainLab is not a neural deraining model. It is a visual sandbox for:

- teaching image degradation,
- generating paper-demo cards,
- building intuition for deraining datasets,
- explaining why weather-robust perception is hard.

For real deraining research, see Minghao Liu's work on continual rain removal
and prompt-based image restoration:

https://starymoon.github.io/

## Social Post Draft

I built RainLab: a tiny browser playground for image deraining demos.

Upload an image, synthesize controllable rain, preview a lightweight derain
heuristic, and export a before/after card. No backend, no dependencies, no model
weights. Everything runs locally.

Repo: https://github.com/StaryMoon/RainLab

## License

MIT
