/**
 * EMPTY WALL API INTEGRATION (Supabase)
 * Auth required to publish. Posts are owned by users and protected by RLS
 * (see supabase-setup.sql). Public images use a public bucket; private images
 * live in a private bucket and are viewed through short-lived signed URLs.
 */

// Supabase project credentials. The anon/publishable key is safe to expose in
// client code — Row Level Security (see supabase-setup.sql) protects the data.
const SUPABASE_URL = 'https://cufgvajtyymnfrxbsnle.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j3z2y96Pm8ZSflwC2-LOaw_Xw7-NdQJ';

const PUBLIC_BUCKET = 'public-wallpapers';
const PRIVATE_BUCKET = 'private-wallpapers';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

let supabaseClient = null;
let currentUser = null;

function isBackendConfigured() {
    return !!supabaseClient && !SUPABASE_URL.includes('your-project');
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.supabase && !SUPABASE_URL.includes('your-project')) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                // Implicit flow keeps the token in the URL hash so magic links work
                // even when opened in a different browser than they were requested
                // from (PKCE needs a code_verifier from the original context).
                flowType: 'implicit'
            }
        });

        // Surface auth errors the redirect may carry back (e.g. expired link).
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (hashParams.get('error_description')) {
            showToast(decodeURIComponent(hashParams.get('error_description')), 'error');
        }

        const { data } = await supabaseClient.auth.getSession();
        currentUser = data.session ? data.session.user : null;
        renderAuthUI();

        // Keep UI in sync across sign-in / sign-out / magic-link return.
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUser = session ? session.user : null;
            renderAuthUI();
        });
    } else {
        renderAuthUI();
    }
});

/* ─── Auth UI ─────────────────────────────────────────────────────────── */

function renderAuthUI() {
    const bar = document.getElementById('authBar');
    if (!bar) return;
    const email = document.getElementById('authEmailLabel');
    const signInBtn = document.getElementById('authSignInBtn');
    const signOutBtn = document.getElementById('authSignOutBtn');
    const myBtn = document.getElementById('myCreationsBtn');

    if (currentUser) {
        email.textContent = currentUser.email || 'Signed in';
        email.style.display = '';
        signInBtn.style.display = 'none';
        signOutBtn.style.display = '';
        if (myBtn) myBtn.style.display = '';
    } else {
        email.style.display = 'none';
        signInBtn.style.display = '';
        signOutBtn.style.display = 'none';
        if (myBtn) myBtn.style.display = 'none';
    }
}

function openAuthModal() {
    if (!isBackendConfigured()) {
        showToast('Backend not configured yet — add your Supabase keys to api.js', 'error');
        return;
    }
    document.getElementById('authEmailInput').value = '';
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('authEmailInput').focus();
}

function closeAuthModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('authModal').style.display = 'none';
}

async function sendMagicLink() {
    const email = document.getElementById('authEmailInput').value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        showToast('Enter a valid email', 'error');
        return;
    }
    const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href }
    });
    if (error) {
        showToast('Could not send link: ' + error.message, 'error');
        return;
    }
    closeAuthModal();
    showToast('Magic link sent — check your email');
}

async function signOut() {
    await supabaseClient.auth.signOut();
    showToast('Signed out');
}

/** Returns the signed-in user, or opens the sign-in modal and returns null. */
function requireAuth() {
    if (!isBackendConfigured()) {
        showToast('Backend not configured yet — add your Supabase keys to api.js', 'error');
        return null;
    }
    if (!currentUser) {
        openAuthModal();
        showToast('Sign in to publish', 'error');
        return null;
    }
    return currentUser;
}

/* ─── Publish ─────────────────────────────────────────────────────────── */

/** Triggered when a user clicks "Publish to Web" — opens the styled modal. */
function openPublishModal() {
    const canvas = document.getElementById('wallpaperCanvas');
    if (!canvas || canvas.style.display === 'none') {
        showToast('Generate an image before publishing', 'error');
        return;
    }
    if (!requireAuth()) return;
    document.getElementById('publishTitleInput').value = '';
    document.getElementById('publishVisibility').value = 'public';
    document.getElementById('publishModal').style.display = 'flex';
    document.getElementById('publishTitleInput').focus();
}

/** Closes the publish modal. With a click event, only closes on backdrop clicks. */
function closePublishModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('publishModal').style.display = 'none';
}

function submitPublish() {
    const title = document.getElementById('publishTitleInput').value.trim();
    if (!title) {
        showToast('Enter a title first', 'error');
        return;
    }
    const isPublic = document.getElementById('publishVisibility').value === 'public';
    const canvas = document.getElementById('wallpaperCanvas');
    closePublishModal();
    publishCreation(title, isPublic, canvas);
}

/** Uploads the image to the right bucket and saves the post row. */
async function publishCreation(title, isPublic, canvas) {
    const user = requireAuth();
    if (!user) return;

    showImgLoading(true);
    try {
        // PNG (lossless) — JPEG's block artifacts ruin the crisp ASCII/line art.
        const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const bucket = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET;
        // Files live under the owner's uid folder — storage RLS keys off that.
        const path = `${user.id}/wallpaper_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;

        const { error: uploadError } = await supabaseClient
            .storage.from(bucket)
            .upload(path, imageBlob, { contentType: 'image/png' });
        if (uploadError) throw uploadError;

        // user_id is filled by the column default (auth.uid()); RLS enforces ownership.
        const { error: dbError } = await supabaseClient.from('posts').insert([{
            title,
            bucket,
            image_path: path,
            visibility: isPublic ? 'public' : 'private',
            config: state.image
        }]);
        if (dbError) throw dbError;

        showImgLoading(false);
        showToast(isPublic ? 'Published to the public gallery!' : 'Saved privately');
    } catch (error) {
        showImgLoading(false);
        showToast('Failed to publish: ' + (error.message || 'unknown error'), 'error');
    }
}

/* ─── Feeds ───────────────────────────────────────────────────────────── */

async function loadExploreFeed() {
    const searchQuery = document.getElementById('searchInput').value;
    const sortBy = document.getElementById('sortSelect').value;
    const gallery = document.getElementById('publicFeedGallery');
    setGalleryMessage(gallery, 'Loading public feed…');

    if (!isBackendConfigured()) {
        setGalleryMessage(gallery, 'Backend required. Add your Supabase keys to api.js and run supabase-setup.sql to connect this feed.');
        return;
    }

    let query = supabaseClient.from('posts').select('*').eq('visibility', 'public');

    // Strip PostgREST filter-significant chars so a crafted query can't inject
    // extra conditions into the .or() expression. See sanitizeSearch().
    const safeQuery = sanitizeSearch(searchQuery);
    if (safeQuery) {
        query = query.or(`title.ilike.%${safeQuery}%,config->>artType.ilike.%${safeQuery}%`);
    }
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
        setGalleryMessage(gallery, 'Error loading feed.', true);
        return;
    }
    const liked = await fetchLikedSet(data);
    renderCards(gallery, data, 'No public creations yet — be the first to publish!', liked);
}

/** "My Creations" — the signed-in user's own posts (public + private). */
async function loadMyCreations() {
    const gallery = document.getElementById('publicFeedGallery');
    if (!requireAuth()) return;
    document.getElementById('galleryLabel').textContent = 'My Creations';
    setGalleryMessage(gallery, 'Loading your creations…');

    const { data, error } = await supabaseClient
        .from('posts').select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    if (error) {
        setGalleryMessage(gallery, 'Error loading your creations.', true);
        return;
    }
    const liked = await fetchLikedSet(data);
    renderCards(gallery, data, 'You have not published anything yet.', liked);
}

/** Returns the set of post ids the current user has liked (empty if signed out). */
async function fetchLikedSet(posts) {
    if (!currentUser || !posts || posts.length === 0) return new Set();
    const ids = posts.map(p => p.id);
    const { data } = await supabaseClient
        .from('likes').select('post_id')
        .eq('user_id', currentUser.id).in('post_id', ids);
    return new Set((data || []).map(r => r.post_id));
}

/** Toggles the current user's like on a post, with optimistic UI. */
async function toggleLike(postId, btn) {
    if (!requireAuth()) return;
    const wasLiked = btn.dataset.liked === '1';
    const nEl = btn.querySelector('.like-n');
    const n = parseInt(nEl.textContent || '0', 10) || 0;

    // Optimistic update.
    btn.dataset.liked = wasLiked ? '0' : '1';
    btn.classList.toggle('liked', !wasLiked);
    nEl.textContent = wasLiked ? Math.max(0, n - 1) : n + 1;

    const { error } = wasLiked
        ? await supabaseClient.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
        : await supabaseClient.from('likes').insert([{ post_id: postId }]);

    if (error) { // revert
        btn.dataset.liked = wasLiked ? '1' : '0';
        btn.classList.toggle('liked', wasLiked);
        nEl.textContent = n;
        showToast('Could not update like', 'error');
    }
}

function showPublicGallery() {
    document.getElementById('galleryLabel').textContent = 'Public Community Gallery';
    loadExploreFeed();
}

/* ─── Rendering ───────────────────────────────────────────────────────── */

function setGalleryMessage(gallery, text, isError) {
    gallery.innerHTML = '';
    const div = document.createElement('div');
    div.style.cssText = 'grid-column:1/-1;text-align:center;padding:2rem;';
    div.style.color = isError ? '#ef4444' : 'var(--text3)';
    div.textContent = text;
    gallery.appendChild(div);
}

/** Builds cards with textContent (XSS-safe); resolves image URLs asynchronously. */
function renderCards(gallery, posts, emptyText, likedSet) {
    if (!posts || posts.length === 0) {
        setGalleryMessage(gallery, emptyText);
        return;
    }
    gallery.innerHTML = '';
    posts.forEach(post => {
        const config = post.config || {};
        const card = document.createElement('div');
        card.className = 'gallery-card';

        const media = document.createElement('div');
        media.className = 'gallery-media';

        const img = document.createElement('img');
        img.alt = post.title || '';
        img.loading = 'lazy';

        // Hover actions: Edit (load into the editor) and Download.
        const actions = document.createElement('div');
        actions.className = 'gallery-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-sm';
        editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span> Edit';
        editBtn.title = 'Open this image in the editor';
        editBtn.onclick = (e) => { e.stopPropagation(); usePublicImage(img.src, config); };

        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn-sm';
        dlBtn.innerHTML = '<span class="material-symbols-outlined">download</span>';
        dlBtn.title = 'Download image';
        dlBtn.onclick = (e) => { e.stopPropagation(); downloadPublicImage(img.src, post.title); };

        actions.append(editBtn, dlBtn);

        // Like button (always visible, top-right). Shows count; toggles on click.
        const liked = !!(likedSet && likedSet.has(post.id));
        const likeBtn = document.createElement('button');
        likeBtn.className = 'gallery-like' + (liked ? ' liked' : '');
        likeBtn.dataset.liked = liked ? '1' : '0';
        likeBtn.title = 'Like';
        const heart = document.createElement('span');
        heart.className = 'material-symbols-outlined';
        heart.textContent = 'favorite';
        const count = document.createElement('span');
        count.className = 'like-n';
        count.textContent = post.like_count || 0;
        likeBtn.append(heart, count);
        likeBtn.onclick = (e) => { e.stopPropagation(); toggleLike(post.id, likeBtn); };

        media.append(img, actions, likeBtn);

        const span = document.createElement('span');
        span.textContent = (post.title || 'Untitled') + ' ';
        const small = document.createElement('small');
        small.style.color = 'var(--text4)';
        const tag = post.visibility === 'private' ? ' · private' : '';
        small.textContent = 'Style: ' + (config.artType || '—') + tag;
        span.append(document.createElement('br'), small);

        // Clicking the card body still applies just the style to your own image.
        card.onclick = () => loadCommunityStyle(config);
        card.append(media, span);
        gallery.appendChild(card);

        resolveImageUrl(post).then(url => { if (url) img.src = url; });
    });
}

/** Copies a post's aesthetic settings into state.image (no image required). */
function applyStyleConfig(config) {
    if (!config) return;
    ['artType', 'wallpaperStyle', 'texture', 'contrast', 'edgeBoost', 'funkyMode', 'chaos']
        .forEach(k => { if (config[k] !== undefined) state.image[k] = config[k]; });
}

/** Loads a published image into the editor as the working image, then renders it. */
function usePublicImage(url, config) {
    if (!url) { showToast('Image not ready yet', 'error'); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous'; // keep the canvas untainted so getImageData works
    img.onload = () => {
        state.image.currentImage = img;
        const ph = document.getElementById('uploadPlaceholder');
        if (ph) ph.style.display = 'none';
        applyStyleConfig(config);
        switchTab('image');
        syncWallpaperControls();
        convertImage();
        showToast('Loaded into editor');
    };
    img.onerror = () => showToast('Could not load that image', 'error');
    img.src = url;
}

/** Downloads a gallery image as a JPEG (falls back to opening it if CORS blocks fetch). */
async function downloadPublicImage(url, title) {
    if (!url) { showToast('Image not ready yet', 'error'); return; }
    const base = (title || 'wallpaper').replace(/[^\w-]+/g, '_').slice(0, 60);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const obj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = obj;
        a.download = `${base}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(obj);
        showToast('Downloaded');
    } catch {
        window.open(url, '_blank', 'noopener');
    }
}

/** Public bucket → public URL; private bucket → short-lived signed URL. */
async function resolveImageUrl(post) {
    if (!post.image_path) return '';
    if (post.bucket === PUBLIC_BUCKET) {
        const { data } = supabaseClient.storage.from(PUBLIC_BUCKET).getPublicUrl(post.image_path);
        return safeImageUrl(data.publicUrl);
    }
    const { data, error } = await supabaseClient
        .storage.from(PRIVATE_BUCKET)
        .createSignedUrl(post.image_path, SIGNED_URL_TTL);
    return error ? '' : safeImageUrl(data.signedUrl);
}

/**
 * Removes characters that carry meaning inside a PostgREST `.or()` filter string
 * (commas separate conditions; parens group them; * / % are wildcards). Caps length.
 */
function sanitizeSearch(raw) {
    return (raw || '').replace(/[,()*%\\]/g, '').trim().slice(0, 80);
}

/** Only allow http(s) image URLs; anything else (javascript:, data:, …) becomes empty. */
function safeImageUrl(url) {
    try {
        const u = new URL(url, window.location.origin);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch {
        return '';
    }
}

function handleSearch(event) {
    if (event.key === 'Enter') loadExploreFeed();
}

/** Click a post to apply its settings to your own image. */
function loadCommunityStyle(communityConfig) {
    if (!state.image.currentImage) {
        showToast('Upload your own image first to apply this style!', 'error');
        switchTab('image');
        return;
    }
    state.image.artType = communityConfig.artType;
    state.image.wallpaperStyle = communityConfig.wallpaperStyle;
    state.image.texture = communityConfig.texture;
    state.image.contrast = communityConfig.contrast;
    state.image.edgeBoost = communityConfig.edgeBoost;
    state.image.funkyMode = communityConfig.funkyMode;
    state.image.chaos = communityConfig.chaos;

    switchTab('image');
    syncWallpaperControls();
    convertImage();
    showToast('Applied community style!');
}
