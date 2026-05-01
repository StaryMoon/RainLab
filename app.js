const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const stage = document.getElementById("stage");
const splitHandle = document.getElementById("splitHandle");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const imageTitle = document.getElementById("imageTitle");

const controls = {
  rainAmount: document.getElementById("rainAmount"),
  streakLength: document.getElementById("streakLength"),
  windAngle: document.getElementById("windAngle"),
  haze: document.getElementById("haze"),
  derain: document.getElementById("derain")
};

const outputs = {
  rainAmount: document.getElementById("rainAmountValue"),
  streakLength: document.getElementById("streakLengthValue"),
  windAngle: document.getElementById("windAngleValue"),
  haze: document.getElementById("hazeValue"),
  derain: document.getElementById("derainValue")
};

const readout = {
  clarity: document.getElementById("clarityScore"),
  rainPixels: document.getElementById("rainPixels"),
  contrast: document.getElementById("contrastScore"),
  seed: document.getElementById("seedValue"),
  runtime: document.getElementById("runtimeValue"),
  recipe: document.getElementById("recipeText")
};

let sourceCanvas = document.createElement("canvas");
let sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
let rainyCanvas = document.createElement("canvas");
let rainyCtx = rainyCanvas.getContext("2d", { willReadFrequently: true });
let cleanCanvas = document.createElement("canvas");
let cleanCtx = cleanCanvas.getContext("2d", { willReadFrequently: true });
let split = 0.5;
let viewMode = "split";
let seed = 12891;
let lastRainPixels = 0;

function mulberry32(value) {
  return function random() {
    let t = (value += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function fitDimensions(width, height, maxWidth = 1200, maxHeight = 760) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(320, Math.round(width * scale)),
    height: Math.max(220, Math.round(height * scale))
  };
}

function resizeBuffers(width, height) {
  [canvas, sourceCanvas, rainyCanvas, cleanCanvas].forEach((item) => {
    item.width = width;
    item.height = height;
  });
}

function makeSample() {
  const width = 1200;
  const height = 760;
  resizeBuffers(width, height);

  const sky = sourceCtx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#dff3f7");
  sky.addColorStop(0.54, "#f8fbfb");
  sky.addColorStop(1, "#e4f0e8");
  sourceCtx.fillStyle = sky;
  sourceCtx.fillRect(0, 0, width, height);

  sourceCtx.fillStyle = "#dae8e0";
  sourceCtx.beginPath();
  sourceCtx.moveTo(0, 300);
  sourceCtx.bezierCurveTo(210, 160, 390, 260, 570, 190);
  sourceCtx.bezierCurveTo(780, 110, 980, 210, 1200, 138);
  sourceCtx.lineTo(1200, 420);
  sourceCtx.lineTo(0, 430);
  sourceCtx.closePath();
  sourceCtx.fill();

  for (let i = 0; i < 32; i += 1) {
    const x = i * 44 - 20;
    const y = 260 + Math.sin(i * 0.7) * 32;
    sourceCtx.fillStyle = i % 2 ? "#6fa66f" : "#57905f";
    sourceCtx.beginPath();
    sourceCtx.arc(x, y, 48 + (i % 5) * 7, 0, Math.PI * 2);
    sourceCtx.fill();
  }

  sourceCtx.fillStyle = "#9b6748";
  sourceCtx.fillRect(0, 444, width, 32);

  const water = sourceCtx.createLinearGradient(0, 470, 0, height);
  water.addColorStop(0, "#abc9c6");
  water.addColorStop(1, "#607f82");
  sourceCtx.fillStyle = water;
  sourceCtx.fillRect(0, 470, width, 290);

  sourceCtx.globalAlpha = 0.24;
  for (let y = 500; y < height; y += 22) {
    sourceCtx.strokeStyle = "#f7fbff";
    sourceCtx.beginPath();
    sourceCtx.moveTo(0, y);
    for (let x = 0; x < width; x += 60) {
      sourceCtx.lineTo(x, y + Math.sin(x * 0.02 + y * 0.03) * 5);
    }
    sourceCtx.stroke();
  }
  sourceCtx.globalAlpha = 1;

  sourceCtx.fillStyle = "#2f3f45";
  sourceCtx.fillRect(700, 300, 180, 190);
  sourceCtx.fillStyle = "#f4f0de";
  sourceCtx.fillRect(720, 322, 54, 60);
  sourceCtx.fillRect(792, 322, 54, 60);
  sourceCtx.fillStyle = "#bf4b3d";
  sourceCtx.beginPath();
  sourceCtx.moveTo(675, 300);
  sourceCtx.lineTo(790, 224);
  sourceCtx.lineTo(905, 300);
  sourceCtx.closePath();
  sourceCtx.fill();

  sourceCtx.fillStyle = "#1d2a2d";
  sourceCtx.font = "700 54px Inter, sans-serif";
  sourceCtx.fillText("RainLab", 70, 120);
  sourceCtx.font = "500 26px Inter, sans-serif";
  sourceCtx.fillStyle = "#385158";
  sourceCtx.fillText("Browser derain playground", 74, 160);

  imageTitle.textContent = "PKU Lake Sample";
  seed = 12891;
  render();
}

function loadImage(file) {
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    const size = fitDimensions(image.naturalWidth, image.naturalHeight);
    resizeBuffers(size.width, size.height);
    sourceCtx.clearRect(0, 0, size.width, size.height);
    sourceCtx.drawImage(image, 0, 0, size.width, size.height);
    imageTitle.textContent = file.name.replace(/\.[^.]+$/, "");
    seed = Math.floor((file.size + image.naturalWidth * 31 + image.naturalHeight * 17) % 99999);
    URL.revokeObjectURL(url);
    render();
  };
  image.src = url;
}

function values() {
  return {
    rainAmount: Number(controls.rainAmount.value),
    streakLength: Number(controls.streakLength.value),
    windAngle: Number(controls.windAngle.value),
    haze: Number(controls.haze.value),
    derain: Number(controls.derain.value)
  };
}

function drawRainLayer(settings) {
  rainyCtx.clearRect(0, 0, rainyCanvas.width, rainyCanvas.height);
  rainyCtx.drawImage(sourceCanvas, 0, 0);

  const haze = settings.haze / 100;
  if (haze > 0) {
    rainyCtx.fillStyle = `rgba(225, 235, 238, ${haze * 0.72})`;
    rainyCtx.fillRect(0, 0, rainyCanvas.width, rainyCanvas.height);
  }

  const random = mulberry32(seed + settings.rainAmount * 131 + settings.windAngle * 17);
  const density = Math.round((settings.rainAmount / 100) * rainyCanvas.width * rainyCanvas.height / 1350);
  const angle = ((settings.windAngle - 90) * Math.PI) / 180;
  const dx = Math.cos(angle) * settings.streakLength;
  const dy = Math.sin(angle) * settings.streakLength;
  lastRainPixels = density;

  rainyCtx.save();
  rainyCtx.lineCap = "round";
  rainyCtx.globalCompositeOperation = "screen";
  for (let i = 0; i < density; i += 1) {
    const x = random() * rainyCanvas.width;
    const y = random() * rainyCanvas.height;
    const local = 0.38 + random() * 0.62;
    rainyCtx.strokeStyle = `rgba(218, 238, 246, ${0.18 + settings.rainAmount / 500})`;
    rainyCtx.lineWidth = 0.8 + random() * 1.2;
    rainyCtx.beginPath();
    rainyCtx.moveTo(x, y);
    rainyCtx.lineTo(x + dx * local, y + dy * local);
    rainyCtx.stroke();
  }
  rainyCtx.restore();
}

function derainPreview(settings) {
  const start = performance.now();
  const input = rainyCtx.getImageData(0, 0, rainyCanvas.width, rainyCanvas.height);
  const output = cleanCtx.createImageData(input.width, input.height);
  const src = input.data;
  const dst = output.data;
  const strength = settings.derain / 100;
  const hazeLift = settings.haze * 0.58 * strength;
  let contrastAccumulator = 0;

  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const index = (y * input.width + x) * 4;
      const prevY = Math.max(0, y - 1);
      const nextY = Math.min(input.height - 1, y + 1);
      const up = ((prevY * input.width + x) * 4);
      const down = ((nextY * input.width + x) * 4);

      const luminance = 0.2126 * src[index] + 0.7152 * src[index + 1] + 0.0722 * src[index + 2];
      const vertical = (
        (src[up] + src[up + 1] + src[up + 2] + src[down] + src[down + 1] + src[down + 2]) / 6
      );
      const streakLikelihood = clamp((luminance - vertical - 10) / 95, 0, 1);
      const attenuation = streakLikelihood * strength * 54;
      const contrast = 1 + strength * 0.12;

      for (let c = 0; c < 3; c += 1) {
        const dehazed = src[index + c] - hazeLift - attenuation;
        dst[index + c] = clamp((dehazed - 128) * contrast + 128);
      }
      dst[index + 3] = 255;
      contrastAccumulator += Math.abs(dst[index] - src[index]);
    }
  }

  cleanCtx.putImageData(output, 0, 0);
  return {
    runtime: Math.round(performance.now() - start),
    contrast: Math.round((contrastAccumulator / (input.width * input.height)) * 1.4)
  };
}

function paintComposite(stats) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (viewMode === "rainy") {
    ctx.drawImage(rainyCanvas, 0, 0);
    splitHandle.style.display = "none";
  } else if (viewMode === "cleaned") {
    ctx.drawImage(cleanCanvas, 0, 0);
    splitHandle.style.display = "none";
  } else {
    const splitX = Math.round(canvas.width * split);
    ctx.drawImage(rainyCanvas, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
    ctx.clip();
    ctx.drawImage(cleanCanvas, 0, 0);
    ctx.restore();
    splitHandle.style.display = "block";
    splitHandle.style.left = `${split * 100}%`;
  }

  const settings = values();
  const clarity = clamp(Math.round(94 - settings.rainAmount * 0.52 - settings.haze * 0.24 + settings.derain * 0.55), 0, 99);
  readout.clarity.textContent = String(clarity);
  readout.rainPixels.textContent = lastRainPixels > 1000 ? `${Math.round(lastRainPixels / 100) / 10}k` : String(lastRainPixels);
  readout.contrast.textContent = `+${stats.contrast}%`;
  readout.seed.textContent = `RL-${String(seed).padStart(4, "0").slice(-4)}`;
  readout.runtime.textContent = `${stats.runtime} ms`;
  readout.recipe.textContent = `Rain ${settings.rainAmount}, streak ${settings.streakLength}, angle ${settings.windAngle}, haze ${settings.haze}, derain ${settings.derain}.`;
}

function render() {
  Object.entries(controls).forEach(([key, input]) => {
    outputs[key].textContent = input.value;
  });
  drawRainLayer(values());
  paintComposite(derainPreview(values()));
}

function exportComparison() {
  const exportCanvas = document.createElement("canvas");
  const width = canvas.width;
  const height = canvas.height;
  exportCanvas.width = width;
  exportCanvas.height = height + 130;
  const exportCtx = exportCanvas.getContext("2d");

  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(rainyCanvas, 0, 0, width / 2, height, 0, 0, width / 2, height);
  exportCtx.drawImage(cleanCanvas, width / 2, 0, width / 2, height, width / 2, 0, width / 2, height);

  exportCtx.fillStyle = "rgba(16, 19, 23, 0.84)";
  exportCtx.fillRect(0, height, width, 130);
  exportCtx.fillStyle = "#ffffff";
  exportCtx.font = "700 38px Inter, sans-serif";
  exportCtx.fillText("RainLab comparison", 44, height + 56);
  exportCtx.font = "500 22px Inter, sans-serif";
  exportCtx.fillStyle = "#d7eef1";
  exportCtx.fillText(readout.recipe.textContent, 44, height + 94);
  exportCtx.fillStyle = "#ffffff";
  exportCtx.font = "700 24px Inter, sans-serif";
  exportCtx.fillText("Rainy", 36, 42);
  exportCtx.fillText("Cleaned", width / 2 + 36, 42);

  const link = document.createElement("a");
  link.download = "rainlab-comparison.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function copyRecipe() {
  const text = `RainLab recipe: ${readout.recipe.textContent} ${location.href}`;
  navigator.clipboard?.writeText(text);
  document.getElementById("copyRecipeBtn").textContent = "Copied";
  setTimeout(() => {
    document.getElementById("copyRecipeBtn").textContent = "Copy recipe";
  }, 1200);
}

Object.values(controls).forEach((input) => {
  input.addEventListener("input", render);
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    viewMode = button.dataset.view;
    render();
  });
});

stage.addEventListener("pointermove", (event) => {
  if (viewMode !== "split") return;
  const rect = stage.getBoundingClientRect();
  split = clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92);
  render();
});

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadImage(file);
});

["dragenter", "dragover"].forEach((type) => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((type) => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file?.type.startsWith("image/")) loadImage(file);
});

document.getElementById("randomizeBtn").addEventListener("click", () => {
  const random = mulberry32(Date.now() % 100000);
  controls.rainAmount.value = Math.round(25 + random() * 70);
  controls.streakLength.value = Math.round(18 + random() * 70);
  controls.windAngle.value = Math.round(-48 + random() * 96);
  controls.haze.value = Math.round(random() * 54);
  controls.derain.value = Math.round(42 + random() * 52);
  seed = Math.round(random() * 99999);
  render();
});

document.getElementById("sampleBtn").addEventListener("click", makeSample);
document.getElementById("downloadBtn").addEventListener("click", exportComparison);
document.getElementById("copyRecipeBtn").addEventListener("click", copyRecipe);

makeSample();
