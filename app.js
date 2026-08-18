const SUPABASE_URL = 'https://lxnlhqzypezvelmspevv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fhisWr9_VvHAwb2INiMCQQ_ya5nXH9q';

let supabaseClient = null;

// ป้องกัน Crash หากยังไม่ได้เชื่อมต่อ Supabase Library
function initSupabase() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) {
            console.warn("Supabase initialization error:", e);
        }
    }
}

const AUTH_CONFIG = { username: 'admin', password: 'marscloud2026' };

let appData = {
    currentFolderId: 'root',
    items: [],
    activeEditingId: null,
    stagedMediaFiles: [],
    viewMode: 'grid',
    quickScratchpad: '',
    activities: []
};

function refreshIcons() {
    setTimeout(() => {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }, 50);
}

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

// Mobile Sidebar Control
function initMobileSidebar() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const closeBtn = document.getElementById('btn-close-sidebar');
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    function openSidebar(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        sidebar?.classList.add('open');
        backdrop?.classList.add('active');
        document.body.classList.add('sidebar-opened');
    }

    function closeSidebar(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        sidebar?.classList.remove('open');
        backdrop?.classList.remove('active');
        document.body.classList.remove('sidebar-opened');
    }

    toggleBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    backdrop?.addEventListener('click', closeSidebar);
}

// Auth Controller
function checkAuth() {
    if (sessionStorage.getItem('mars_auth') === 'true') {
        showApp();
    } else {
        document.getElementById('login-screen')?.classList.remove('hidden');
        document.getElementById('app-screen')?.classList.add('hidden');
        refreshIcons();
    }
}

function showApp() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app-screen')?.classList.remove('hidden');
    initSupabase();
    loadDataFromCloud();
    startClock();
    refreshIcons();
}

function logout() {
    sessionStorage.removeItem('mars_auth');
    location.reload();
}

// Clock Component
function startClock() {
    setInterval(() => {
        const el = document.getElementById('current-clock');
        if (el) {
            const now = new Date();
            el.innerText = now.toLocaleTimeString('th-TH');
        }
    }, 1000);
}

// Tab & Navigation System
function switchTab(tabName, activeNavId) {
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.remove('hidden');

    const navItem = document.getElementById(activeNavId);
    if (navItem) navItem.classList.add('active');

    refreshIcons();
}

function navigateToFolder(folderId) {
    appData.currentFolderId = folderId;
    switchTab('files', 'nav-files');
    renderApp();
}

// Data Management & Cloud Sync
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
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.from('mars_data').select('*').eq('key', 'mars_app_state').maybeSingle();
            if (data && data.value) {
                appData.items = data.value.items || [];
                appData.quickScratchpad = data.value.scratchpad || '';
                appData.activities = data.value.activities || [];
            }
        } catch (err) {
            console.warn("Cloud load fallback to local:", err);
        }
    }
    
    initDefaultFolders();
    const pad = document.getElementById('quick-scratchpad');
    if (pad) pad.value = appData.quickScratchpad;
    
    renderApp();
}

async function saveScratchpad() {
    const pad = document.getElementById('quick-scratchpad');
    if (pad) {
        appData.quickScratchpad = pad.value;
        showToast('บันทึก Scratchpad เรียบร้อย', 'success');
    }
}

function renderApp() {
    const activeItems = appData.items.filter(i => !i.isDeleted && !i.isDefault);
    
    // Update Stats
    const totalEl = document.getElementById('stat-total');
    if (totalEl) totalEl.innerText = activeItems.length;

    const notesEl = document.getElementById('stat-notes');
    if (notesEl) notesEl.innerText = activeItems.filter(i => i.type === 'note').length;

    const mediaEl = document.getElementById('stat-media');
    if (mediaEl) mediaEl.innerText = activeItems.filter(i => i.type === 'media').length;

    const linksEl = document.getElementById('stat-links');
    if (linksEl) linksEl.innerText = activeItems.filter(i => i.type === 'link').length;

    const trashEl = document.getElementById('trash-count');
    if (trashEl) trashEl.innerText = appData.items.filter(i => i.isDeleted).length;

    // Render Files List
    const fileListEl = document.getElementById('file-list');
    if (fileListEl) {
        fileListEl.innerHTML = '';
        let items = appData.items.filter(i => !i.isDeleted && i.parentId === appData.currentFolderId);

        if (items.length === 0) {
            fileListEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-muted);">ไม่พบรายการข้อมูลในโฟลเดอร์นี้</div>`;
        } else {
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'file-card-modern';
                card.style.cssText = 'background: var(--card-bg); border: 1px solid var(--border-glow); border-radius: 8px; padding: 16px; margin-bottom: 10px;';
                card.innerHTML = `<div class="card-info"><div class="card-title" style="font-weight: 600;">${item.name}</div></div>`;
                fileListEl.appendChild(card);
            });
        }
    }
    refreshIcons();
}

// App Entry Point
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initMobileSidebar();

    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value.trim();
        if (u === AUTH_CONFIG.username && p === AUTH_CONFIG.password) {
            sessionStorage.setItem('mars_auth', 'true');
            showApp();
        } else {
            document.getElementById('login-error')?.classList.remove('hidden');
        }
    });
});