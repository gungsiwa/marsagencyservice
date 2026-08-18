const SUPABASE_URL = 'https://lxnlhqzypezvelmspevv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fhisWr9_VvHAwb2INiMCQQ_ya5nXH9q';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AUTH_CONFIG = { username: 'admin', password: 'marscloud2026' };

let appData = {
    currentFolderId: 'root',
    items: [],
    activeEditingId: null,
    stagedMediaFiles: [],
    viewMode: 'grid', // 'grid' | 'list'
    quickScratchpad: '',
    activities: []
};

// Web Audio Synth for Sci-Fi UI Effects
function playUISound(type = 'click') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'click') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc.start(); osc.stop(ctx.currentTime + 0.05);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        }
    } catch (e) {}
}

function refreshIcons() {
    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
    }, 50);
}

// Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
    
    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    refreshIcons();
    setTimeout(() => toast.remove(), 3200);
}

// Dynamic Canvas Particle Background Effect
function initSpaceCanvas() {
    const canvas = document.getElementById('space-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            alpha: Math.random()
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.x += s.vx; s.y += s.vy;
            if (s.x < 0) s.x = canvas.width;
            if (s.x > canvas.width) s.x = 0;
            if (s.y < 0) s.y = canvas.height;
            if (s.y > canvas.height) s.y = 0;

            ctx.fillStyle = `rgba(6, 182, 212, ${s.alpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// Spotlight Command Bar (Ctrl + K)
function initCommandBar() {
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleCommandBar();
        }
        if (e.key === 'Escape') {
            document.getElementById('command-bar-overlay')?.classList.add('hidden');
        }
    });

    document.getElementById('command-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const resultsBox = document.getElementById('command-results');
        if (!resultsBox) return;
        resultsBox.innerHTML = '';

        if (!query) return;

        const matches = appData.items.filter(i => !i.isDeleted && (
            i.name.toLowerCase().includes(query) || 
            (i.caption && i.caption.toLowerCase().includes(query)) ||
            (i.tags && i.tags.some(t => t.toLowerCase().includes(query)))
        ));

        matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 'command-item';
            item.innerHTML = `<i data-lucide="${m.type === 'folder' ? 'folder' : m.type === 'media' ? 'image' : 'file-text'}"></i> <span>${m.name}</span>`;
            item.onclick = () => {
                playUISound('click');
                document.getElementById('command-bar-overlay')?.classList.add('hidden');
                if (m.type === 'folder') navigateToFolder(m.id);
                else if (isMediaItem(m)) openLightbox(m);
                else openFileModal(m.id);
            };
            resultsBox.appendChild(item);
        });
        refreshIcons();
    });
}

function toggleCommandBar() {
    playUISound('click');
    const overlay = document.getElementById('command-bar-overlay');
    overlay?.classList.toggle('hidden');
    if (!overlay?.classList.contains('hidden')) {
        document.getElementById('command-input')?.focus();
    }
}

// Mobile Sidebar
function initMobileSidebar() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const closeBtn = document.getElementById('btn-close-sidebar');
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    function openSidebar() {
        sidebar?.classList.add('open'); backdrop?.classList.add('active');
    }
    function closeSidebar() {
        sidebar?.classList.remove('open'); backdrop?.classList.remove('active');
    }

    toggleBtn?.addEventListener('click', () => { playUISound('click'); openSidebar(); });
    closeBtn?.addEventListener('click', () => { playUISound('click'); closeSidebar(); });
    backdrop?.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
}

// 1. Authentication
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    if (u === AUTH_CONFIG.username && p === AUTH_CONFIG.password) {
        playUISound('success');
        sessionStorage.setItem('mars_auth', 'true');
        showApp();
        showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับสู่ Command Center!', 'success');
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('mars_auth');
    location.reload();
});

function checkAuth() {
    if (sessionStorage.getItem('mars_auth') === 'true') showApp();
    else refreshIcons();
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    initSpaceCanvas();
    initCommandBar();
    loadDataFromCloud();
    startRealtimeClockAndReminders();
    initGlobalDragAndDrop();
    refreshIcons();
}

// 2. Data Sync (Supabase)
function initDefaultFolders() {
    const defaultFolders = [
        { id: 'folder_notes', name: '📝 โน้ตบันทึก', type: 'folder', parentId: 'root', isDefault: true },
        { id: 'folder_media', name: '🖼️ ภาพและวิดีโอ', type: 'folder', parentId: 'root', isDefault: true },
        { id: 'folder_links', name: '🔗 คลังลิงก์', type: 'folder', parentId: 'root', isDefault: true }
    ];

    defaultFolders.forEach(df => {
        if (!appData.items.some(i => i.id === df.id)) appData.items.push(df);
    });
}

async function loadDataFromCloud() {
    try {
        const { data } = await supabaseClient.from('mars_data').select('*').eq('key', 'mars_app_state').maybeSingle();
        if (data && data.value) {
            appData.items = data.value.items || [];
            appData.quickScratchpad = data.value.scratchpad || '';
            appData.activities = data.value.activities || [];
        }
        initDefaultFolders();
        document.getElementById('quick-scratchpad').value = appData.quickScratchpad;
        updateStatus(true);
        renderApp();
    } catch (err) {
        initDefaultFolders();
        updateStatus(false);
        renderApp();
    }
}

async function saveDataToCloud() {
    try {
        const payload = { 
            key: 'mars_app_state', 
            value: { 
                items: appData.items, 
                scratchpad: appData.quickScratchpad,
                activities: appData.activities.slice(0, 15)
            } 
        };
        const { error } = await supabaseClient.from('mars_data').upsert(payload, { onConflict: 'key' });
        
        if (error) {
            showToast('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, 'error');
            updateStatus(false);
            return false;
        }
        updateStatus(true);
        return true;
    } catch (err) {
        updateStatus(false);
        return false;
    }
}

function logActivity(text) {
    appData.activities.unshift({ text, time: new Date().toLocaleTimeString('th-TH') });
}

supabaseClient.channel('public:mars_data')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mars_data' }, (payload) => {
        if (payload.new && payload.new.value && payload.new.key === 'mars_app_state') {
            appData.items = payload.new.value.items || [];
            appData.quickScratchpad = payload.new.value.scratchpad || '';
            appData.activities = payload.new.value.activities || [];
            initDefaultFolders();
            renderApp();
        }
    }).subscribe();

function isMediaItem(item) {
    if (item.type === 'media' || item.mediaSrc) return true;
    const content = item.content || '';
    if (typeof content === 'string' && (content.startsWith('data:image') || content.startsWith('data:video'))) {
        return true;
    }
    return false;
}

// 3. Navigation & Tab Switcher
function switchTab(tabName, activeNavId = null) {
    playUISound('click');
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));

    const targetNav = activeNavId ? document.getElementById(activeNavId) : document.getElementById(`nav-${tabName}`);
    if (targetNav) targetNav.classList.add('active');

    if (tabName === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('page-title').innerText = 'ภาพรวมระบบ Command Center';
    } else if (tabName === 'files') {
        document.getElementById('view-files').classList.remove('hidden');
        document.getElementById('page-title').innerText = 'จัดการเอกสารและคลังสื่อ';
    } else if (tabName === 'trash') {
        document.getElementById('view-trash').classList.remove('hidden');
        document.getElementById('page-title').innerText = 'ถังขยะระบบ';
    }
    renderApp();
}

function navigateToFolder(folderId) {
    appData.currentFolderId = folderId;
    const navId = folderId === 'folder_media' ? 'nav-media' : 'nav-files';
    switchTab('files', navId);
}

// 4. View Switcher (Grid / List)
document.getElementById('btn-view-grid')?.addEventListener('click', () => setViewMode('grid'));
document.getElementById('btn-view-list')?.addEventListener('click', () => setViewMode('list'));

function setViewMode(mode) {
    playUISound('click');
    appData.viewMode = mode;
    document.getElementById('btn-view-grid').classList.toggle('active', mode === 'grid');
    document.getElementById('btn-view-list').classList.toggle('active', mode === 'list');
    
    const fileGrid = document.getElementById('file-list');
    if (fileGrid) {
        fileGrid.className = `file-grid view-${mode}`;
    }
    renderApp();
}

// 5. Modal Operations & Drag-Drop Multi Upload
const createTypeSelect = document.getElementById('create-type');
const dropZone = document.getElementById('drop-zone');
const mediaFilesInput = document.getElementById('media-files-input');

createTypeSelect?.addEventListener('change', (e) => {
    const type = e.target.value;
    const linkGroup = document.getElementById('link-input-group');
    const mediaGroup = document.getElementById('media-upload-group');
    const contentGroup = document.getElementById('content-input-group');
    const mediaLabel = document.getElementById('media-upload-label');
    const contentLabel = document.getElementById('content-label');

    linkGroup.classList.add('hidden');
    mediaGroup.classList.add('hidden');
    contentGroup.classList.remove('hidden');

    if (type === 'link') {
        linkGroup.classList.remove('hidden');
        contentGroup.classList.add('hidden');
    } else if (type === 'media') {
        mediaGroup.classList.remove('hidden');
        if (mediaLabel) mediaLabel.innerText = 'อัปโหลดสื่อจากเครื่อง (เลือกภาพ/วิดีโอได้หลายไฟล์)';
        if (contentLabel) contentLabel.innerText = 'คำอธิบายภาพ/วิดีโอ (Caption)';
    } else if (type === 'note') {
        mediaGroup.classList.remove('hidden'); // แนบสื่อในโน้ตได้!
        if (mediaLabel) mediaLabel.innerText = 'แนบภาพ/วิดีโอประกอบโน้ต (Optional)';
        if (contentLabel) contentLabel.innerText = 'รายละเอียด / เนื้อหาโน้ต';
    } else if (type === 'folder') {
        contentGroup.classList.add('hidden');
    }
});

dropZone?.addEventListener('click', () => mediaFilesInput?.click());
mediaFilesInput?.addEventListener('change', (e) => handleSelectedMediaFiles(e.target.files));

function handleSelectedMediaFiles(files) {
    if (!files || files.length === 0) return;
    const previewBox = document.getElementById('media-previews-container');

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const dataUrl = evt.target.result;
            const isVideo = file.type.startsWith('video');
            appData.stagedMediaFiles.push({
                src: dataUrl,
                mediaType: isVideo ? 'video' : 'image',
                fileName: file.name
            });

            const thumb = document.createElement('div');
            thumb.className = 'media-thumb-preview';
            thumb.innerHTML = isVideo ? 
                `<video src="${dataUrl}"></video><span class="badge-tag">VIDEO</span>` : 
                `<img src="${dataUrl}" /><span class="badge-tag">IMG</span>`;
            previewBox.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
}

function initGlobalDragAndDrop() {
    const workspace = document.getElementById('global-drop-zone');
    if (!workspace) return;

    workspace.addEventListener('dragover', (e) => { e.preventDefault(); workspace.classList.add('drag-active'); });
    workspace.addEventListener('dragleave', () => workspace.classList.remove('drag-active'));
    workspace.addEventListener('drop', (e) => {
        e.preventDefault();
        workspace.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            openCreateModal();
            document.getElementById('create-type').value = 'media';
            document.getElementById('create-type').dispatchEvent(new Event('change'));
            handleSelectedMediaFiles(e.dataTransfer.files);
            showToast('เตรียมอัปโหลดไฟล์ที่ลากเข้ามาเรียบร้อย', 'info');
        }
    });
}

function openCreateModal() {
    playUISound('click');
    const parentSelect = document.getElementById('create-parent');
    parentSelect.innerHTML = '<option value="root">📂 หน้าแรกสุด (Root)</option>';

    const folders = appData.items.filter(i => i.type === 'folder' && !i.isDeleted);
    folders.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.innerText = `📁 ${f.name}`;
        if (f.id === appData.currentFolderId) option.selected = true;
        parentSelect.appendChild(option);
    });

    appData.stagedMediaFiles = [];
    document.getElementById('media-previews-container').innerHTML = '';
    document.getElementById('create-type').value = appData.currentFolderId === 'folder_media' ? 'media' : 'note';
    document.getElementById('create-title').value = '';
    document.getElementById('create-tags').value = '';
    document.getElementById('create-content').value = '';
    document.getElementById('create-link-url').value = '';
    document.getElementById('create-reminder-time').value = '';

    document.getElementById('create-type').dispatchEvent(new Event('change'));
    document.getElementById('create-modal').classList.remove('hidden');
    refreshIcons();
}

document.getElementById('btn-submit-create')?.addEventListener('click', async () => {
    const type = document.getElementById('create-type').value;
    const parentId = document.getElementById('create-parent').value;
    const name = document.getElementById('create-title').value.trim();
    const rawTags = document.getElementById('create-tags').value.trim();
    const content = document.getElementById('create-content').value;
    const linkUrl = document.getElementById('create-link-url').value.trim();
    const reminderTime = document.getElementById('create-reminder-time').value;

    if (!name) {
        showToast('กรุณาระบุชื่อหัวข้อ / ชื่อไฟล์', 'error');
        return;
    }

    const tags = rawTags ? rawTags.split(',').map(t => t.trim()) : [];

    if (type === 'media' && appData.stagedMediaFiles.length > 0) {
        appData.stagedMediaFiles.forEach((media, idx) => {
            appData.items.push({
                id: 'media_' + Date.now() + '_' + idx,
                name: appData.stagedMediaFiles.length > 1 ? `${name} (${idx + 1})` : name,
                type: 'media',
                mediaType: media.mediaType,
                mediaSrc: media.src,
                caption: content,
                tags,
                parentId: parentId || 'folder_media',
                isDeleted: false,
                createdAt: new Date().toISOString()
            });
        });
    } else {
        const noteMedia = type === 'note' && appData.stagedMediaFiles.length > 0 ? appData.stagedMediaFiles : [];
        appData.items.push({
            id: 'item_' + Date.now(),
            name,
            type,
            tags,
            parentId,
            content: type === 'link' ? linkUrl : content,
            caption: type === 'media' ? content : '',
            attachedMedia: noteMedia,
            isPinned: false,
            isDeleted: false,
            reminderTime,
            notified: false,
            createdAt: new Date().toISOString()
        });
    }

    logActivity(`สร้างรายการใหม่: ${name}`);
    const isSuccess = await saveDataToCloud();
    if (isSuccess) {
        playUISound('success');
        showToast('เพิ่มรายการข้อมูลเรียบร้อยแล้ว', 'success');
        renderApp();
        document.getElementById('create-modal').classList.add('hidden');
    }
});

// 6. Lightbox Fullscreen & Universal Download/Share
function openLightbox(mediaItem) {
    playUISound('click');
    const modal = document.getElementById('lightbox-modal');
    const display = document.getElementById('lightbox-media-display');
    const title = document.getElementById('lightbox-title');
    const caption = document.getElementById('lightbox-caption');
    const date = document.getElementById('lightbox-date');
    const downloadBtn = document.getElementById('btn-lightbox-download');
    const shareBtn = document.getElementById('btn-lightbox-share');
    const deleteBtn = document.getElementById('btn-lightbox-delete');

    title.innerText = mediaItem.name;
    caption.innerText = mediaItem.caption || (mediaItem.type === 'note' ? mediaItem.content : '') || 'ไม่มีคำอธิบายเพิ่มเติม';
    date.innerText = 'บันทึกเมื่อ: ' + (mediaItem.createdAt ? new Date(mediaItem.createdAt).toLocaleString('th-TH') : 'ไม่ระบุวัน');

    const src = mediaItem.mediaSrc || mediaItem.content;
    const isVideo = mediaItem.mediaType === 'video' || (typeof src === 'string' && src.startsWith('data:video'));

    if (isVideo) {
        display.innerHTML = `<video src="${src}" controls autoplay class="lightbox-media-el"></video>`;
    } else {
        display.innerHTML = `<img src="${src}" alt="${mediaItem.name}" class="lightbox-media-el" />`;
    }

    downloadBtn.href = src;
    downloadBtn.download = `${mediaItem.name}.${isVideo ? 'mp4' : 'png'}`;

    shareBtn.onclick = () => shareMedia(mediaItem.name, src);

    deleteBtn.onclick = async () => {
        if (confirm(`ลบ "${mediaItem.name}" ไปยังถังขยะใช่หรือไม่?`)) {
            mediaItem.isDeleted = true;
            await saveDataToCloud();
            closeLightbox();
            renderApp();
            showToast('ย้ายสื่อลงถังขยะเรียบร้อย', 'info');
        }
    };

    modal.classList.remove('hidden');
    refreshIcons();
}

function closeLightbox() {
    document.getElementById('lightbox-modal').classList.add('hidden');
    document.getElementById('lightbox-media-display').innerHTML = '';
}

async function shareMedia(title, urlOrData) {
    playUISound('click');
    if (navigator.share && !urlOrData.startsWith('data:')) {
        try {
            await navigator.share({ title: title, url: urlOrData });
        } catch (err) {}
    } else {
        navigator.clipboard.writeText(urlOrData);
        showToast('คัดลอกข้อมูลสื่อไปยังคลิปบอร์ดแล้ว', 'success');
    }
}

// 7. Quick Scratchpad & Realtime Clock
async function saveScratchpad() {
    appData.quickScratchpad = document.getElementById('quick-scratchpad').value;
    await saveDataToCloud();
    playUISound('success');
    showToast('บันทึก Quick Scratchpad เรียบร้อย', 'success');
}

function startRealtimeClockAndReminders() {
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('current-clock');
        if (clockEl) clockEl.innerText = now.toLocaleString('th-TH');

        const nowISO = now.toISOString().slice(0, 16);
        appData.items.forEach(async (item) => {
            if (!item.isDeleted && item.reminderTime === nowISO && !item.notified) {
                item.notified = true;
                playUISound('success');
                await saveDataToCloud();
                showToast(`⏰ แจ้งเตือนถึงเวลา: ${item.name}`, 'info');
            }
        });
    }, 1000);
}

// 8. Render Application UI
function renderApp() {
    const active = appData.items.filter(i => !i.isDeleted && !i.isDefault);
    document.getElementById('stat-total').innerText = active.length;
    document.getElementById('stat-notes').innerText = active.filter(i => i.type === 'note' && !isMediaItem(i)).length;
    document.getElementById('stat-media').innerText = active.filter(i => isMediaItem(i)).length;
    document.getElementById('stat-links').innerText = active.filter(i => i.type === 'link').length;

    // Timeline Activities
    const activityBox = document.getElementById('recent-activity-list');
    if (activityBox) {
        activityBox.innerHTML = appData.activities.length ? appData.activities.map(a => `<div class="activity-item"><i data-lucide="check-circle-2"></i> <span>[${a.time}] ${a.text}</span></div>`).join('') : '<span style="color:var(--text-muted); font-size:0.8rem;">ยังไม่มีประวัติกิจกรรมล่าสุด</span>';
    }

    // Breadcrumb
    const breadcrumbEl = document.getElementById('breadcrumb');
    if (breadcrumbEl) {
        breadcrumbEl.innerHTML = `<span onclick="navigateToFolder('root')" class="bc-item"><i data-lucide="home"></i> หน้าแรก</span>`;
        if (appData.currentFolderId !== 'root') {
            const currentF = appData.items.find(i => i.id === appData.currentFolderId);
            if (currentF) breadcrumbEl.innerHTML += ` <i data-lucide="chevron-right" class="bc-sep"></i> <span class="bc-item active">${currentF.name}</span>`;
        }
    }

    // Grid / List View Rendering
    const fileListEl = document.getElementById('file-list');
    if (fileListEl) {
        fileListEl.innerHTML = '';
        const searchQuery = (document.getElementById('search-input')?.value || '').toLowerCase();
        let items = appData.items.filter(i => !i.isDeleted);
        
        if (searchQuery) {
            items = items.filter(i => i.name.toLowerCase().includes(searchQuery) || (i.caption && i.caption.toLowerCase().includes(searchQuery)) || (i.tags && i.tags.some(t => t.toLowerCase().includes(searchQuery))));
        } else {
            items = items.filter(i => i.parentId === appData.currentFolderId);
        }

        if (items.length === 0) {
            fileListEl.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-muted);"><i data-lucide="folder-open" style="width: 48px; height: 48px; margin-bottom: 8px;"></i><p>ไม่พบรายการข้อมูลในส่วนนี้</p></div>`;
        }

        // Render Pinned First
        items.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

        items.forEach(item => {
            const card = document.createElement('div');
            const tagsMarkup = item.tags && item.tags.length ? item.tags.map(t => `<span class="tag-badge">${t}</span>`).join('') : '';

            if (isMediaItem(item)) {
                card.className = 'media-card-modern';
                const src = item.mediaSrc || item.content;
                const isVideo = item.mediaType === 'video' || (typeof src === 'string' && src.startsWith('data:video'));
                
                card.innerHTML = `
                    <div class="media-preview-wrapper">
                        ${isVideo ? `<video src="${src}"></video><div class="play-overlay"><i data-lucide="play-circle"></i></div>` : `<img src="${src}" loading="lazy" />`}
                        <button class="btn-card-del" onclick="softDeleteItem('${item.id}', event)"><i data-lucide="x"></i></button>
                    </div>
                    <div class="media-card-body">
                        <div class="media-card-title">${item.isPinned ? '⭐ ' : ''}${item.name}</div>
                        <div>${tagsMarkup}</div>
                        ${item.caption ? `<div class="media-card-caption">${item.caption}</div>` : ''}
                    </div>
                `;
                card.onclick = () => openLightbox(item);
            } else {
                card.className = `file-card-modern ${item.type}`;
                let iconMarkup = item.type === 'folder' ? '<i data-lucide="folder"></i>' : item.type === 'link' ? '<i data-lucide="link-2"></i>' : '<i data-lucide="file-text"></i>';

                card.innerHTML = `
                    <div class="card-icon-box">${iconMarkup}</div>
                    <div class="card-info">
                        <div class="card-title">${item.isPinned ? '<span class="pin-badge">⭐</span>' : ''}${item.name}</div>
                        <div>${tagsMarkup}</div>
                        ${item.reminderTime ? `<div class="time-badge"><i data-lucide="clock"></i> ${item.reminderTime.replace('T', ' ')}</div>` : ''}
                    </div>
                    ${!item.isDefault ? `<button class="btn-card-del" onclick="softDeleteItem('${item.id}', event)"><i data-lucide="x"></i></button>` : ''}
                `;

                if (item.type === 'folder') card.onclick = () => { appData.currentFolderId = item.id; renderApp(); };
                else if (item.type === 'link' && item.content.startsWith('http')) card.onclick = () => window.open(item.content, '_blank');
                else card.onclick = () => openFileModal(item.id);
            }

            fileListEl.appendChild(card);
        });
    }

    // Trash List Rendering
    const trashListEl = document.getElementById('trash-list');
    const deletedItems = appData.items.filter(i => i.isDeleted);
    document.getElementById('trash-count').innerText = deletedItems.length;

    if (trashListEl) {
        trashListEl.innerHTML = '';
        deletedItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'trash-item-card';
            div.innerHTML = `
                <div class="trash-info">
                    <i data-lucide="file"></i>
                    <span>${item.name}</span>
                </div>
                <div class="trash-actions">
                    <button class="btn btn-sm btn-ghost" onclick="restoreItem('${item.id}')"><i data-lucide="rotate-ccw"></i> กู้คืน</button>
                    <button class="btn btn-sm btn-danger-outline" onclick="permanentlyDeleteItem('${item.id}')"><i data-lucide="trash-2"></i> ลบถาวร</button>
                </div>
            `;
            trashListEl.appendChild(div);
        });
    }

    refreshIcons();
}

async function softDeleteItem(id, e) {
    if (e) e.stopPropagation();
    const item = appData.items.find(i => i.id === id);
    if (item && !item.isDefault) {
        item.isDeleted = true;
        logActivity(`ย้ายรายการลงถังขยะ: ${item.name}`);
        await saveDataToCloud();
        renderApp();
        showToast(`ย้าย ${item.name} ไปยังถังขยะแล้ว`, 'info');
    }
}

async function restoreItem(id) {
    const item = appData.items.find(i => i.id === id);
    if (item) {
        item.isDeleted = false;
        await saveDataToCloud();
        renderApp();
        showToast(`กู้คืน ${item.name} สำเร็จ`, 'success');
    }
}

async function permanentlyDeleteItem(id) {
    if (confirm('ต้องการลบทิ้งถาวรหรือไม่?')) {
        appData.items = appData.items.filter(i => i.id !== id);
        await saveDataToCloud();
        renderApp();
        showToast('ลบรายการถาวรเรียบร้อยแล้ว', 'info');
    }
}

function openFileModal(id) {
    playUISound('click');
    const item = appData.items.find(i => i.id === id);
    if (!item) return;
    appData.activeEditingId = id;
    document.getElementById('modal-title').innerText = item.name;
    document.getElementById('modal-reminder-time').value = item.reminderTime || '';
    document.getElementById('modal-file-content').value = item.content || '';
    
    // Render Embedded Media inside Note
    const noteMediaDisplay = document.getElementById('modal-note-media-display');
    if (noteMediaDisplay) {
        noteMediaDisplay.innerHTML = '';
        if (item.attachedMedia && item.attachedMedia.length > 0) {
            noteMediaDisplay.classList.remove('hidden');
            item.attachedMedia.forEach(m => {
                const el = m.mediaType === 'video' ? `<video src="${m.src}" controls></video>` : `<img src="${m.src}" onclick="openLightbox({name:'${item.name}', mediaSrc:'${m.src}', mediaType:'image'})" />`;
                noteMediaDisplay.innerHTML += el;
            });
        } else {
            noteMediaDisplay.classList.add('hidden');
        }
    }

    document.getElementById('file-modal').classList.remove('hidden');
    refreshIcons();
}

async function shareActiveNote() {
    if (!appData.activeEditingId) return;
    const item = appData.items.find(i => i.id === appData.activeEditingId);
    if (item) {
        shareMedia(item.name, item.content);
    }
}

async function saveFileContent() {
    if (!appData.activeEditingId) return;
    const item = appData.items.find(i => i.id === appData.activeEditingId);
    if (item) {
        item.content = document.getElementById('modal-file-content').value;
        item.reminderTime = document.getElementById('modal-reminder-time').value;
        await saveDataToCloud();
        renderApp();
        document.getElementById('file-modal').classList.add('hidden');
        showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
    }
}

function updateStatus(isOnline) {
    const el = document.getElementById('sync-status');
    if (el) {
        el.innerHTML = isOnline ? '<i data-lucide="wifi"></i> Connected' : '<i data-lucide="wifi-off"></i> Offline';
        el.className = isOnline ? 'status-badge online' : 'status-badge offline';
        refreshIcons();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initMobileSidebar();
    document.getElementById('btn-open-create-modal')?.addEventListener('click', openCreateModal);
    document.getElementById('btn-close-create-modal')?.addEventListener('click', () => document.getElementById('create-modal').classList.add('hidden'));
    document.getElementById('btn-close-modal-cancel')?.addEventListener('click', () => document.getElementById('create-modal').classList.add('hidden'));
    document.getElementById('btn-close-modal')?.addEventListener('click', () => document.getElementById('file-modal').classList.add('hidden'));
    document.getElementById('btn-save-file')?.addEventListener('click', saveFileContent);
    document.getElementById('search-input')?.addEventListener('input', renderApp);
});