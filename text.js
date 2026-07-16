/* text.js — Text + QR tab (generateAscii, renderQr, QR helpers, color/charset)
 * Part of Empty Wall. Classic script (shared global scope) — load order in index.html.
 */
// --- Text Tab Functions ---
function generateAscii() {
  const text = document.getElementById('textInput').value || ' ';
  const font = document.getElementById('fontSelect').value;
  const shadow = document.getElementById('shadowToggle').checked;
  const border = document.getElementById('borderToggle').checked;

  document.getElementById('charCount').textContent = text.length;

  let asciiText = '';

  if (font === 'qrcode') {
    asciiText = renderQr(text);
  } else {
    asciiText = renderFont(text, font); // from fonts.js

    // Apply charset mapping if not standard
    if (state.text.charset !== 'standard') {
      const chars = CHARSETS[state.text.charset].trim();
      if (chars.length > 0) {
        const charToUse = chars[0];
        // Replace word characters or block characters from the font with charToUse
        // Note: we avoid replacing spaces and newlines
        asciiText = asciiText.replace(/[^ \n]/g, charToUse);
      }
    }
  }

  // Border logic
  if (border) {
    const lines = asciiText.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    const borderTop = '┌' + '─'.repeat(maxLen + 2) + '┐';
    const borderBottom = '└' + '─'.repeat(maxLen + 2) + '┘';
    const borderedLines = lines.map(l => '│ ' + l.padEnd(maxLen, ' ') + ' │');
    asciiText = [borderTop, ...borderedLines, borderBottom].join('\n');
  }

  const outputEl = document.getElementById('asciiOutput');
  outputEl.textContent = asciiText;

  // Apply styles
  const container = document.getElementById('outputContainer');
  container.className = 'output-container glass';
  if (font === 'qrcode' && document.getElementById('qrStyle').value === 'embed') {
    outputEl.className = 'ascii-output qr-paper-output';
    container.classList.add('qr-paper');
  } else {
    outputEl.className = 'ascii-output ' + state.text.color;
  }
  if (shadow) {
    container.classList.add('with-shadow');
  } else {
    container.classList.remove('with-shadow');
  }

  // Meta
  const lines = asciiText.split('\n');
  document.getElementById('metaLines').textContent = `${lines.length} lines`;
  document.getElementById('metaCols').textContent = `${Math.max(...lines.map(l => l.length))} cols`;
  document.getElementById('metaChars').textContent = `${asciiText.length} chars`;

  saveSettings();
}

function renderQr(text) {
  if (!text.trim()) return 'Enter text to generate QR code';
  if (typeof qrcode !== 'function') return 'QR library unavailable. Check network/CDN.';

  state.qr.errorCorrection = document.getElementById('qrEcc').value;
  state.qr.style = document.getElementById('qrStyle').value;
  state.qr.quietZone = parseInt(document.getElementById('quietRange').value, 10);
  state.qr.invert = document.getElementById('qrInvertToggle').checked;

  if (state.qr.style === 'embed' && !state.qr.image) {
    return 'Choose an image to create visual QR';
  }

  const glyphs = {
    blocks: { dark: '██', light: '  ' },
    compact: { dark: '█', light: ' ' },
    dots: { dark: '##', light: '..' },
  };
  const pair = glyphs[state.qr.style] || glyphs.blocks;
  const texture = getQrTexture(text);
  let textureIndex = 0;

  try {
    const qr = qrcode(0, state.qr.errorCorrection);
    qr.addData(text);
    qr.make();

    const count = qr.getModuleCount();
    const imageMap = (state.qr.style === 'image' || state.qr.style === 'embed') ? getQrImageMap(state.qr.image, count) : null;
    const quiet = state.qr.quietZone;
    const rows = [];

    for (let r = -quiet; r < count + quiet; r++) {
      let row = '';
      for (let c = -quiet; c < count + quiet; c++) {
        const inBounds = r >= 0 && r < count && c >= 0 && c < count;
        const dark = inBounds ? qr.isDark(r, c) : false;
        const filled = state.qr.invert ? !dark : dark;
        if (state.qr.style === 'embed' && imageMap) {
          row += getQrEmbedPair(imageMap, r, c, filled);
        } else if (state.qr.style === 'image' && imageMap) {
          row += filled ? getQrImagePair(imageMap, r, c) : '  ';
        } else if (state.qr.style === 'ascii') {
          row += filled ? getNextQrTexturePair(texture, textureIndex++) : '  ';
        } else {
          row += filled ? pair.dark : pair.light;
        }
      }
      rows.push(row);
    }

    return rows.join('\n');
  } catch (error) {
    return 'Text too long for selected QR recovery level';
  }
}

function getQrTexture(text) {
  const cleaned = text.replace(/\s+/g, '');
  return cleaned.length ? cleaned : 'ASCIIQR';
}

function getNextQrTexturePair(texture, index) {
  const a = texture[index % texture.length];
  const b = texture[(index + 1) % texture.length];
  return `${a}${b}`;
}

function handleQrImageUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  loadQrImage(file);
}

function loadQrImage(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please upload a valid image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (readerEvent) => {
    const img = new Image();
    img.onload = () => {
      state.qr.image = img;
      document.getElementById('qrStyle').value = 'embed';
      document.getElementById('qrImageName').textContent = file.name;
      generateAscii();
    };
    img.src = readerEvent.target.result;
  };
  reader.readAsDataURL(file);
}

function getQrImageMap(img, size) {
  if (!img) return null;

  const canvas = document.getElementById('hiddenCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = size;
  canvas.height = size;

  const scale = Math.max(size / img.width, size / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, x, y, width, height);

  return {
    size,
    data: ctx.getImageData(0, 0, size, size).data,
    chars: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'.',
  };
}

function getQrImagePair(imageMap, row, col) {
  if (row < 0 || col < 0 || row >= imageMap.size || col >= imageMap.size) {
    return '██';
  }

  const offset = (row * imageMap.size + col) * 4;
  const r = imageMap.data[offset];
  const g = imageMap.data[offset + 1];
  const b = imageMap.data[offset + 2];
  const a = imageMap.data[offset + 3];
  if (a === 0) return '░░';

  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  const maxIndex = Math.floor(imageMap.chars.length * 0.72);
  const index = Math.floor((brightness / 255) * maxIndex);
  const char = imageMap.chars[Math.max(0, Math.min(maxIndex, index))] || '#';
  return `${char}${char}`;
}

function getQrEmbedPair(imageMap, row, col, qrDark) {
  if (row < 0 || col < 0 || row >= imageMap.size || col >= imageMap.size) {
    return qrDark ? '██' : '  ';
  }

  if (isQrFinderArea(row, col, imageMap.size)) {
    return qrDark ? '██' : '  ';
  }

  const brightness = getQrImageBrightness(imageMap, row, col);
  const imageDark = brightness < 142;
  const imageLight = brightness > 188;

  if (imageDark) return '██';
  if (imageLight) return '  ';
  return qrDark ? '██' : '  ';
}

function getQrImageBrightness(imageMap, row, col) {
  const offset = (row * imageMap.size + col) * 4;
  const a = imageMap.data[offset + 3];
  if (a === 0) return 255;

  const r = imageMap.data[offset];
  const g = imageMap.data[offset + 1];
  const b = imageMap.data[offset + 2];
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isQrFinderArea(row, col, size) {
  const nearTop = row <= 8;
  const nearLeft = col <= 8;
  const nearRight = col >= size - 9;
  const nearBottom = row >= size - 9;

  return (nearTop && nearLeft) || (nearTop && nearRight) || (nearBottom && nearLeft);
}

function selectColor(btn, colorClass) {
  document.querySelectorAll('#colorPalette .color-swatch').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.text.color = colorClass;
  generateAscii();
}

function updateSize(val) {
  state.text.size = parseFloat(val);
  document.getElementById('sizeVal').textContent = state.text.size.toFixed(1);
  document.getElementById('asciiOutput').style.transform = `scale(${state.text.size})`;
  document.getElementById('asciiOutput').style.transformOrigin = 'top left';
}

function updateQuietZone(val) {
  state.qr.quietZone = parseInt(val, 10);
  document.getElementById('quietVal').textContent = state.qr.quietZone;
  generateAscii();
}

function selectCharset(charset, btn) {
  document.querySelectorAll('.charset-group .charset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.text.charset = charset;
  generateAscii();
}

