const SUPABASE_URL = 'https://lxnlhqzypezvelmspevv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fhisWr9_VvHAwb2INiMCQQ_ya5nXH9q';

let supabaseClient = null;

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

function addLog(activityText) {
    const timeStr = new Date().toLocaleTimeString('th-TH');
    appData.activities.unshift(`[${timeStr}] ${activityText}`);
    if (appData.activities.length > 20) appData.activities.pop();
    renderLogs();
}

function renderLogs() {
    const listEl = document.getElementById('recent-activity-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (appData.activities.length === 0) {
        listEl.innerHTML = `<div class="activity-item">ยังไม่มีประวัติกิจกรรม</div>`;
        return;
    }
    appData.activities.forEach(act => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerText = act;
        listEl.appendChild(item);
    });
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

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
}

// Auth System
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

function startClock() {
    setInterval(() => {
        const el = document.getElementById('current-clock');
        if (el) {
            const now = new Date();
            el.innerText = now.toLocaleTimeString('th-TH');
        }
    }, 1000);
}

// Navigation Tabs
function switchTab(tabName, activeNavId) {
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.remove('hidden');

    const navItem = document.getElementById(activeNavId);
    if (navItem) navItem.classList.add('active');

    if (tabName === 'trash') renderTrash();
    refreshIcons();
}

function navigateToFolder(folderId) {
    appData.currentFolderId = folderId;
    switchTab('files', 'nav-files');
    renderApp();
}

function setTileView(mode) {
    appData.viewMode = mode;
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    const container = document.getElementById('file-list');

    if (mode === 'grid') {
        btnGrid?.classList.add('active');
        btnList?.classList.remove('active');
        container?.classList.remove('view-list');
        container?.classList.add('view-grid');
    } else {
        btnList?.classList.remove('active');
        btnGrid?.classList.add('active');
        container?.classList.remove('view-grid');
        container?.classList.add('view-list');
    }
}

// Data Handling & Sync
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
    let loaded = false;
    
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('mars_data').select('*').eq('key', 'mars_app_state').maybeSingle();
            if (!error && data && data.value) {
                appData.items = data.value.items || [];
                appData.quickScratchpad = data.value.scratchpad || '';
                appData.activities = data.value.activities || [];
                loaded = true;
            }
        } catch (err) {
            console.warn("Cloud load fallback to local:", err);
        }
    }
    
    if (!loaded) {
        const localSave = localStorage.getItem('mars_app_state_backup');
        if (localSave) {
            try {
                const parsed = JSON.parse(localSave);
                appData.items = parsed.items || [];
                appData.quickScratchpad = parsed.scratchpad || '';
                appData.activities = parsed.activities || [];
            } catch (e) {
                console.error("Local backup parse error", e);
            }
        }
    }

    initDefaultFolders();
    const pad = document.getElementById('quick-scratchpad');
    if (pad) pad.value = appData.quickScratchpad;
    
    renderLogs();
    renderApp();
}

async function syncToCloud() {
    const statePayload = {
        items: appData.items,
        scratchpad: appData.quickScratchpad,
        activities: appData.activities
    };
    localStorage.setItem('mars_app_state_backup', JSON.stringify(statePayload));

    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('mars_data').upsert({
                key: 'mars_app_state',
                value: statePayload
            }, { onConflict: 'key' });
            
            if (error) {
                console.error("Supabase Sync Error:", error);
            }
        } catch (err) {
            console.warn("Cloud sync exception:", err);
        }
    }
}

async function saveScratchpad() {
    const pad = document.getElementById('quick-scratchpad');
    if (pad) {
        appData.quickScratchpad = pad.value;
        addLog("อัปเดต Quick Scratchpad");
        await syncToCloud();
        showToast('บันทึก Scratchpad เรียบร้อย', 'success');
    }
}

function renderApp() {
    const activeItems = appData.items.filter(i => !i.isDeleted && !i.isDefault);
    
    document.getElementById('stat-total').innerText = activeItems.length;
    document.getElementById('stat-notes').innerText = activeItems.filter(i => i.type === 'note').length;
    document.getElementById('stat-media').innerText = activeItems.filter(i => i.type === 'media').length;
    document.getElementById('stat-links').innerText = activeItems.filter(i => i.type === 'link').length;
    document.getElementById('trash-count').innerText = appData.items.filter(i => i.isDeleted).length;

    const fileListEl = document.getElementById('file-list');
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    if (fileListEl) {
        fileListEl.innerHTML = '';
        let items = appData.items.filter(i => !i.isDeleted && i.parentId === appData.currentFolderId);

        if (searchVal) {
            items = items.filter(i => i.name.toLowerCase().includes(searchVal) || (i.tags && i.tags.toLowerCase().includes(searchVal)));
        }

        if (items.length === 0) {
            fileListEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-muted);">ไม่พบรายการข้อมูลในโฟลเดอร์นี้</div>`;
        } else {
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'file-card-modern';
                
                let icon = item.type === 'folder' ? 'folder' : item.type === 'note' ? 'file-text' : item.type === 'media' ? 'image' : 'link';
                
                card.innerHTML = `
                    <div class="card-info" onclick="openItemDetail('${item.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i data-lucide="${icon}" style="color: var(--primary-cyan);"></i>
                                <div class="card-title" style="font-weight: 600;">${item.name}</div>
                            </div>
                            <button class="btn btn-sm btn-danger-outline" onclick="event.stopPropagation(); deleteItemToTrash('${item.id}')" title="ย้ายไปถังขยะ">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                `;
                fileListEl.appendChild(card);
            });
        }
    }
    refreshIcons();
}

async function deleteItemToTrash(id) {
    const item = appData.items.find(i => i.id === id);
    if (item) {
        item.isDeleted = true;
        addLog(`ย้ายไปถังขยะ: ${item.name}`);
        await syncToCloud();
        renderApp();
        showToast('ย้ายรายการไปถังขยะเรียบร้อย', 'info');
    }
}

function renderTrash() {
    const trashListEl = document.getElementById('trash-list');
    if (!trashListEl) return;
    trashListEl.innerHTML = '';

    const deletedItems = appData.items.filter(i => i.isDeleted);
    if (deletedItems.length === 0) {
        trashListEl.innerHTML = `<div style="text-align: center; padding: 40px 0; color: var(--text-muted);">ไม่มีรายการในถังขยะ</div>`;
        return;
    }

    deletedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card-modern';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.innerHTML = `
            <div><strong>${item.name}</strong></div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-sm btn-cyan" onclick="restoreItem('${item.id}')"><i data-lucide="rotate-ccw"></i> คืนค่า</button>
                <button class="btn btn-sm btn-danger-outline" onclick="permanentlyDeleteItem('${item.id}')"><i data-lucide="x"></i> ลบถาวร</button>
            </div>
        `;
        trashListEl.appendChild(card);
    });
    refreshIcons();
}

// Modal Controllers
function openCreateModal() {
    populateParentDropdown();
    document.getElementById('create-modal')?.classList.remove('hidden');
    refreshIcons();
}

function closeCreateModal() {
    document.getElementById('create-modal')?.classList.add('hidden');
}

function toggleCreateFields() {
    const type = document.getElementById('create-type').value;
    const linkGroup = document.getElementById('link-input-group');
    const mediaGroup = document.getElementById('media-upload-group');

    linkGroup?.classList.add('hidden');
    mediaGroup?.classList.add('hidden');

    if (type === 'link') linkGroup?.classList.remove('hidden');
    if (type === 'media') mediaGroup?.classList.remove('hidden');
}

function populateParentDropdown() {
    const select = document.getElementById('create-parent');
    if (!select) return;
    select.innerHTML = `<option value="root">📁 หน้าหลัก (Root)</option>`;
    
    appData.items.filter(i => i.type === 'folder' && !i.isDeleted).forEach(f => {
        select.innerHTML += `<option value="${f.id}">📁 ${f.name}</option>`;
    });
}

async function submitCreateItem() {
    const type = document.getElementById('create-type').value;
    const parentId = document.getElementById('create-parent').value;
    const title = document.getElementById('create-title').value.trim();
    const tags = document.getElementById('create-tags').value.trim();
    const content = document.getElementById('create-content').value;

    if (!title) {
        showToast('กรุณาระบุหัวข้อ/ชื่อไฟล์', 'error');
        return;
    }

    const newItem = {
        id: 'item_' + Date.now(),
        name: title,
        type: type,
        parentId: parentId,
        tags: tags,
        content: content,
        createdAt: new Date().toISOString(),
        isDeleted: false
    };

    appData.items.push(newItem);
    addLog(`สร้าง ${type}: ${title}`);
    
    await syncToCloud();
    
    closeCreateModal();
    renderApp();
    showToast('สร้างรายการเรียบร้อยแล้ว', 'success');
}

function openItemDetail(itemId) {
    const item = appData.items.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'folder') {
        navigateToFolder(item.id);
        return;
    }

    appData.activeEditingId = itemId;
    document.getElementById('modal-title').innerText = item.name;
    document.getElementById('modal-file-content').value = item.content || '';
    document.getElementById('file-modal')?.classList.remove('hidden');
    refreshIcons();
}

function closeFileModal() {
    document.getElementById('file-modal')?.classList.add('hidden');
}

async function saveFileEdits() {
    const item = appData.items.find(i => i.id === appData.activeEditingId);
    if (item) {
        item.content = document.getElementById('modal-file-content').value;
        addLog(`แก้ไข: ${item.name}`);
        await syncToCloud();
        showToast('บันทึกการแก้ไขเรียบร้อย', 'success');
        closeFileModal();
        renderApp();
    }
}

async function restoreItem(id) {
    const item = appData.items.find(i => i.id === id);
    if (item) {
        item.isDeleted = false;
        addLog(`คืนค่า: ${item.name}`);
        await syncToCloud();
        renderTrash();
        renderApp();
        showToast('คืนค่ารายการเรียบร้อย', 'success');
    }
}

async function permanentlyDeleteItem(id) {
    appData.items = appData.items.filter(i => i.id !== id);
    addLog(`ลบถาวรไอเทม`);
    await syncToCloud();
    renderTrash();
    renderApp();
    showToast('ลบรายการถาวรแล้ว', 'success');
}

function handleFileSelect(event) {
    showToast(`เลือกไฟล์เรียบร้อยแล้ว (${event.target.files.length} ไฟล์)`, 'info');
}

function closeLightbox() {
    document.getElementById('lightbox-modal')?.classList.add('hidden');
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