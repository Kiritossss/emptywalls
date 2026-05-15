// --- Worker Configuration & Data ---
const CHARSETS = {
    standard: '@#S%?*+;:,. ',
    blocks: '█▓▒░ ',
    minimal: '@:.  ',
    detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
    dots: '⣿⣶⣤⣀ ',
};

// --- Message Handler ---
onmessage = function (e) {
    const { data, width, height, options } = e.data;
    const imgArray = new Uint8ClampedArray(data);

    // 1. Color Grading
    applyColorGrade(imgArray, options.saturation, options.warmth);

    // 2. Map Generation
    const brightnessMap = buildBrightnessMap(imgArray, width, height);
    const edgeMap = buildEdgeMap(brightnessMap, width, height);

    // 3. ASCII Generation (if applicable)
    let asciiArt = '';
    let coloredHtml = '';

    if (!options.isGraphic) {
        const charset = getArtCharset(options.artType, options.charsetName);
        const avgBrightness = getAverageBrightness(imgArray);
        const invert = options.manualInvert || (options.autoDark && avgBrightness < 120);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = (y * width + x) * 4;
                const r = imgArray[offset];
                const g = imgArray[offset + 1];
                const b = imgArray[offset + 2];
                const a = imgArray[offset + 3];

                if (a === 0) {
                    asciiArt += ' ';
                    coloredHtml += ' ';
                    continue;
                }

                const brightness = adjustContrast(brightnessMap[y * width + x], options.contrast);
                const edge = edgeMap.magnitude[y * width + x] * options.edgeBoost;

                const char = getArtChar(brightness, edge, edgeMap.direction[y * width + x], charset, invert, options.artType);

                if (char === ' ' || char === '') {
                    asciiArt += ' ';
                    coloredHtml += ' ';
                } else if (char === '<') {
                    asciiArt += '<';
                    coloredHtml += options.colorMode ? `<span style="color:rgb(${r},${g},${b})">&lt;</span>` : '&lt;';
                } else if (char === '>') {
                    asciiArt += '>';
                    coloredHtml += options.colorMode ? `<span style="color:rgb(${r},${g},${b})">&gt;</span>` : '&gt;';
                } else {
                    asciiArt += char;
                    if (options.colorMode) {
                        coloredHtml += `<span style="color:rgb(${r},${g},${b})">${char}</span>`;
                    } else {
                        coloredHtml += char;
                    }
                }
            }
            asciiArt += '\n';
            coloredHtml += '\n';
        }
    }

    // Send processed data back to main thread using zero-copy Transferable Objects
    postMessage({
        processedData: imgArray.buffer,
        brightnessMap: brightnessMap.buffer,
        magnitude: edgeMap.magnitude.buffer,
        direction: edgeMap.direction.buffer,
        asciiArt,
        coloredHtml,
        options
    }, [imgArray.buffer, brightnessMap.buffer, edgeMap.magnitude.buffer, edgeMap.direction.buffer]);
};

// --- Image Processing Algorithms ---
function applyColorGrade(data, saturation, warmth) {
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

function buildBrightnessMap(data, width, height) {
    const brightness = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        brightness[p] = data[i + 3] === 0 ? 255 : 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return brightness;
}

function buildEdgeMap(brightness, width, height) {
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const gx = -brightness[i - width - 1] + brightness[i - width + 1] + -2 * brightness[i - 1] + 2 * brightness[i + 1] + -brightness[i + width - 1] + brightness[i + width + 1];
            const gy = -brightness[i - width - 1] - 2 * brightness[i - width] - brightness[i - width + 1] + brightness[i + width - 1] + 2 * brightness[i + width] + brightness[i + width + 1];
            magnitude[i] = Math.min(255, Math.hypot(gx, gy));
            direction[i] = Math.atan2(gy, gx);
        }
    }
    return { magnitude, direction };
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

function getArtCharset(artType, charsetName) {
    if (artType === 'braille') return '⣿⣾⣷⣯⣟⡿⣶⣤⣀ ';
    if (artType === 'blocks') return '█▓▒░ ';
    if (artType === 'dots') return '●•·. ';
    if (artType === 'line') return '#/\\|_-:. ';
    return CHARSETS[charsetName] || CHARSETS.detailed;
}

function getArtChar(brightness, edge, direction, charset, invert, artType) {
    if (artType === 'line') {
        if (edge < 58) return brightness < 82 ? '.' : ' ';
        const angle = Math.abs(direction);
        if (angle < Math.PI / 8 || angle > Math.PI * 7 / 8) return '|';
        if (angle < Math.PI * 3 / 8) return '/';
        if (angle < Math.PI * 5 / 8) return '_';
        return '\\';
    }
    let charIdx = Math.floor(((brightness - edge) / 255) * (charset.length - 1));
    charIdx = Math.max(0, Math.min(charset.length - 1, charIdx));
    if (invert) charIdx = (charset.length - 1) - charIdx;
    return charset[charIdx] || ' ';
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}