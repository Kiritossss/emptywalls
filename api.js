/**
 * EMPTY WALL API INTEGRATION (Supabase)
 */

// WARNING: Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize Supabase client
let supabaseClient;
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
});

/**
 * Triggered when a user clicks "Publish to Web" — opens the styled modal.
 */
function openPublishModal() {
    const canvas = document.getElementById('wallpaperCanvas');
    if (!canvas || canvas.style.display === 'none') {
        showToast('Generate an image before publishing', 'error');
        return;
    }
    document.getElementById('publishTitleInput').value = '';
    document.getElementById('publishVisibility').value = 'public';
    document.getElementById('publishModal').style.display = 'flex';
    document.getElementById('publishTitleInput').focus();
}

/**
 * Closes the publish modal. When passed a click event, only closes on backdrop clicks.
 */
function closePublishModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('publishModal').style.display = 'none';
}

/**
 * Reads modal fields and kicks off the upload.
 */
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

/**
 * Uploads the image to Cloud Storage and saves the config to the Database
 */
async function publishCreation(title, isPublic, canvas) {
    showImgLoading(true);

    if (!supabaseClient || SUPABASE_URL.includes('your-project')) {
        showToast('Supabase not configured yet!', 'error');
        showImgLoading(false);
        return;
    }

    try {
        const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        const fileName = `wallpaper_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;

        // 1. Upload Blob to Supabase Storage bucket named 'wallpapers'
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('wallpapers')
            .upload(fileName, imageBlob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        // 2. Get Public URL for the uploaded image
        const { data: urlData } = supabaseClient.storage.from('wallpapers').getPublicUrl(fileName);
        const imageUrl = urlData.publicUrl;

        // 3. Save the post to the Database table named 'posts'
        const { error: dbError } = await supabaseClient
            .from('posts')
            .insert([{
                title: title,
                image_url: imageUrl,
                visibility: isPublic ? 'public' : 'private',
                config: state.image // Saving the exact parameters used
            }]);

        if (dbError) throw dbError;

        showImgLoading(false);
        showToast(isPublic ? 'Published to Public Gallery!' : 'Saved Privately!');

    } catch (error) {
        console.error("Failed to publish", error);
        showImgLoading(false);
        showToast('Failed to publish creation', 'error');
    }
}

/**
 * Fetches public posts for the "Explore" tab
 */
async function loadExploreFeed() {
    const searchQuery = document.getElementById('searchInput').value;
    const sortBy = document.getElementById('sortSelect').value;
    const gallery = document.getElementById('publicFeedGallery');

    gallery.innerHTML = '<div style="color: var(--text3); grid-column: 1/-1; text-align:center;">Loading public feed...</div>';

    if (!supabaseClient || SUPABASE_URL.includes('your-project')) {
        gallery.innerHTML = '<div style="color: var(--text3); grid-column: 1/-1; text-align:center; padding: 2rem;">Backend required to load live community images.<br>Add your Supabase keys to api.js to connect this feed!</div>';
        return;
    }

    // Construct the database query
    let query = supabaseClient.from('posts').select('*').eq('visibility', 'public');

    // Strip PostgREST filter-significant chars so a crafted query can't inject
    // extra conditions into the .or() expression. See sanitizeSearch().
    const safeQuery = sanitizeSearch(searchQuery);
    if (safeQuery) {
        query = query.or(`title.ilike.%${safeQuery}%,config->>artType.ilike.%${safeQuery}%`);
    }

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    // If you add a "likes" column later, you can order by that for 'popular'

    const { data: publicPosts, error } = await query;

    if (error) {
        gallery.innerHTML = '<div style="color: #ef4444; grid-column: 1/-1; text-align:center;">Error loading feed.</div>';
        return;
    }

    // Render the posts. Build nodes with textContent / validated src so a malicious
    // post title or image_url can't inject markup (stored XSS).
    gallery.innerHTML = '';
    publicPosts.forEach(post => {
        const config = post.config || {};
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.onclick = () => loadCommunityStyle(config);

        const img = document.createElement('img');
        img.src = safeImageUrl(post.image_url);
        img.alt = post.title || '';
        img.loading = 'lazy';

        const span = document.createElement('span');
        span.textContent = (post.title || 'Untitled') + ' ';
        const small = document.createElement('small');
        small.style.color = 'var(--text4)';
        small.textContent = 'Style: ' + (config.artType || '—');
        span.append(document.createElement('br'), small);

        card.append(img, span);
        gallery.appendChild(card);
    });
}

/**
 * Removes characters that carry meaning inside a PostgREST `.or()` filter string
 * (commas separate conditions; parens group them; * / % are wildcards). Also caps length.
 */
function sanitizeSearch(raw) {
    return (raw || '').replace(/[,()*%\\]/g, '').trim().slice(0, 80);
}

/**
 * Only allow http(s) image URLs; anything else (javascript:, data:, …) becomes empty.
 */
function safeImageUrl(url) {
    try {
        const u = new URL(url, window.location.origin);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch {
        return '';
    }
}

function handleSearch(event) {
    // Trigger search when user presses Enter
    if (event.key === 'Enter') loadExploreFeed();
}

/**
 * Optional Feature: Let users click a post to apply its settings to their own image!
 */
function loadCommunityStyle(communityConfig) {
    if (!state.image.currentImage) {
        showToast('Upload your own image first to apply this style!', 'error');
        switchTab('image');
        return;
    }

    // Copy over the aesthetic settings
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