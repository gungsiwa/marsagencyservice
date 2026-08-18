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

// Modal Controllers & Dynamic Form Fields
function openCreateModal() {
    appData.stagedMediaFiles = [];
    const previewContainer = document.getElementById('media-previews-container');
    if (previewContainer) previewContainer.innerHTML = '';

    populateParentDropdown();
    toggleCreateFields();
    document.getElementById('create-modal')?.classList.remove('hidden');
    refreshIcons();
}

function closeCreateModal() {
    document.getElementById('create-modal')?.classList.add('hidden');
}

function toggleCreateFields() {
    const type = document.getElementById('create-type').value;
    const contentGroup = document.getElementById('content-input-group');
    const linkGroup = document.getElementById('link-input-group');
    const mediaGroup = document.getElementById('media-upload-group');

    contentGroup?.classList.add('hidden');
    linkGroup?.classList.add('hidden');
    mediaGroup?.classList.add('hidden');

    if (type === 'note') {
        contentGroup?.classList.remove('hidden');
        mediaGroup?.classList.remove('hidden');
    } else if (type === 'folder') {
        contentGroup?.classList.remove('hidden');
    } else if (type === 'link') {
        linkGroup?.classList.remove('hidden');
    } else if (type === 'media') {
        mediaGroup?.classList.remove('hidden');
    }
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
    const reminderTime = document.getElementById('create-reminder-time')?.value || '';
    
    let content = '';
    let mediaData = appData.stagedMediaFiles.length > 0 ? appData.stagedMediaFiles : [];

    if (type === 'link') {
        content = document.getElementById('create-link-url')?.value.trim() || '';
    } else if (type === 'media') {
        content = JSON.stringify(mediaData);
    } else if (type === 'note') {
        const textContent = document.getElementById('create-content')?.value || '';
        content = JSON.stringify({
            text: textContent,
            media: mediaData
        });
    } else {
        content = document.getElementById('create-content')?.value || '';
    }

    if (!title) {
        showToast('กรุณาระบุหัวข้อ/ชื่อรายการ', 'error');
        return;
    }

    const newItem = {
        id: 'item_' + Date.now(),
        name: title,
        type: type,
        parentId: parentId,
        tags: tags,
        content: content,
        reminderTime: reminderTime,
        createdAt: new Date().toISOString(),
        isDeleted: false
    };

    appData.items.push(newItem);
    appData.stagedMediaFiles = []; 
    addLog(`สร้าง ${type}: ${title}`);
    
    await syncToCloud();
    closeCreateModal();
    renderApp();
    showToast('สร้างรายการเรียบร้อยแล้ว', 'success');
}

// Handling Item Clicks & Smart Openers
function openItemDetail(itemId) {
    const item = appData.items.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'folder') {
        navigateToFolder(item.id);
        return;
    }

    if (item.type === 'link') {
        if (item.content) {
            let targetUrl = item.content.trim();
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = 'https://' + targetUrl;
            }
            window.open(targetUrl, '_blank');
        } else {
            showToast('ลิงก์นี้ยังไม่มี URL ปลายทาง', 'error');
        }
        return;
    }

    if (item.type === 'media') {
        openLightbox(item);
        return;
    }

    // เปิดหน้าต่างรายละเอียดโน้ต (Note View Mode)
    appData.activeEditingId = itemId;
    document.getElementById('modal-title').innerText = item.name;
    
    let rawContent = item.content || '';
    let textValue = rawContent;
    let mediaList = [];

    try {
        const parsed = JSON.parse(rawContent);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            textValue = parsed.text || '';
            mediaList = parsed.media || [];
        } else if (Array.isArray(parsed)) {
            mediaList = parsed;
            textValue = '';
        }
    } catch (e) {
        textValue = rawContent;
    }

    // แปลงข้อความลิงก์ให้เป็นปุ่มกดเปิดเว็บได้ทันทีในหน้าอ่าน
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const formattedText = textValue.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" style="color: var(--primary-cyan); text-decoration: underline; word-break: break-all;">${url}</a>`;
    });

    const noteContentEl = document.getElementById('modal-file-content');
    if (noteContentEl) {
        // ให้ซ่อน textarea หรือสลับไปโหมดแสดงผล (เราจะใช้ div แสดงผลเนื้อหาแทน เพื่อไม่ให้เป็นช่องพิมพ์)
        noteContentEl.value = textValue;
        noteContentEl.style.display = 'none'; // ซ่อนช่องแก้ไขตอนเปิดดูปกติ
    }

    // สร้างกล่องแสดงข้อความและมีเดียแบบอ่านอย่างเดียว
    let displayContainer = document.getElementById('modal-note-view-container');
    if (!displayContainer) {
        displayContainer = document.createElement('div');
        displayContainer.id = 'modal-note-view-container';
        displayContainer.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 15px; max-height: 250px; overflow-y: auto; line-height: 1.6; word-break: break-word;';
        noteContentEl?.parentNode.insertBefore(displayContainer, noteContentEl);
    }
    displayContainer.style.display = 'block';
    displayContainer.innerHTML = formattedText || '<span style="color: var(--text-muted);">ไม่มีเนื้อหาข้อความ</span>';

    // แสดงผลมีเดียพร้อมปุ่มดาวน์โหลด/แชร์
    const embeddedMediaBox = document.getElementById('modal-note-media-display');
    if (embeddedMediaBox) {
        embeddedMediaBox.innerHTML = '';
        if (mediaList.length > 0) {
            embeddedMediaBox.classList.remove('hidden');
            mediaList.forEach(media => {
                const mWrap = document.createElement('div');
                mWrap.style.cssText = 'margin: 10px 0; text-align: center; position: relative;';
                
                let mediaHtml = '';
                if (media.type && media.type.startsWith('image/')) {
                    mediaHtml = `<img src="${media.data}" style="max-width: 100%; max-height: 220px; border-radius: 6px; cursor: pointer;" onclick="openLightboxForData('${media.name}', '${media.data}', '${media.type}')" title="คลิกเพื่อดูขนาดใหญ่"/>`;
                } else if (media.type && media.type.startsWith('video/')) {
                    mediaHtml = `<video src="${media.data}" controls style="max-width: 100%; max-height: 220px; border-radius: 6px;"></video>`;
                }

                // เพิ่มปุ่มดาวน์โหลดไฟล์มีเดียแต่ละไฟล์โดยตรง
                mWrap.innerHTML = `
                    ${mediaHtml}
                    <div style="margin-top: 5px; display: flex; justify-content: center; gap: 8px;">
                        <a href="${media.data}" download="${media.name || 'mars-media'}" class="btn btn-sm btn-cyan" style="text-decoration: none; padding: 4px 10px; font-size: 11px;">
                            <i data-lucide="download" style="width: 12px; height: 12px;"></i> ดาวน์โหลด
                        </a>
                    </div>
                `;
                embeddedMediaBox.appendChild(mWrap);
            });
        } else {
            embeddedMediaBox.classList.add('hidden');
        }
    }
    
    const reminderInput = document.getElementById('modal-reminder-time');
    if (reminderInput) reminderInput.value = item.reminderTime || '';

    // ปรับปุ่มบันทึกให้เปลี่ยนเป็นปุ่ม "สลับโหมดแก้ไข" หรือคงปุ่มบันทึกเมื่อกดแก้ไข
    document.getElementById('file-modal')?.classList.remove('hidden');
    refreshIcons();
}

// ฟังก์ชันเปิดโหมดแก้ไขโน้ต (เมื่อผู้ใช้ต้องการพิมพ์แก้ข้อความ)
function enableNoteEditMode() {
    const noteContentEl = document.getElementById('modal-file-content');
    const displayContainer = document.getElementById('modal-note-view-container');
    if (noteContentEl && displayContainer) {
        displayContainer.style.display = 'none';
        noteContentEl.style.display = 'block';
        showToast('เปิดโหมดแก้ไขข้อความแล้ว', 'info');
    }
}

// เปิด Lightbox สำหรับมีเดียทั่วไป หรือมีเดียในโน้ต
function openLightbox(item) {
    const lightbox = document.getElementById('lightbox-modal');
    const display = document.getElementById('lightbox-media-display');
    const titleEl = document.getElementById('lightbox-title');
    const dateEl = document.getElementById('lightbox-date');
    const captionEl = document.getElementById('lightbox-caption');
    const downloadBtn = document.getElementById('btn-lightbox-download');

    if (!lightbox) return;

    titleEl.innerText = item.name;
    dateEl.innerText = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '';
    captionEl.innerText = item.tags ? `แท็ก: ${item.tags}` : 'ไม่มีแท็กเพิ่มเติม';

    display.innerHTML = '';

    try {
        let mediaFiles = [];
        const parsed = JSON.parse(item.content || '[]');
        if (Array.isArray(parsed)) {
            mediaFiles = parsed;
        } else if (parsed && parsed.media) {
            mediaFiles = parsed.media;
        }

        if (mediaFiles.length > 0) {
            mediaFiles.forEach(file => {
                const wrap = document.createElement('div');
                wrap.style.marginBottom = '15px';
                wrap.style.textAlign = 'center';
                
                if (file.type && file.type.startsWith('image/')) {
                    wrap.innerHTML = `<img src="${file.data}" style="max-width: 100%; max-height: 65vh; border-radius: 8px; object-fit: contain;" alt="${file.name}" />`;
                } else if (file.type && file.type.startsWith('video/')) {
                    wrap.innerHTML = `<video src="${file.data}" controls style="max-width: 100%; max-height: 65vh; border-radius: 8px;"></video>`;
                } else {
                    wrap.innerHTML = `<p>${file.name || 'ไฟล์มีเดีย'}</p>`;
                }
                display.appendChild(wrap);
            });
            if (mediaFiles[0]?.data && downloadBtn) {
                downloadBtn.href = mediaFiles[0].data;
                downloadBtn.download = mediaFiles[0].name || 'mars-media';
                downloadBtn.style.display = 'inline-flex';
            }
        } else {
            display.innerHTML = `<p style="color: var(--text-muted); text-align: center;">ไม่พบไฟล์ข้อมูลมีเดีย</p>`;
            if (downloadBtn) downloadBtn.style.display = 'none';
        }
    } catch (e) {
        display.innerHTML = `<img src="${item.content}" style="max-width: 100%; max-height: 65vh; border-radius: 8px;" />`;
        if (downloadBtn) {
            downloadBtn.href = item.content;
            downloadBtn.download = item.name || 'mars-media.png';
            downloadBtn.style.display = 'inline-flex';
        }
    }

    appData.activeEditingId = item.id;
    lightbox.classList.remove('hidden');
    refreshIcons();
}

function openLightboxForData(name, data, type) {
    const fakeItem = {
        id: appData.activeEditingId,
        name: name,
        createdAt: new Date().toISOString(),
        content: JSON.stringify([{ name, data, type }])
    };
    openLightbox(fakeItem);
}

function closeLightbox() {
    document.getElementById('lightbox-modal')?.classList.add('hidden');
}

function deleteLightboxMedia() {
    if (appData.activeEditingId) {
        deleteItemToTrash(appData.activeEditingId);
        closeLightbox();
    }
}

function shareLightboxMedia() {
    const downloadBtn = document.getElementById('btn-lightbox-download');
    if (downloadBtn && downloadBtn.href) {
        if (navigator.share) {
            navigator.share({
                title: document.getElementById('lightbox-title').innerText,
                url: downloadBtn.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(downloadBtn.href);
            showToast('คัดลอกลิงก์มีเดียลงคลิปบอร์ดแล้ว', 'success');
        }
    }
}

function shareActiveNote() {
    const item = appData.items.find(i => i.id === appData.activeEditingId);
    if (item) {
        const textToShare = `หัวข้อ: ${item.name}\nรายละเอียด: ${item.content}`;
        if (navigator.share) {
            navigator.share({ title: item.name, text: textToShare }).catch(() => {});
        } else {
            navigator.clipboard.writeText(textToShare);
            showToast('คัดลอกเนื้อหาโน้ตเรียบร้อย', 'success');
        }
    }
}

function closeFileModal() {
    document.getElementById('file-modal')?.classList.add('hidden');
}

async function saveFileEdits() {
    const item = appData.items.find(i => i.id === appData.activeEditingId);
    if (item) {
        const newText = document.getElementById('modal-file-content').value;
        
        try {
            const parsed = JSON.parse(item.content);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                parsed.text = newText;
                item.content = JSON.stringify(parsed);
            } else {
                item.content = newText;
            }
        } catch (e) {
            item.content = newText;
        }

        const reminderInput = document.getElementById('modal-reminder-time');
        if (reminderInput) item.reminderTime = reminderInput.value;

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
    const files = event.target.files;
    const previewContainer = document.getElementById('media-previews-container');
    if (!previewContainer) return;

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            appData.stagedMediaFiles.push({
                name: file.name,
                type: file.type,
                data: e.target.result
            });
            
            const thumb = document.createElement('div');
            thumb.style.display = 'inline-block';
            thumb.style.margin = '5px';
            thumb.style.position = 'relative';
            
            if (file.type.startsWith('image/')) {
                thumb.innerHTML = `<img src="${e.target.result}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />`;
            } else {
                thumb.innerHTML = `<div style="width: 60px; height: 60px; background: #333; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; border-radius: 4px;">VIDEO</div>`;
            }
            previewContainer.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    }
    showToast(`เลือกไฟล์เรียบร้อยแล้ว (${files.length} ไฟล์)`, 'info');
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