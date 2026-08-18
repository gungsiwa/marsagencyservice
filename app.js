const SUPABASE_URL = 'https://lxnlhqzypezvelmspevv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fhisWr9_VvHAwb2INiMCQQ_ya5nXH9q';

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
        if (window.lucide) window.lucide.createIcons();
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

// ระบบจัดการ Mobile Sidebar (เปิด/ปิด แบบปลอดภัย ไม่บล็อกทัชสกรีน)
function initMobileSidebar() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const closeBtn = document.getElementById('btn-close-sidebar');
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    function openSidebar() {
        sidebar?.classList.add('open');
        backdrop?.classList.add('active');
    }

    function closeSidebar() {
        sidebar?.classList.remove('open');
        backdrop?.classList.remove('active');
    }

    toggleBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSidebar();
    });

    closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
    });

    backdrop?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
    });

    // ปิดอัตโนมัติเมื่อกดเลือกเมนูบนมือถือ
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

// ตรวจสอบระบบล็อกอิน
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
    loadDataFromCloud();
    refreshIcons();
}

// จัดการข้อมูล Supabase
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
    if (!supabaseClient) {
        initDefaultFolders();
        renderApp();
        return;
    }
    try {
        const { data } = await supabaseClient.from('mars_data').select('*').eq('key', 'mars_app_state').maybeSingle();
        if (data && data.value) {
            appData.items = data.value.items || [];
            appData.quickScratchpad = data.value.scratchpad || '';
            appData.activities = data.value.activities || [];
        }
        initDefaultFolders();
        renderApp();
    } catch (err) {
        initDefaultFolders();
        renderApp();
    }
}

function renderApp() {
    const active = appData.items.filter(i => !i.isDeleted && !i.isDefault);
    const totalEl = document.getElementById('stat-total');
    if (totalEl) totalEl.innerText = active.length;

    const fileListEl = document.getElementById('file-list');
    if (fileListEl) {
        fileListEl.innerHTML = '';
        let items = appData.items.filter(i => !i.isDeleted && i.parentId === appData.currentFolderId);

        if (items.length === 0) {
            fileListEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: #9ca3af;">ไม่พบรายการข้อมูลในส่วนนี้</div>`;
        } else {
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'file-card-modern';
                card.innerHTML = `<div class="card-info"><div class="card-title">${item.name}</div></div>`;
                fileListEl.appendChild(card);
            });
        }
    }
    refreshIcons();
}

// เริ่มต้นระบบเมื่อเปิดหน้าเว็บ
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