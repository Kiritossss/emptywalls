/* output.js — Output actions, loading/error states, toast, paste, particles
 * Part of Empty Wall. Classic script (shared global scope) — load order in index.html.
 */
// --- Output Actions ---

function copyOutput() {
  const text = document.getElementById('asciiOutput').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('ASCII Art copied to clipboard!');
  });
}

function copyImgOutput() {
  const text = document.getElementById('imgAsciiOutput').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Image ASCII copied to clipboard!');
  });
}

function downloadOutput() {
  const text = document.getElementById('asciiOutput').textContent;
  downloadTextFile(text, 'ascii-art.txt');
}

function downloadImgOutput() {
  const canvas = document.getElementById('wallpaperCanvas');
  if (canvas.style.display !== 'none') {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `ascii-wallpaper-${state.image.deviceWidth}x${state.image.deviceHeight}.png`;
    a.click();
    return;
  }

  const text = document.getElementById('imgAsciiOutput').textContent;
  downloadTextFile(text, 'image-ascii.txt');
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shareOutput() {
  const text = document.getElementById('asciiOutput').textContent;
  if (navigator.share) {
    navigator.share({
      title: 'My ASCII Art',
      text: text,
    }).catch(console.error);
  } else {
    copyOutput();
    showToast('Sharing not supported. Copied instead!');
  }
}

// --- Loading/Error States ---

function showImgLoading(show) {
  document.getElementById('imgLoadingOverlay').style.display = show ? 'flex' : 'none';
  document.getElementById('uploadPlaceholder').style.display = 'none';
  document.getElementById('wallpaperCanvas').style.display = 'none';
  document.getElementById('imgAsciiOutput').style.display = 'none';
}

function showImgError(message) {
  document.getElementById('imgErrorMessage').textContent = message || 'Failed to load image';
  document.getElementById('imgErrorOverlay').style.display = 'flex';
  document.getElementById('uploadPlaceholder').style.display = 'none';
  document.getElementById('wallpaperCanvas').style.display = 'none';
  document.getElementById('imgAsciiOutput').style.display = 'none';
}

function hideImgError() {
  document.getElementById('imgErrorOverlay').style.display = 'none';
}

function retryImageLoad() {
  hideImgError();
  const input = document.getElementById('imageInput');
  if (input && input.files && input.files[0]) {
    loadImage(input.files[0]);
  } else {
    document.getElementById('uploadPlaceholder').style.display = 'flex';
  }
}

function showTextLoading(show) {
  document.getElementById('textLoadingOverlay').style.display = show ? 'flex' : 'none';
}

function showTextError(message) {
  document.getElementById('textErrorMessage').textContent = message || 'Invalid input';
  document.getElementById('textErrorOverlay').style.display = 'flex';
}

function hideTextError() {
  document.getElementById('textErrorOverlay').style.display = 'none';
}

function retryTextGenerate() {
  hideTextError();
  generateAscii();
}

// --- Utils ---

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function initParticles() {
  const container = document.getElementById('bgParticles');
  if (!container) return;

  // Particles removed for a cleaner, professional design aesthetic.
}
