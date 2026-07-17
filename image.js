/* image.js — Image tab: upload, controls, convert, all draw + render helpers, utils
 * Part of Empty Wall. Classic script (shared global scope) — load order in index.html.
 */
// --- Image Tab Functions ---

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').style.borderColor = 'var(--primary)';
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').style.borderColor = '';
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    loadImage(e.dataTransfer.files[0]);
  }
}

function handleImageUpload(e) {
  if (e.target.files && e.target.files[0]) {
    loadImage(e.target.files[0]);
  }
}

function loadImage(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please upload a valid image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.image.currentImage = img;
      document.getElementById('uploadPlaceholder').style.display = 'none';
      // Preset-first flow: surface the one-click looks and render a good
      // default immediately so the user sees a finished result on upload.
      renderLookPicker();
      applyLook(LOOK_PRESETS[0], { silent: true });
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Show original uploaded image as preview
function showOriginalPreview(img) {
  const canvas = document.getElementById('wallpaperCanvas');
  const ctx = canvas.getContext('2d');
  const width = state.image.deviceWidth;
  const height = state.image.deviceHeight;

  canvas.width = width;
  canvas.height = height;

  // Draw image to fit canvas
  const source = getCoverSourceRect(img, width, height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, source.x, source.y, source.width, source.height, 0, 0, width, height);

  canvas.style.display = 'block';
  document.getElementById('imgAsciiOutput').style.display = 'none';
  document.getElementById('imgMetaLines').textContent = 'original preview';
  document.getElementById('imgMetaCols').textContent = `${width}×${height}`;
}

function updateImgWidth(val) {
  document.getElementById('imgWidthVal').textContent = val;
  state.image.width = parseInt(val);
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateDevice(value) {
  const [width, height] = value.split('x').map(Number);
  state.image.deviceWidth = width;
  state.image.deviceHeight = height;
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateImgContrast(val) {
  state.image.contrast = parseFloat(val);
  document.getElementById('imgContrastVal').textContent = state.image.contrast.toFixed(1);
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateSaturation(value) {
  state.image.saturation = parseFloat(value);
  document.getElementById('saturationVal').textContent = state.image.saturation.toFixed(1);
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function updateWarmth(value) {
  state.image.warmth = parseInt(value, 10);
  document.getElementById('warmthVal').textContent = state.image.warmth;
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function updateEdgeBoost(val) {
  state.image.edgeBoost = parseFloat(val);
  document.getElementById('edgeBoostVal').textContent = state.image.edgeBoost.toFixed(1);
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateWallpaperStyle(value) {
  state.image.wallpaperStyle = value;
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateArtType(value) {
  state.image.artType = value;
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateMovement(value) {
  state.image.movement = value;
  applyMovementPreset(value);
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateFunkyMode(value) {
  state.image.funkyMode = value;
  applyFunkyPreset(value);
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function updateChaos(value) {
  state.image.chaos = parseInt(value, 10);
  document.getElementById('chaosVal').textContent = state.image.chaos;
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function applyFunkyPreset(value) {
  const presets = {
    vhs: { artType: 'duotone', wallpaperStyle: 'terminal', texture: 'film', saturation: 0.8, warmth: -10, chaos: 35 },
    acid: { artType: 'halftone', wallpaperStyle: 'amber', texture: 'clean', saturation: 1.8, warmth: 18, chaos: 60 },
    vaporwave: { artType: 'poster', wallpaperStyle: 'terminal', texture: 'grid', saturation: 1.6, warmth: -18, chaos: 45 },
    comic: { artType: 'halftone', wallpaperStyle: 'wired', texture: 'clean', saturation: 1.4, warmth: 8, chaos: 25 },
    chrome: { artType: 'lowpoly', wallpaperStyle: 'blueprint', texture: 'clean', saturation: 1.2, warmth: -8, chaos: 35 },
    cyberpunk: { artType: 'neon', wallpaperStyle: 'terminal', texture: 'film', saturation: 1.7, warmth: -22, chaos: 55 },
  };
  const preset = presets[value];
  if (!preset) return;

  Object.assign(state.image, preset);
  syncWallpaperControls();
}

function applyMovementPreset(value) {
  const presets = {
    impressionism: { artType: 'watercolor', wallpaperStyle: 'ink', contrast: 1.25, edgeBoost: 0.7, texture: 'paper' },
    cubism: { artType: 'lowpoly', wallpaperStyle: 'amber', contrast: 2.1, edgeBoost: 2.4, texture: 'clean' },
    bauhaus: { artType: 'blocks', wallpaperStyle: 'wired', contrast: 2.4, edgeBoost: 1.5, texture: 'grid' },
    pop: { artType: 'popart', wallpaperStyle: 'amber', contrast: 2.6, edgeBoost: 1.2, texture: 'clean' },
    surrealism: { artType: 'abstract', wallpaperStyle: 'ink', contrast: 1.45, edgeBoost: 2.2, texture: 'film' },
    opart: { artType: 'contour', wallpaperStyle: 'wired', contrast: 2.8, edgeBoost: 3.0, texture: 'clean' },
    ukiyoe: { artType: 'line', wallpaperStyle: 'ink', contrast: 1.7, edgeBoost: 2.6, texture: 'paper' },
    artdeco: { artType: 'blueprintArt', wallpaperStyle: 'amber', contrast: 2.1, edgeBoost: 2.0, texture: 'clean' },
    brutalism: { artType: 'cutpaper', wallpaperStyle: 'blueprint', contrast: 2.8, edgeBoost: 1.8, texture: 'grid' },
    glitch: { artType: 'neon', wallpaperStyle: 'terminal', contrast: 2.2, edgeBoost: 2.8, texture: 'film' },
  };
  const preset = presets[value];
  if (!preset) return;

  state.image.artType = preset.artType;
  state.image.wallpaperStyle = preset.wallpaperStyle;
  state.image.contrast = preset.contrast;
  state.image.edgeBoost = preset.edgeBoost;
  state.image.texture = preset.texture;

  document.getElementById('artTypeSelect').value = preset.artType;
  document.getElementById('wallpaperStyle').value = preset.wallpaperStyle;
  document.getElementById('imgContrast').value = preset.contrast;
  document.getElementById('imgContrastVal').textContent = preset.contrast.toFixed(1);
  document.getElementById('edgeBoost').value = preset.edgeBoost;
  document.getElementById('edgeBoostVal').textContent = preset.edgeBoost.toFixed(1);
  document.getElementById('textureSelect').value = preset.texture;
}

function updateComposition(value) {
  state.image.composition = value;
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateTexture(value) {
  state.image.texture = value;
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateMargin(value) {
  state.image.margin = parseInt(value, 10);
  document.getElementById('marginVal').textContent = state.image.margin;
  saveSettings();
  if (state.image.currentImage) {
    convertImage();
  }
}

function updateZoom(value) {
  state.image.zoom = parseFloat(value);
  document.getElementById('zoomVal').textContent = state.image.zoom.toFixed(1);
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function updatePanX(value) {
  state.image.panX = parseInt(value, 10);
  document.getElementById('panXVal').textContent = state.image.panX;
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function updatePanY(value) {
  state.image.panY = parseInt(value, 10);
  document.getElementById('panYVal').textContent = state.image.panY;
  saveSettings();
  if (state.image.currentImage) convertImage();
}

function selectImgColor(btn, colorClass) {
  document.querySelectorAll('#imgColorPalette .color-swatch').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.image.color = colorClass;
  if (state.image.currentImage) convertImage();
}

// Callbacks awaiting the next completed render (see renderAndWait).
let renderDoneResolvers = [];

/**
 * Re-renders the wallpaper at a target device resolution and resolves once the
 * worker finishes, so callers (like Publish) can capture a full-res canvas.
 * Restores the previous device size afterwards unless keepDevice is true.
 */
function renderAndWait(width, height, keepDevice) {
  return new Promise(resolve => {
    if (!state.image.currentImage) { resolve(); return; }
    const prevW = state.image.deviceWidth;
    const prevH = state.image.deviceHeight;
    const restore = !keepDevice && (prevW !== width || prevH !== height);
    state.image.deviceWidth = width;
    state.image.deviceHeight = height;
    renderDoneResolvers.push(() => {
      if (restore) {
        state.image.deviceWidth = prevW;
        state.image.deviceHeight = prevH;
      }
      resolve();
    });
    convertImage();
  });
}

function convertImage() {
  if (!state.image.currentImage) return;

  const img = state.image.currentImage;
  const canvas = document.getElementById('hiddenCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const width = state.image.width;
  const wallpaperRatio = state.image.deviceHeight / state.image.deviceWidth;
  const height = Math.max(20, Math.floor(width * wallpaperRatio * 0.46));

  canvas.width = width;
  canvas.height = height;

  const source = getCoverSourceRect(img, state.image.deviceWidth, state.image.deviceHeight);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  if (state.image.composition === 'fit') {
    const target = getContainTargetRect(img, width, height);
    ctx.drawImage(img, 0, 0, img.width, img.height, target.x, target.y, target.width, target.height);
  } else {
    ctx.drawImage(img, source.x, source.y, source.width, source.height, 0, 0, width, height);
  }
  const imgData = ctx.getImageData(0, 0, width, height);

  // Terminate running worker if a new job starts (Debouncing rapid slider changes)
  if (imageWorker) imageWorker.terminate();
  imageWorker = new Worker('worker.js');

  // Force UI to show loading immediately
  showImgLoading(true);

  imageWorker.onmessage = function (e) {
    const { processedData, brightnessMap, magnitude, direction, asciiArt, coloredHtml, options } = e.data;

    // Put the processed pixels back (applies saturation/warmth visually to canvas)
    const newImgData = new ImageData(new Uint8ClampedArray(processedData), width, height);
    ctx.putImageData(newImgData, 0, 0);

    const bMap = new Float32Array(brightnessMap);
    const edgeMap = {
      magnitude: new Float32Array(magnitude),
      direction: new Float32Array(direction)
    };

    if (options.isGraphic) {
      renderGraphicWallpaperCanvas({ data: newImgData.data, cols: width, rows: height, brightnessMap: bMap, edgeMap });
      document.getElementById('imgAsciiOutput').textContent = '';
      document.getElementById('imgMetaLines').textContent = `${options.artType} render`;
    } else {
      const outputEl = document.getElementById('imgAsciiOutput');
      if (options.colorMode) {
        outputEl.innerHTML = coloredHtml;
        outputEl.className = 'ascii-output img-ascii';
      } else {
        outputEl.textContent = asciiArt;
        outputEl.className = 'ascii-output img-ascii ' + state.image.color;
      }
      renderWallpaperCanvas(asciiArt, width, height);
      document.getElementById('imgMetaLines').textContent = `${height} lines`;
    }

    document.getElementById('imgMetaCols').textContent = `${state.image.deviceWidth}×${state.image.deviceHeight}`;
    showImgLoading(false);
    // showImgLoading() hides the canvas (it doubles as the spinner target); reveal
    // the freshly-rendered wallpaper now that the job is done.
    document.getElementById('wallpaperCanvas').style.display = 'block';
    updateSafeZoneOverlay();
    // Resolve any renderAndWait() promises waiting on this render (e.g. publish).
    const resolvers = renderDoneResolvers;
    renderDoneResolvers = [];
    resolvers.forEach(fn => fn());
  };

  const workerOptions = {
    artType: state.image.artType,
    charsetName: document.getElementById('imgCharset').value,
    manualInvert: document.getElementById('invertToggle').checked,
    autoDark: document.getElementById('autoDarkToggle').checked,
    colorMode: document.getElementById('colorModeToggle').checked,
    contrast: parseFloat(document.getElementById('imgContrast').value),
    saturation: state.image.saturation,
    warmth: state.image.warmth,
    edgeBoost: state.image.edgeBoost,
    isGraphic: isGraphicArtType(state.image.artType)
  };

  // Send data to background worker using zero-copy Transferable Objects for speed
  imageWorker.postMessage({
    data: imgData.data.buffer,
    width,
    height,
    options: workerOptions
  }, [imgData.data.buffer]);
}

function applyColorGrade(data) {
  const saturation = state.image.saturation;
  const warmth = state.image.warmth;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + warmth;
    let g = data[i + 1];
    let b = data[i + 2] - warmth;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    data[i] = clamp(luma + (r - luma) * saturation, 0, 255);
    data[i + 1] = clamp(luma + (g - luma) * saturation, 0, 255);
    data[i + 2] = clamp(luma + (b - luma) * saturation, 0, 255);
  }
}

function getCoverSourceRect(img, targetWidth, targetHeight) {
  if (state.image.composition === 'fit') {
    return {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    };
  }

  const targetRatio = targetWidth / targetHeight;
  const imageRatio = img.width / img.height;

  if (imageRatio > targetRatio) {
    let width = img.height * targetRatio / state.image.zoom;
    let height = img.height / state.image.zoom;
    width = Math.min(width, img.width);
    height = Math.min(height, img.height);
    const maxX = img.width - width;
    const maxY = img.height - height;
    const x = getFocusOffset(maxX, state.image.composition, 'x');
    const y = getFocusOffset(maxY, state.image.composition, 'y');
    return {
      x: clamp(x + (state.image.panX / 100) * maxX * 0.5, 0, maxX),
      y: clamp(y + (state.image.panY / 100) * maxY * 0.5, 0, maxY),
      width,
      height,
    };
  }

  let height = img.width / targetRatio / state.image.zoom;
  let width = img.width / state.image.zoom;
  width = Math.min(width, img.width);
  height = Math.min(height, img.height);
  const maxX = img.width - width;
  const maxY = img.height - height;
  const x = getFocusOffset(maxX, state.image.composition, 'x');
  const y = getFocusOffset(maxY, state.image.composition, 'y');
  return {
    x: clamp(x + (state.image.panX / 100) * maxX * 0.5, 0, maxX),
    y: clamp(y + (state.image.panY / 100) * maxY * 0.5, 0, maxY),
    width,
    height,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getContainTargetRect(img, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
  const width = img.width * scale;
  const height = img.height * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

function getFocusOffset(maxOffset, composition, axis) {
  if (axis === 'x' && composition === 'left') return 0;
  if (axis === 'x' && composition === 'right') return maxOffset;
  if (axis === 'y' && composition === 'top') return 0;
  if (axis === 'y' && composition === 'bottom') return maxOffset;
  return maxOffset / 2;
}

function buildBrightnessMap(data, width, height) {
  const brightness = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    brightness[p] = data[i + 3] === 0
      ? 255
      : 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return brightness;
}

function buildEdgeMap(brightness, width, height) {
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -brightness[i - width - 1] + brightness[i - width + 1] +
        -2 * brightness[i - 1] + 2 * brightness[i + 1] +
        -brightness[i + width - 1] + brightness[i + width + 1];
      const gy =
        -brightness[i - width - 1] - 2 * brightness[i - width] - brightness[i - width + 1] +
        brightness[i + width - 1] + 2 * brightness[i + width] + brightness[i + width + 1];
      magnitude[i] = Math.min(255, Math.hypot(gx, gy));
      direction[i] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, direction };
}

function getArtCharset(artType, charsetName) {
  if (artType === 'braille') return '⣿⣾⣷⣯⣟⡿⣶⣤⣀ ';
  if (artType === 'blocks') return '█▓▒░ ';
  if (artType === 'dots') return '●•·. ';
  if (artType === 'line') return '#/\\|_-:. ';
  return CHARSETS[charsetName] || CHARSETS.detailed;
}

function isGraphicArtType(artType) {
  return [
    'halftone',
    'mosaic',
    'contour',
    'lowpoly',
    'poster',
    'abstract',
    'watercolor',
    'cutpaper',
    'neon',
    'blueprintArt',
    'inksketch',
    'oilpaint',
    'stainedglass',
    'pixelart',
    'duotone',
    'risograph',
    'pencil',
    'crosshatch',
    'dither',
    'popart',
    'pointillism',
    'engraving',
    'cybermatrix',
  ].includes(artType);
}

function getArtChar({ brightness, edge, direction, charset, invert }) {
  if (state.image.artType === 'line') {
    if (edge < 58) return brightness < 82 ? '.' : ' ';
    return getLineChar(direction);
  }

  let charIdx = Math.floor(((brightness - edge) / 255) * (charset.length - 1));
  charIdx = Math.max(0, Math.min(charset.length - 1, charIdx));

  if (invert) {
    charIdx = (charset.length - 1) - charIdx;
  }

  return charset[charIdx] || ' ';
}

function getLineChar(direction) {
  const angle = Math.abs(direction);
  if (angle < Math.PI / 8 || angle > Math.PI * 7 / 8) return '|';
  if (angle < Math.PI * 3 / 8) return '/';
  if (angle < Math.PI * 5 / 8) return '_';
  return '\\';
}

function renderWallpaperCanvas(asciiArt, cols, rows) {
  const canvas = document.getElementById('wallpaperCanvas');
  const ctx = canvas.getContext('2d');
  const renderWidth = state.image.deviceWidth;
  const renderHeight = state.image.deviceHeight;
  const lines = asciiArt.trimEnd().split('\n');
  const marginX = Math.round(renderWidth * (state.image.margin / 100));
  const marginY = Math.round(renderHeight * (state.image.margin / 100));
  const artWidth = renderWidth - marginX * 2;
  const artHeight = renderHeight - marginY * 2;
  const cellW = artWidth / cols;
  const cellH = artHeight / rows;
  const fontSize = Math.max(4, cellH * 1.25);
  const palette = getWallpaperPalette();

  canvas.width = renderWidth;
  canvas.height = renderHeight;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, renderWidth, renderHeight);
  ctx.font = `${fontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.textBaseline = 'top';
  ctx.globalAlpha = palette.paperAlpha;

  drawWallpaperTexture(ctx, renderWidth, renderHeight, palette);

  lines.forEach((line, rowIndex) => {
    for (let colIndex = 0; colIndex < line.length; colIndex++) {
      const char = line[colIndex];
      if (char === ' ') continue;
      ctx.fillStyle = getWallpaperInk(char, palette);
      ctx.fillText(char, marginX + colIndex * cellW, marginY + rowIndex * cellH);
    }
  });
  drawMovementOverlay(ctx, renderWidth, renderHeight, palette);
  drawFunkyOverlay(ctx, renderWidth, renderHeight, palette);
  drawWallpaperFrame(ctx, renderWidth, renderHeight, palette, marginX, marginY);
  ctx.globalAlpha = 1;
}

function renderGraphicWallpaperCanvas({ data, cols, rows, brightnessMap, edgeMap }) {
  const canvas = document.getElementById('wallpaperCanvas');
  const ctx = canvas.getContext('2d');
  const width = state.image.deviceWidth;
  const height = state.image.deviceHeight;
  const marginX = Math.round(width * (state.image.margin / 100));
  const marginY = Math.round(height * (state.image.margin / 100));
  const artWidth = width - marginX * 2;
  const artHeight = height - marginY * 2;
  const cellW = artWidth / cols;
  const cellH = artHeight / rows;
  const palette = getWallpaperPalette();

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  drawWallpaperTexture(ctx, width, height, palette);

  if (state.image.artType === 'halftone') {
    drawHalftone(ctx, data, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'mosaic') {
    drawMosaic(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'contour') {
    drawContour(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'lowpoly') {
    drawLowPoly(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'poster') {
    drawPosterPaint(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'abstract') {
    drawAbstractField(ctx, data, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'watercolor') {
    drawWatercolor(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'cutpaper') {
    drawCutPaper(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'neon') {
    drawNeonGlow(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'blueprintArt') {
    drawBlueprintLines(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'inksketch') {
    drawInkSketch(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'oilpaint') {
    drawOilPaint(ctx, data, cols, rows, marginX, marginY, cellW, cellH);
  } else if (state.image.artType === 'stainedglass') {
    drawStainedGlass(ctx, data, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH);
  } else if (state.image.artType === 'pixelart') {
    drawPixelArt(ctx, data, cols, rows, marginX, marginY, cellW, cellH);
  } else if (state.image.artType === 'duotone') {
    drawDuotone(ctx, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'risograph') {
    drawRisograph(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH);
  } else if (state.image.artType === 'pencil') {
    drawPencil(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'crosshatch') {
    drawCrosshatch(ctx, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'dither') {
    drawDither(ctx, data, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'popart') {
    drawPopArt(ctx, data, cols, rows, marginX, marginY, cellW, cellH);
  } else if (state.image.artType === 'pointillism') {
    drawPointillism(ctx, data, cols, rows, marginX, marginY, cellW, cellH);
  } else if (state.image.artType === 'engraving') {
    drawEngraving(ctx, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  } else if (state.image.artType === 'cybermatrix') {
    drawCyberMatrix(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH);
  }

  drawMovementOverlay(ctx, width, height, palette);
  drawFunkyOverlay(ctx, width, height, palette);
  drawWallpaperFrame(ctx, width, height, palette, marginX, marginY);
}

function drawHalftone(ctx, data, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const step = Math.max(2, Math.round(cols / 150));
  ctx.fillStyle = palette.ink;
  for (let y = 0; y < rows; y += step) {
    for (let x = 0; x < cols; x += step) {
      const offset = (y * cols + x) * 4;
      const brightness = data[offset + 3] === 0 ? 255 : 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      const darkness = 1 - brightness / 255;
      if (darkness < 0.04) continue;
      const radius = Math.min(cellW, cellH) * step * darkness * 0.62;
      ctx.beginPath();
      ctx.arc(marginX + x * cellW, marginY + y * cellH, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMosaic(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const tile = Math.max(3, Math.round(cols / 90));
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      ctx.fillStyle = getPosterColor(data, x, y, cols, 5);
      ctx.fillRect(marginX + x * cellW, marginY + y * cellH, cellW * tile + 0.5, cellH * tile + 0.5);
    }
  }
}

function drawContour(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(1, Math.min(cellW, cellH) * 0.7);
  const step = Math.max(1, Math.round(cols / 190));
  for (let y = 1; y < rows - 1; y += step) {
    for (let x = 1; x < cols - 1; x += step) {
      const i = y * cols + x;
      const edge = edgeMap.magnitude[i] * state.image.edgeBoost;
      const brightness = brightnessMap[i];
      const isContour = Math.abs((brightness % 42) - 21) < 2.5;
      if (edge < 72 && !isContour) continue;
      const direction = edgeMap.direction[i] + Math.PI / 2;
      const length = Math.min(cellW, cellH) * (isContour ? 1.4 : 1);
      const cx = marginX + x * cellW;
      const cy = marginY + y * cellH;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(direction) * length, cy - Math.sin(direction) * length);
      ctx.lineTo(cx + Math.cos(direction) * length, cy + Math.sin(direction) * length);
      ctx.stroke();
    }
  }
}

function drawLowPoly(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const tile = Math.max(6, Math.round(cols / 42));
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      const px = marginX + x * cellW;
      const py = marginY + y * cellH;
      const w = cellW * tile;
      const h = cellH * tile;

      ctx.fillStyle = getPosterColor(data, x, y, cols, 4);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + w, py);
      ctx.lineTo(px, py + h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = getPosterColor(data, Math.min(cols - 1, x + tile - 1), Math.min(rows - 1, y + tile - 1), cols, 4);
      ctx.beginPath();
      ctx.moveTo(px + w, py);
      ctx.lineTo(px + w, py + h);
      ctx.lineTo(px, py + h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawPosterPaint(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const tile = Math.max(4, Math.round(cols / 70));
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      ctx.fillStyle = getPosterColor(data, x, y, cols, 4);
      fillRoundedRect(
        ctx,
        marginX + x * cellW,
        marginY + y * cellH,
        cellW * tile + 1,
        cellH * tile + 1,
        Math.max(1, cellW * 0.8),
      );
    }
  }
}

function fillRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }

  ctx.fillRect(x, y, width, height);
}

function posterize(value, levels) {
  const step = 255 / (levels - 1);
  return Math.round(value / step) * step;
}

function getPosterColor(data, x, y, cols, levels = 5, alpha = 1) {
  const offset = (y * cols + x) * 4;
  const a = data[offset + 3] / 255;
  if (!a) return `rgba(255,255,255,${alpha})`;

  const r = posterize(data[offset], levels);
  const g = posterize(data[offset + 1], levels);
  const b = posterize(data[offset + 2], levels);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shadeFromBrightness(brightness, palette) {
  if (brightness > 220) return palette.background;
  if (brightness > 160) return palette.soft;
  if (brightness > 90) return palette.mid;
  return palette.ink;
}

function drawAbstractField(ctx, data, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const bands = 18;
  ctx.globalAlpha = 0.72;
  for (let i = 0; i < bands; i++) {
    const y = Math.floor((i / bands) * rows);
    ctx.fillStyle = getPosterColor(data, Math.floor(cols / 2), y, cols, 5, 0.72);
    ctx.beginPath();
    ctx.moveTo(marginX, marginY + y * cellH);
    for (let x = 0; x <= cols; x += Math.max(4, Math.floor(cols / 28))) {
      const index = Math.min(rows - 1, y) * cols + Math.min(cols - 1, x);
      const wobble = (edgeMap.magnitude[index] || 0) * cellH * 0.04;
      ctx.lineTo(marginX + x * cellW, marginY + y * cellH + Math.sin(x * 0.15 + i) * 30 + wobble);
    }
    ctx.lineTo(marginX + cols * cellW, marginY + rows * cellH);
    ctx.lineTo(marginX, marginY + rows * cellH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWatercolor(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    ctx.fillStyle = getPosterColor(data, x, y, cols, 6, 0.34);
    ctx.beginPath();
    ctx.ellipse(
      marginX + x * cellW,
      marginY + y * cellH,
      Math.random() * cellW * 18 + cellW * 3,
      Math.random() * cellH * 10 + cellH * 2,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCutPaper(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const tile = Math.max(8, Math.round(cols / 34));
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = Math.max(4, cellW * 3);
  ctx.shadowOffsetX = Math.max(2, cellW * 1.5);
  ctx.shadowOffsetY = Math.max(2, cellH * 1.5);

  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      const brightness = brightnessMap[y * cols + x] || 255;
      if (brightness > 235) continue;
      ctx.fillStyle = getPosterColor(data, x, y, cols, 4);
      ctx.beginPath();
      const px = marginX + x * cellW;
      const py = marginY + y * cellH;
      const w = cellW * tile;
      const h = cellH * tile;
      ctx.moveTo(px + Math.random() * w * 0.2, py);
      ctx.lineTo(px + w, py + Math.random() * h * 0.25);
      ctx.lineTo(px + w * (0.75 + Math.random() * 0.25), py + h);
      ctx.lineTo(px, py + h * (0.75 + Math.random() * 0.25));
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.shadowColor = 'transparent';
}

function drawNeonGlow(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.fillStyle = '#05060b';
  ctx.fillRect(0, 0, state.image.deviceWidth, state.image.deviceHeight);
  ctx.strokeStyle = palette.ink;
  ctx.shadowColor = palette.ink;
  ctx.shadowBlur = Math.max(8, state.image.deviceWidth / 120);
  ctx.lineWidth = Math.max(1, cellW * 0.8);
  drawEdgeStrokes(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, 100);
  ctx.shadowBlur = 0;
}

function drawBlueprintLines(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.fillStyle = '#061525';
  ctx.fillRect(0, 0, state.image.deviceWidth, state.image.deviceHeight);
  ctx.strokeStyle = '#b7ecff';
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = Math.max(1, cellW * 0.55);
  drawEdgeStrokes(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, 62);
  ctx.globalAlpha = 1;
}

function drawInkSketch(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.76;
  ctx.lineWidth = Math.max(1, cellW * 0.55);
  drawEdgeStrokes(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, 58);
  ctx.globalAlpha = 0.22;
  drawContour(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette);
  ctx.globalAlpha = 1;
}

function drawEdgeStrokes(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, threshold) {
  const step = Math.max(1, Math.round(cols / 210));
  for (let y = 1; y < rows - 1; y += step) {
    for (let x = 1; x < cols - 1; x += step) {
      const i = y * cols + x;
      const edge = edgeMap.magnitude[i] * state.image.edgeBoost;
      if (edge < threshold) continue;
      const direction = edgeMap.direction[i] + Math.PI / 2;
      const length = Math.min(cellW, cellH) * Math.min(2.5, edge / 80);
      const cx = marginX + x * cellW;
      const cy = marginY + y * cellH;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(direction) * length, cy - Math.sin(direction) * length);
      ctx.lineTo(cx + Math.cos(direction) * length, cy + Math.sin(direction) * length);
      ctx.stroke();
    }
  }
}

function drawOilPaint(ctx, data, cols, rows, marginX, marginY, cellW, cellH) {
  const strokes = Math.min(2600, cols * rows * 0.18);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < strokes; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    ctx.strokeStyle = getPosterColor(data, x, y, cols, 8, 0.72);
    ctx.lineWidth = Math.max(2, Math.random() * cellW * 5 + cellW);
    const px = marginX + x * cellW;
    const py = marginY + y * cellH;
    const angle = Math.random() * Math.PI;
    const len = Math.random() * cellW * 16 + cellW * 5;
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(angle) * len, py - Math.sin(angle) * len);
    ctx.quadraticCurveTo(px, py, px + Math.cos(angle) * len, py + Math.sin(angle) * len);
    ctx.stroke();
  }
}

function drawStainedGlass(ctx, data, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH) {
  drawLowPoly(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, getWallpaperPalette());
  ctx.strokeStyle = 'rgba(20,20,20,0.72)';
  ctx.lineWidth = Math.max(2, cellW * 1.2);
  drawEdgeStrokes(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, 44);
}

function drawPixelArt(ctx, data, cols, rows, marginX, marginY, cellW, cellH) {
  const tile = Math.max(5, Math.round(cols / 64));
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      ctx.fillStyle = getPosterColor(data, x, y, cols, 6);
      ctx.fillRect(marginX + x * cellW, marginY + y * cellH, cellW * tile + 1, cellH * tile + 1);
    }
  }
}

function drawDuotone(ctx, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const dark = palette.ink;
  const light = palette.background;
  const mid = palette.mid;
  const tile = Math.max(2, Math.round(cols / 160));
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      const brightness = adjustContrast(brightnessMap[y * cols + x] || 255, state.image.contrast);
      ctx.fillStyle = brightness < 88 ? dark : brightness < 172 ? mid : light;
      ctx.fillRect(marginX + x * cellW, marginY + y * cellH, cellW * tile + 1, cellH * tile + 1);
    }
  }
}

function drawRisograph(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH) {
  const tile = Math.max(3, Math.round(cols / 110));
  ctx.globalCompositeOperation = 'multiply';
  for (let pass = 0; pass < 3; pass++) {
    const color = ['#ff4f6d', '#00a6a6', '#f6c445'][pass];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.38;
    const dx = (pass - 1) * cellW * 2;
    const dy = (1 - pass) * cellH * 2;
    for (let y = 0; y < rows; y += tile) {
      for (let x = 0; x < cols; x += tile) {
        const offset = (y * cols + x) * 4;
        const channel = data[offset + pass];
        const dot = (255 - channel) / 255;
        if (dot < 0.12) continue;
        ctx.beginPath();
        ctx.arc(marginX + x * cellW + dx, marginY + y * cellH + dy, Math.min(cellW, cellH) * tile * dot * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawPencil(ctx, brightnessMap, edgeMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = Math.max(1, cellW * 0.45);
  drawEdgeStrokes(ctx, edgeMap, cols, rows, marginX, marginY, cellW, cellH, 42);

  const hatchStep = Math.max(3, Math.round(cols / 80));
  for (let y = 0; y < rows; y += hatchStep) {
    for (let x = 0; x < cols; x += hatchStep) {
      const brightness = brightnessMap[y * cols + x] || 255;
      if (brightness > 190) continue;
      const px = marginX + x * cellW;
      const py = marginY + y * cellH;
      const len = Math.min(cellW, cellH) * (255 - brightness) / 30;
      ctx.beginPath();
      ctx.moveTo(px - len, py + len);
      ctx.lineTo(px + len, py - len);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawCrosshatch(ctx, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.75;
  const step = Math.max(3, Math.round(cols / 140));
  ctx.lineWidth = Math.max(1, cellW * 0.5);

  for (let y = 0; y < rows; y += step) {
    for (let x = 0; x < cols; x += step) {
      const brightness = brightnessMap[y * cols + x] || 255;
      if (brightness > 240) continue;

      const px = marginX + x * cellW;
      const py = marginY + y * cellH;
      const len = Math.min(cellW, cellH) * step * 0.75;

      ctx.beginPath();
      if (brightness < 200) {
        ctx.moveTo(px - len, py - len);
        ctx.lineTo(px + len, py + len);
      }
      if (brightness < 140) {
        ctx.moveTo(px + len, py - len);
        ctx.lineTo(px - len, py + len);
      }
      if (brightness < 90) {
        ctx.moveTo(px, py - len);
        ctx.lineTo(px, py + len);
      }
      if (brightness < 45) {
        ctx.moveTo(px - len, py);
        ctx.lineTo(px + len, py);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawDither(ctx, data, cols, rows, marginX, marginY, cellW, cellH, palette) {
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const tile = Math.max(2, Math.round(cols / 180));
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      const offset = (y * cols + x) * 4;
      const brightness = data[offset + 3] === 0 ? 255 : 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      const threshold = (bayer[(Math.floor(y / tile)) % 4][(Math.floor(x / tile)) % 4] / 16) * 255;

      if (brightness < threshold) {
        ctx.fillStyle = getPosterColor(data, x, y, cols, 4);
        ctx.fillRect(marginX + x * cellW, marginY + y * cellH, cellW * tile + 0.5, cellH * tile + 0.5);
      }
    }
  }
}

function drawPopArt(ctx, data, cols, rows, marginX, marginY, cellW, cellH) {
  const tile = Math.max(4, Math.round(cols / 100));
  const colors = ['#000000', '#D9005B', '#00D9C0', '#FFEA00', '#ffffff'];
  for (let y = 0; y < rows; y += tile) {
    for (let x = 0; x < cols; x += tile) {
      const offset = (y * cols + x) * 4;
      let colorIdx = 4;
      if (data[offset + 3] > 0) {
        const brightness = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
        if (brightness < 45) colorIdx = 0;
        else if (brightness < 105) colorIdx = 1;
        else if (brightness < 165) colorIdx = 2;
        else if (brightness < 225) colorIdx = 3;
      }
      ctx.fillStyle = colors[colorIdx];
      ctx.fillRect(marginX + x * cellW, marginY + y * cellH, cellW * tile + 1, cellH * tile + 1);
    }
  }
}

function drawPointillism(ctx, data, cols, rows, marginX, marginY, cellW, cellH) {
  const step = Math.max(3, Math.round(cols / 110));
  for (let i = 0; i < 2; i++) { // Two passes for better density
    for (let y = 0; y < rows; y += step) {
      for (let x = 0; x < cols; x += step) {
        const jitterX = (Math.random() - 0.5) * step;
        const jitterY = (Math.random() - 0.5) * step;
        const px = Math.min(cols - 1, Math.max(0, Math.floor(x + jitterX)));
        const py = Math.min(rows - 1, Math.max(0, Math.floor(y + jitterY)));

        const offset = (py * cols + px) * 4;
        if (data[offset + 3] === 0) continue;

        ctx.fillStyle = `rgba(${data[offset]}, ${data[offset + 1]}, ${data[offset + 2]}, 0.9)`;
        const radius = (Math.random() * 0.6 + 0.3) * Math.min(cellW, cellH) * step;

        ctx.beginPath();
        ctx.arc(marginX + (x + jitterX) * cellW, marginY + (y + jitterY) * cellH, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawEngraving(ctx, brightnessMap, cols, rows, marginX, marginY, cellW, cellH, palette) {
  ctx.fillStyle = palette.ink;
  const stepY = Math.max(3, Math.round(rows / 110));
  const stepX = Math.max(2, Math.round(cols / 200));

  for (let y = 0; y < rows; y += stepY) {
    for (let x = 0; x < cols; x += stepX) {
      const brightness = brightnessMap[y * cols + x] || 255;
      const darkness = 1 - (brightness / 255);
      if (darkness < 0.08) continue;

      const wave = Math.sin(x * 0.12 + y * 0.05) * stepY * 0.45 * darkness;
      const h = Math.max(0.5, darkness * stepY * 0.85);

      ctx.fillRect(marginX + x * cellW, marginY + y * cellH + wave - h / 2, cellW * stepX + 0.5, h);
    }
  }
}

function drawCyberMatrix(ctx, data, brightnessMap, cols, rows, marginX, marginY, cellW, cellH) {
  const chars = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
  const step = Math.max(3, Math.round(cols / 120));
  ctx.font = `bold ${Math.max(6, cellH * step * 1.2)}px "IBM Plex Mono", monospace`;
  ctx.textBaseline = 'top';

  for (let x = 0; x < cols; x += step) {
    for (let y = 0; y < rows; y += step) {
      const brightness = brightnessMap[y * cols + x] || 255;
      if (brightness > 240) continue;

      const offset = (y * cols + x) * 4;
      const matrixG = Math.min(255, data[offset + 1] * 1.2 + 40); // Boost green

      ctx.fillStyle = `rgba(${data[offset] * 0.4}, ${matrixG}, ${data[offset + 2] * 0.4}, ${(255 - brightness) / 255})`;
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, marginX + x * cellW, marginY + y * cellH);
    }
  }
}

function getWallpaperPalette() {
  const palettes = {
    wired: { background: '#fbfbf8', soft: '#9a9a94', mid: '#686862', ink: '#20201d', paperAlpha: 1, grain: 'rgba(0,0,0,0.035)' },
    terminal: { background: '#07110b', soft: '#1d6b35', mid: '#36b85f', ink: '#b8ffd0', paperAlpha: 0.92, grain: 'rgba(184,255,208,0.04)' },
    blueprint: { background: '#071827', soft: '#315a73', mid: '#7bb4d0', ink: '#e4f7ff', paperAlpha: 0.94, grain: 'rgba(228,247,255,0.04)' },
    amber: { background: '#1d1308', soft: '#7f531b', mid: '#d3922e', ink: '#ffe0a3', paperAlpha: 0.94, grain: 'rgba(255,224,163,0.045)' },
    ink: { background: '#f2eee6', soft: '#b0aaa0', mid: '#625f59', ink: '#11100e', paperAlpha: 0.96, grain: 'rgba(0,0,0,0.045)' },
  };
  return palettes[state.image.wallpaperStyle] || palettes.wired;
}

function getWallpaperInk(char, palette) {
  if (char === '.' || char === ',' || char === '`' || char === "'") return palette.soft;
  if (char === ':' || char === ';' || char === '-' || char === '_') return palette.mid;
  return palette.ink;
}

function drawWallpaperTexture(ctx, width, height, palette) {
  ctx.save();
  if (state.image.texture === 'clean') {
    ctx.restore();
    return;
  }

  ctx.fillStyle = palette.grain;
  const dustCount = state.image.texture === 'film' ? 2200 : 900;
  for (let i = 0; i < dustCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = state.image.texture === 'film' ? Math.random() * 2.4 + 0.3 : Math.random() * 1.5 + 0.4;
    ctx.fillRect(x, y, size, size);
  }

  if (state.image.texture === 'grid') {
    ctx.strokeStyle = palette.grid || palette.grain;
    ctx.lineWidth = 1;
    const step = Math.max(32, Math.round(width / 32));
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawWallpaperFrame(ctx, width, height, palette, marginX, marginY) {
  if (state.image.margin < 2) return;

  ctx.save();
  ctx.strokeStyle = palette.soft;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, Math.round(width / 1200));
  ctx.strokeRect(marginX * 0.5, marginY * 0.5, width - marginX, height - marginY);
  ctx.restore();
}

function drawMovementOverlay(ctx, width, height, palette) {
  if (state.image.movement === 'none') return;

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = palette.mid;
  ctx.fillStyle = palette.soft;
  ctx.lineWidth = Math.max(2, Math.round(width / 700));

  if (state.image.movement === 'bauhaus' || state.image.movement === 'artdeco') {
    drawGeometricOverlay(ctx, width, height, palette);
  } else if (state.image.movement === 'cubism' || state.image.movement === 'brutalism') {
    drawAngularOverlay(ctx, width, height);
  } else if (state.image.movement === 'opart') {
    drawOpArtOverlay(ctx, width, height);
  } else if (state.image.movement === 'glitch') {
    drawGlitchOverlay(ctx, width, height, palette);
  } else if (state.image.movement === 'ukiyoe') {
    drawWaveOverlay(ctx, width, height);
  } else if (state.image.movement === 'pop' || state.image.movement === 'impressionism') {
    drawDotOverlay(ctx, width, height, palette);
  }

  ctx.restore();
}

function drawFunkyOverlay(ctx, width, height, palette) {
  const mode = state.image.funkyMode;
  const chaos = state.image.chaos / 100;
  if (mode === 'none' && chaos === 0) return;

  ctx.save();
  if (mode === 'vhs' || chaos > 0.2) drawScanlines(ctx, width, height, chaos);
  if (mode === 'acid') drawAcidOverlay(ctx, width, height, chaos);
  if (mode === 'vaporwave') drawVaporwaveOverlay(ctx, width, height, chaos);
  if (mode === 'comic') drawComicOverlay(ctx, width, height, chaos);
  if (mode === 'chrome') drawChromeOverlay(ctx, width, height, chaos);
  if (mode === 'cyberpunk') drawCyberpunkOverlay(ctx, width, height, chaos);
  if (chaos > 0.35) drawGlitchOverlay(ctx, width, height, palette);
  ctx.restore();
}

function drawScanlines(ctx, width, height, chaos) {
  ctx.globalAlpha = 0.12 + chaos * 0.22;
  ctx.fillStyle = '#000';
  const step = Math.max(3, Math.round(height / 220));
  for (let y = 0; y < height; y += step * 2) {
    ctx.fillRect(0, y, width, step);
  }
  ctx.globalAlpha = 1;
}

function drawAcidOverlay(ctx, width, height, chaos) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(255,0,128,0.26)');
  gradient.addColorStop(0.5, 'rgba(255,245,0,0.22)');
  gradient.addColorStop(1, 'rgba(0,255,180,0.24)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.18 + chaos * 0.18;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * width * 0.08 + width * 0.02, 0, Math.PI * 2);
    ctx.strokeStyle = i % 2 ? '#ff00aa' : '#00ffc8';
    ctx.lineWidth = Math.max(2, width / 600);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawVaporwaveOverlay(ctx, width, height, chaos) {
  const horizon = height * 0.62;
  ctx.strokeStyle = 'rgba(255,0,180,0.38)';
  ctx.lineWidth = Math.max(1, width / 900);
  for (let y = horizon; y < height; y += height * 0.035) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,220,255,0.35)';
  for (let x = 0; x < width; x += width * 0.06) {
    ctx.beginPath();
    ctx.moveTo(width / 2, horizon);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawComicOverlay(ctx, width, height, chaos) {
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = Math.max(4, width / 220);
  ctx.strokeRect(width * 0.035, height * 0.045, width * 0.93, height * 0.91);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  fillRoundedRect(ctx, width * 0.06, height * 0.07, width * 0.22, height * 0.11, width * 0.02);
  ctx.strokeRect(width * 0.06, height * 0.07, width * 0.22, height * 0.11);
}

function drawChromeOverlay(ctx, width, height, chaos) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.34)');
  gradient.addColorStop(0.55, 'rgba(90,180,255,0.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawCyberpunkOverlay(ctx, width, height, chaos) {
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,0,150,0.18)';
  ctx.fillRect(0, 0, width * 0.5, height);
  ctx.fillStyle = 'rgba(0,220,255,0.18)';
  ctx.fillRect(width * 0.5, 0, width * 0.5, height);
  ctx.globalCompositeOperation = 'source-over';
}

function drawGeometricOverlay(ctx, width, height, palette) {
  ctx.strokeStyle = palette.mid;
  ctx.strokeRect(width * 0.06, height * 0.08, width * 0.2, height * 0.2);
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.18, width * 0.055, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.76, height * 0.82);
  ctx.lineTo(width * 0.92, height * 0.82);
  ctx.lineTo(width * 0.84, height * 0.66);
  ctx.closePath();
  ctx.stroke();
}

function drawAngularOverlay(ctx, width, height) {
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }
}

function drawOpArtOverlay(ctx, width, height) {
  const cx = width * 0.5;
  const cy = height * 0.5;
  for (let r = width * 0.05; r < width * 0.55; r += width * 0.045) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGlitchOverlay(ctx, width, height, palette) {
  ctx.fillStyle = palette.mid;
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(Math.random() * width, Math.random() * height, Math.random() * width * 0.22, Math.random() * 5 + 2);
  }
}

function drawWaveOverlay(ctx, width, height) {
  for (let y = height * 0.18; y < height; y += height * 0.08) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += width * 0.02) {
      const wave = Math.sin(x / width * Math.PI * 6 + y * 0.01) * height * 0.018;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function drawDotOverlay(ctx, width, height, palette) {
  ctx.fillStyle = palette.mid;
  const step = width * 0.035;
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      if ((x + y) % (step * 3) < step) {
        ctx.beginPath();
        ctx.arc(x, y, step * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function randomizeWallpaper() {
  const artTypes = ['watercolor', 'poster', 'lowpoly', 'duotone', 'risograph', 'oilpaint', 'stainedglass', 'pencil', 'abstract', 'crosshatch', 'dither', 'popart', 'pointillism', 'engraving', 'cybermatrix'];
  const styles = ['wired', 'terminal', 'blueprint', 'amber', 'ink'];
  const textures = ['paper', 'grid', 'clean', 'film'];
  const compositions = ['center', 'left', 'right', 'top', 'bottom'];
  const funkyModes = ['none', 'vhs', 'acid', 'vaporwave', 'comic', 'chrome', 'cyberpunk'];

  state.image.artType = pickRandom(artTypes);
  state.image.wallpaperStyle = pickRandom(styles);
  state.image.texture = pickRandom(textures);
  state.image.composition = pickRandom(compositions);
  state.image.funkyMode = pickRandom(funkyModes);
  state.image.contrast = randomBetween(1.1, 2.8);
  state.image.edgeBoost = randomBetween(0.4, 2.8);
  state.image.margin = Math.round(randomBetween(0, 10));
  state.image.chaos = Math.round(randomBetween(0, 70));

  syncWallpaperControls();
  if (state.image.currentImage) convertImage();
}

function toggleSafeZones() {
  state.image.showSafeZones = document.getElementById('safeZoneToggle').checked;
  updateSafeZoneOverlay();
}

function toggleLivePreview() {
  state.image.livePreview = document.getElementById('livePreviewToggle').checked;
  document.getElementById('imgOutputContainer').classList.toggle('live-preview', state.image.livePreview);
}

function updateSafeZoneOverlay() {
  const overlay = document.getElementById('safeZoneOverlay');
  const canvas = document.getElementById('wallpaperCanvas');
  if (!state.image.showSafeZones || canvas.style.display === 'none') {
    overlay.style.display = 'none';
    return;
  }

  const isPortrait = state.image.deviceHeight > state.image.deviceWidth;
  overlay.style.display = 'block';
  overlay.innerHTML = isPortrait
    ? '<div class="safe-clock"></div><div class="safe-bottom"></div>'
    : '<div class="safe-desktop-left"></div><div class="safe-desktop-dock"></div>';
}

function exportWallpaperPack() {
  if (!state.image.currentImage) {
    showToast('Upload an image first', 'error');
    return;
  }

  const original = {
    deviceWidth: state.image.deviceWidth,
    deviceHeight: state.image.deviceHeight,
    width: state.image.width,
  };
  const pack = [
    { name: 'desktop-1080p', width: 1920, height: 1080, detail: 170 },
    { name: 'desktop-4k', width: 3840, height: 2160, detail: 240 },
    { name: 'phone', width: 1179, height: 2556, detail: 150 },
    { name: 'tablet', width: 2048, height: 2732, detail: 180 },
  ];

  pack.forEach((item, index) => {
    state.image.deviceWidth = item.width;
    state.image.deviceHeight = item.height;
    state.image.width = item.detail;
    convertImage();
    const url = document.getElementById('wallpaperCanvas').toDataURL('image/png');

    setTimeout(() => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallpaper-${item.name}-${item.width}x${item.height}.png`;
      a.click();
    }, index * 250);
  });

  setTimeout(() => {
    Object.assign(state.image, original);
    syncWallpaperControls();
    convertImage();
  }, pack.length * 280);
}

// --- One-click Looks (preset-first flow) ---
const LOOK_PRESETS = [
  { name: 'Poster',     artType: 'poster',     wallpaperStyle: 'wired',     texture: 'clean', contrast: 1.8, edgeBoost: 1.2 },
  { name: 'Watercolor', artType: 'watercolor', wallpaperStyle: 'ink',       texture: 'paper', contrast: 1.2, edgeBoost: 0.7 },
  { name: 'Low Poly',   artType: 'lowpoly',    wallpaperStyle: 'amber',     texture: 'clean', contrast: 2.0, edgeBoost: 1.6 },
  { name: 'Duotone',    artType: 'duotone',    wallpaperStyle: 'blueprint', texture: 'clean', contrast: 1.8, edgeBoost: 1.0 },
  { name: 'Risograph',  artType: 'risograph',  wallpaperStyle: 'ink',       texture: 'paper', contrast: 1.7, edgeBoost: 1.1 },
  { name: 'Pop Art',    artType: 'popart',     wallpaperStyle: 'wired',     texture: 'clean', contrast: 1.9, edgeBoost: 1.2 },
  { name: 'Oil Paint',  artType: 'oilpaint',   wallpaperStyle: 'ink',       texture: 'paper', contrast: 1.6, edgeBoost: 1.0 },
  { name: 'Pencil',     artType: 'pencil',     wallpaperStyle: 'ink',       texture: 'paper', contrast: 1.6, edgeBoost: 2.2 },
  { name: 'Neon',       artType: 'neon',       wallpaperStyle: 'terminal',  texture: 'film',  contrast: 2.4, edgeBoost: 2.6 },
];

// Apply a preset look, sync the advanced controls to match, and re-render.
function applyLook(preset, { silent = false } = {}) {
  state.image.artType = preset.artType;
  state.image.wallpaperStyle = preset.wallpaperStyle;
  state.image.texture = preset.texture;
  state.image.contrast = preset.contrast;
  state.image.edgeBoost = preset.edgeBoost;
  saveSettings();
  syncWallpaperControls();

  document.querySelectorAll('#styleGallery .look-card').forEach((el) => {
    el.classList.toggle('active', el.dataset.look === preset.name);
  });

  if (state.image.currentImage) convertImage();
  if (!silent) showToast(`Applied ${preset.name}`);
}

// Build the labeled look-picker (no async thumbnail race — applies on click).
function renderLookPicker() {
  const gallery = document.getElementById('styleGallery');
  if (!gallery) return;
  gallery.innerHTML = '';
  LOOK_PRESETS.forEach((preset) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'look-card';
    card.dataset.look = preset.name;
    card.classList.toggle('active', state.image.artType === preset.artType);
    card.textContent = preset.name;
    card.onclick = () => applyLook(preset);
    gallery.appendChild(card);
  });
}

// Show/hide the advanced control stack.
function toggleAdvanced() {
  const wrap = document.getElementById('advancedControls');
  const btn = document.getElementById('advancedToggle');
  if (!wrap) return;
  const open = wrap.style.display !== 'none' && wrap.style.display !== '';
  wrap.style.display = open ? 'none' : 'block';
  if (btn) btn.classList.toggle('open', !open);
}

function renderStyleGallery() {
  if (!state.image.currentImage) {
    showToast('Upload an image first', 'error');
    return;
  }

  const gallery = document.getElementById('styleGallery');
  const original = {
    artType: state.image.artType,
    wallpaperStyle: state.image.wallpaperStyle,
    texture: state.image.texture,
    contrast: state.image.contrast,
    edgeBoost: state.image.edgeBoost,
    margin: state.image.margin,
    deviceWidth: state.image.deviceWidth,
    deviceHeight: state.image.deviceHeight,
    width: state.image.width,
  };
  const presets = [
    { name: 'Watercolor', artType: 'watercolor', wallpaperStyle: 'ink', texture: 'paper', contrast: 1.2, edgeBoost: 0.7 },
    { name: 'Poster', artType: 'poster', wallpaperStyle: 'wired', texture: 'clean', contrast: 1.8, edgeBoost: 1.2 },
    { name: 'Low Poly', artType: 'lowpoly', wallpaperStyle: 'amber', texture: 'clean', contrast: 2.0, edgeBoost: 1.6 },
    { name: 'Risograph', artType: 'risograph', wallpaperStyle: 'ink', texture: 'paper', contrast: 1.7, edgeBoost: 1.1 },
    { name: 'Neon', artType: 'neon', wallpaperStyle: 'terminal', texture: 'film', contrast: 2.4, edgeBoost: 2.6 },
    { name: 'Pencil', artType: 'pencil', wallpaperStyle: 'ink', texture: 'paper', contrast: 1.6, edgeBoost: 2.2 },
  ];

  gallery.innerHTML = '';
  presets.forEach((preset) => {
    state.image.deviceWidth = 480;
    state.image.deviceHeight = 270;
    state.image.width = 110;
    Object.assign(state.image, preset);
    convertImage();

    const card = document.createElement('button');
    card.className = 'gallery-card';
    card.type = 'button';
    card.innerHTML = `<img src="${document.getElementById('wallpaperCanvas').toDataURL('image/jpeg', 0.68)}" alt="${preset.name} preview"><span>${preset.name}</span>`;
    card.onclick = () => {
      Object.assign(state.image, preset);
      syncWallpaperControls();
      convertImage();
    };
    gallery.appendChild(card);
  });

  Object.assign(state.image, original);
  syncWallpaperControls();
  convertImage();
}

function syncWallpaperControls() {
  document.getElementById('artTypeSelect').value = state.image.artType;
  document.getElementById('wallpaperStyle').value = state.image.wallpaperStyle;
  document.getElementById('textureSelect').value = state.image.texture;
  document.getElementById('compositionSelect').value = state.image.composition;
  document.getElementById('imgContrast').value = state.image.contrast;
  document.getElementById('imgContrastVal').textContent = state.image.contrast.toFixed(1);
  document.getElementById('edgeBoost').value = state.image.edgeBoost;
  document.getElementById('edgeBoostVal').textContent = state.image.edgeBoost.toFixed(1);
  document.getElementById('marginRange').value = state.image.margin;
  document.getElementById('marginVal').textContent = state.image.margin;
  document.getElementById('saturationRange').value = state.image.saturation;
  document.getElementById('saturationVal').textContent = state.image.saturation.toFixed(1);
  document.getElementById('warmthRange').value = state.image.warmth;
  document.getElementById('warmthVal').textContent = state.image.warmth;
  document.getElementById('funkySelect').value = state.image.funkyMode;
  document.getElementById('chaosRange').value = state.image.chaos;
  document.getElementById('chaosVal').textContent = state.image.chaos;
  document.getElementById('imgWidth').value = state.image.width;
  document.getElementById('imgWidthVal').textContent = state.image.width;
  const deviceValue = `${state.image.deviceWidth}x${state.image.deviceHeight}`;
  if ([...document.getElementById('deviceSelect').options].some(option => option.value === deviceValue)) {
    document.getElementById('deviceSelect').value = deviceValue;
  }
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function getAverageBrightness(data) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    count++;
  }
  return count ? total / count : 255;
}

function adjustContrast(value, contrast) {
  return Math.max(0, Math.min(255, (value - 128) * contrast + 128));
}

function initPasteUpload() {
  document.addEventListener('paste', (event) => {
    const items = event.clipboardData && Array.from(event.clipboardData.items);
    if (!items) return;

    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (file) {
      if (document.getElementById('panelText').classList.contains('active')) {
        loadQrImage(file);
        showToast('Pasted QR image loaded');
      } else {
        switchTab('image');
        loadImage(file);
        showToast('Pasted image loaded');
      }
    }
  });
}

