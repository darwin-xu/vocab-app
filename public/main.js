// JavaScript code moved from index.html
// ...existing code from <script type="module">...</script> in index.html...

const wordEl = document.getElementById('word');
const listEl = document.getElementById('list');
const addBtn = document.getElementById('addBtn');

let currentPage = 1;
const pageSize = 20;
let totalItems = 0;
let totalPages = 1;

let sessionToken = localStorage.getItem('sessionToken') || '';

function setSessionToken(token) {
    sessionToken = token;
    localStorage.setItem('sessionToken', token);
}

function clearSessionToken() {
    sessionToken = '';
    localStorage.removeItem('sessionToken');
}

async function authRequest(url, options = {}) {
    options.headers = options.headers || {};
    if (sessionToken) {
        options.headers['Authorization'] = 'Bearer ' + sessionToken;
    }
    return fetch(url, options);
}

const rel = ts => {
    const diff = Date.now() - Date.parse(ts);
    const d = 86_400_000;
    const days = diff / d;
    if (days < 1) return 'Today';
    if (days < 30) return Math.floor(days) + 'd';
    if (days < 365) return Math.floor(days / 30) + 'mo';
    return Math.floor(days / 365) + 'y';
};

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function addWord() {
    console.log('addWord called');
    const word = wordEl.value.trim();
    if (!word) return;
    const existing = Array.from(listEl.querySelectorAll('td.montserrat-unique')).some(td => td.textContent === word);
    if (existing) return;
    try {
        const res = await authRequest('/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word })
        });
        console.log('addWord response status:', res.status);
        const text = await res.text();
        console.log('addWord response body:', text);
        if (!res.ok) {
            alert('Failed to add word: ' + text);
            return;
        }
        wordEl.value = '';
        refreshVocabulary();
    } catch (e) {
        alert('Error adding word: ' + (e && e.message ? e.message : e));
    }
}

function renderPagination() {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;
    // Show up to 5 page numbers, centered on currentPage, ascending order (oldest to newest)
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    // < for previous (older), > for next (newer)
    const prev = document.createElement('span');
    prev.textContent = '<';
    prev.className = 'pagination-prev';
    if (currentPage > 1) {
        prev.addEventListener('click', () => {
            currentPage--;
            refreshVocabulary();
        });
    }
    paginationEl.appendChild(prev);
    for (let i = start; i <= end; i++) {
        const num = document.createElement('span');
        num.textContent = i;
        num.className = 'pagination-num' + (i === currentPage ? ' active' : '');
        if (i !== currentPage) {
            num.addEventListener('click', () => {
                currentPage = i;
                refreshVocabulary();
            });
        }
        paginationEl.appendChild(num);
    }
    const next = document.createElement('span');
    next.textContent = '>';
    next.className = 'pagination-next';
    if (currentPage < totalPages) {
        next.addEventListener('click', () => {
            currentPage++;
            refreshVocabulary();
        });
    }
    paginationEl.appendChild(next);
}

async function refreshVocabulary() {
    const q = wordEl.value;
    const res = await authRequest(`/vocab?q=${encodeURIComponent(q)}&page=${currentPage}&pageSize=${pageSize}`);
    if (res.status === 401) {
        clearSessionToken();
        showAuthUI(true);
        return;
    }
    const data = await res.json();
    const results = data.results || [];
    totalItems = data.total || 0;
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    listEl.innerHTML = results.map(r =>
        `<tr>
            <td><input type="checkbox" class="row-check" data-word="${r.word}"></td>
            <td class="montserrat-unique word-cell" data-word="${r.word}"><span class="word-text" data-word="${r.word}">${r.word}</span></td>
            <td><button class="dict-btn" data-word="${r.word}" title="Open Cambridge Dictionary"><img src="https://dictionary.cambridge.org/favicon.ico" alt="Cambridge Dictionary"></button></td>
            <td><button class="mw-btn" data-word="${r.word}" title="Open Merriam-Webster"><img src="https://www.merriam-webster.com/favicon.ico" alt="Merriam-Webster"></button></td>
            <td>${rel(r.add_date)}</td>
        </tr>`
    ).join('');
    renderPagination();
    updateRemoveBtn();
    // Add event listeners for checkboxes
    listEl.querySelectorAll('.row-check').forEach(cb => {
        cb.addEventListener('change', updateRemoveBtn);
    });
    // Add event listeners for dictionary buttons
    listEl.querySelectorAll('.dict-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const word = btn.getAttribute('data-word');
            window.open(`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`, '_blank');
        });
    });
    // Add event listeners for Merriam-Webster buttons
    listEl.querySelectorAll('.mw-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const word = btn.getAttribute('data-word');
            window.open(`https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`, '_blank');
        });
    });
    // Add event listeners for word text popup menu
    listEl.querySelectorAll('.word-text').forEach(span => {
        span.addEventListener('click', wordTextMenuHandler);
    });
}

// Popup menu logic
let popupMenu = null;
function wordTextMenuHandler(e) {
    e.stopPropagation();
    // Hide hover-window if visible
    const hover = document.getElementById('hover-window');
    if (hover && hover.classList.contains('show')) {
        hover.classList.remove('show');
    }
    if (popupMenu) {
        closePopupMenu();
        return;
    }
    const word = this.getAttribute('data-word');
    popupMenu = document.createElement('div');
    popupMenu.className = 'popup-menu';
    popupMenu.style.left = e.pageX + 'px';
    popupMenu.style.top = e.pageY + 'px';
    popupMenu.innerHTML = `
        <button class="popup-menu-item" data-action="define">Define</button><br>
        <button class="popup-menu-item" data-action="example">Example</button><br>
        <button class="popup-menu-item" data-action="synonym">Synonym</button>
    `;
    document.body.appendChild(popupMenu);
    popupMenu.querySelectorAll('.popup-menu-item').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (btn.getAttribute('data-action') === 'define' ||
                btn.getAttribute('data-action') === 'example' ||
                btn.getAttribute('data-action') === 'synonym') {
                // Show the definition hover window
                // Pass the word text element instead of the button
                const wordTextEl = document.querySelector(`.word-text[data-word="${word}"]`);
                showDefinitionHover(wordTextEl, word, btn.getAttribute('data-action'));
                closePopupMenu();
            } else {
                alert(`${btn.getAttribute('data-action')} for: ${word}`);
                closePopupMenu();
            }
        });
    });
}
function closePopupMenu() {
    if (popupMenu) {
        popupMenu.remove();
        popupMenu = null;
    }
}
document.addEventListener('click', function (e) {
    // Only close if click is not on a word text
    if (!e.target.classList.contains('word-text')) {
        closePopupMenu();
    }
});

// Add a hover window element to the page if not already present
if (!document.getElementById('hover-window')) {
    const hover = document.createElement('div');
    hover.id = 'hover-window';
    document.body.appendChild(hover);
    // Cache for /tts responses with 300s (5 min) expiration
    const ttsCache = {};
    const TTS_CACHE_TTL = 300 * 1000; // 300 seconds in ms

    // Add TTS on click (OpenAI TTS)
    let currentAudio = null;
    let ttsLoading = false; // Prevent parallel TTS requests
    hover.addEventListener('click', async function () {
        if (ttsLoading) return; // Prevent parallel requests
        // Only use the text after </strong> for TTS
        const html = hover.innerHTML;
        const match = html.match(/<strong>.*?<\/strong><br>([\s\S]*)/i);
        let ttsText = match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
        if (!ttsText) return;
        if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
            // Audio is playing, do not start a new one
            return;
        }
        const cacheKey = ttsText;
        const now = Date.now();
        if (ttsCache[cacheKey] && (now - ttsCache[cacheKey].ts < TTS_CACHE_TTL)) {
            currentAudio = new Audio('data:audio/wav;base64,' + ttsCache[cacheKey].audio);
            currentAudio.play();
            return;
        }
        ttsLoading = true;
        try {
            const res = await fetch(`/tts?text=${encodeURIComponent(ttsText)}`);
            if (res.ok) {
                const { audio } = await res.json();
                ttsCache[cacheKey] = { audio, ts: now };
                currentAudio = new Audio('data:audio/wav;base64,' + audio);
                currentAudio.play();
            }
        } catch (e) {
            // Optionally show error
        } finally {
            ttsLoading = false;
        }
    });
}

// Cache for /openai responses with 300s (5 min) expiration
const openaiCache = {};
const OPENAI_CACHE_TTL = 300 * 1000; // 300 seconds in ms

// Update hover window to support Markdown rendering
async function showDefinitionHover(wordEl, word, func) {
    const hover = document.getElementById('hover-window');
    hover.innerHTML = `<strong>${word}</strong><br>Loading`;
    const table = document.querySelector('table');
    const tableRect = table.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();
    let maxWidth = tableRect.width;
    if (isMobileDevice() && table) {
        hover.style.width = Math.min(tableRect.width - 20, window.innerWidth - 20) + 'px';
        hover.style.left = (tableRect.left + window.scrollX + 10) + 'px';
        hover.style.top = (wordRect.bottom + window.scrollY + 4) + 'px';
    } else {
        hover.style.width = Math.min(maxWidth, 400) + 'px';
        hover.style.left = (wordRect.left + window.scrollX) + 'px';
        hover.style.top = (wordRect.bottom + window.scrollY + 4) + 'px';
    }
    hover.classList.add('show');
    const cacheKey = `${word}::${func}`;
    const now = Date.now();
    if (openaiCache[cacheKey] && (now - openaiCache[cacheKey].ts < OPENAI_CACHE_TTL)) {
        hover.innerHTML = `<strong>${word}</strong><br>${marked.parse(openaiCache[cacheKey].data)}`;
        return;
    }
    try {
        const res = await fetch(`/openai?word=${encodeURIComponent(word)}&func=${func}`);
        if (res.ok) {
            const definition = await res.text();
            openaiCache[cacheKey] = { data: definition, ts: now };
            hover.innerHTML = `<strong>${word}</strong><br>${marked.parse(definition)}`;
        } else {
            hover.innerHTML = `<strong>${word}</strong><br>Could not fetch data.`;
        }
    } catch (e) {
        hover.innerHTML = `<strong>${word}</strong><br>Error fetching data.`;
    }
}

document.addEventListener('click', (e) => {
    const hover = document.getElementById('hover-window');
    if (hover && hover.classList.contains('show')) {
        // Only hide if click is NOT inside the hover-window
        if (!hover.contains(e.target)) {
            hover.classList.remove('show');
        }
    }
});

function getSelectedWords() {
    return Array.from(document.querySelectorAll('.row-check:checked')).map(cb => cb.getAttribute('data-word'));
}

function updateRemoveBtn() {
    const selected = getSelectedWords();
    const btn = document.getElementById('removeBtn');
    btn.style.display = selected.length > 0 ? 'block' : 'none';
}

document.getElementById('removeBtn').addEventListener('click', async () => {
    const selected = getSelectedWords();
    if (!selected.length) return;
    if (!confirm(`Are you sure you want to remove ${selected.length} word(s)?`)) return;
    await authRequest('/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: selected })
    });
    refreshVocabulary();
});

addBtn.addEventListener('click', addWord);

// Auth UI logic
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const authMsg = document.getElementById('auth-message');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');

function showAuthUI(show) {
    authContainer.style.display = show ? 'block' : 'none';
    document.querySelector('.container').style.display = show ? 'none' : 'block';
    document.getElementById('pagination').style.display = show ? 'none' : 'block';
}

function showAuthMessage(msg, isError = false) {
    authMsg.textContent = msg;
    authMsg.style.color = isError ? 'red' : 'green';
}

// Add login status to the top right of the .container
function renderLoginStatus() {
    let username = localStorage.getItem('username') || '';
    const container = document.querySelector('.container');
    let statusEl = document.getElementById('login-status-inline');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'login-status-inline';
        statusEl.style.position = 'fixed'; // Use fixed positioning for viewport
        statusEl.style.top = window.innerWidth <= 600 ? '6px' : '18px';
        statusEl.style.right = window.innerWidth <= 600 ? '10px' : '24px';
        statusEl.style.zIndex = '2000';
        statusEl.style.display = 'none';
        document.body.appendChild(statusEl);
    } else {
        // Update position on resize
        statusEl.style.top = window.innerWidth <= 600 ? '6px' : '18px';
        statusEl.style.right = window.innerWidth <= 600 ? '10px' : '24px';
    }
    if (!sessionToken) {
        statusEl.style.display = 'none';
        return;
    }
    if (!username) username = 'U';
    const initial = username.charAt(0).toUpperCase();
    statusEl.innerHTML = `<span id="login-status-avatar" style="display:inline-flex;top:2px;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#3b82f6;color:#fff;font-weight:700;font-size:1.18em;box-shadow:0 2px 8px rgba(0,0,0,0.10);cursor:pointer;user-select:none;">${initial}</span>`;
    statusEl.style.display = 'block';

    // Dropdown menu
    let dropdown = document.getElementById('login-status-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'login-status-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '46px';
        dropdown.style.right = '0';
        dropdown.style.background = '#fff';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.borderRadius = '7px';
        dropdown.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
        dropdown.style.minWidth = '120px';
        dropdown.style.display = 'none';
        dropdown.style.fontSize = '1em';
        dropdown.style.fontFamily = 'Inter,sans-serif';
        dropdown.innerHTML = `<button id="logoutBtn" style="width:100%;background:none;border:none;padding:10px 0 10px 0;font-size:1em;cursor:pointer;">Logout</button>`;
        statusEl.appendChild(dropdown);
    }
    // Toggle dropdown on avatar click
    const avatar = document.getElementById('login-status-avatar');
    avatar.onclick = (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };
    // Hide dropdown on outside click
    document.addEventListener('click', function hideDropdown(e) {
        if (dropdown.style.display === 'block' && !statusEl.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    // Logout handler
    document.getElementById('logoutBtn').onclick = () => {
        clearSessionToken();
        localStorage.removeItem('username');
        showAuthUI(true);
        renderLoginStatus();
    };
}

// Update login status display
function updateLoginStatus() {
    const statusEl = document.getElementById('login-status');
    let username = localStorage.getItem('username') || '';
    if (!sessionToken) {
        statusEl.textContent = '';
        return;
    }
    if (!username) {
        // Try to get username from token (not secure, but for demo)
        username = 'Logged in';
    }
    statusEl.innerHTML = `👤 <span style="font-weight:600">${username}</span> <button id="logoutBtn" style="margin-left:8px;font-size:0.95em;padding:2px 10px;background:#64748b;">Logout</button>`;
    document.getElementById('logoutBtn').onclick = () => {
        clearSessionToken();
        localStorage.removeItem('username');
        showAuthUI(true);
        updateLoginStatus();
    };
}

// Update username in localStorage on login
async function handleLoginOrRegister(isRegister) {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!username || !password) {
        showAuthMessage('Username and password required', true);
        return;
    }
    const endpoint = isRegister ? '/register' : '/login';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (res.ok) {
        if (isRegister) {
            showAuthMessage('Registration successful. Please log in.');
        } else {
            const data = await res.json();
            setSessionToken(data.token);
            localStorage.setItem('username', username);
            showAuthUI(false);
            refreshVocabulary();
            renderLoginStatus();
        }
    } else {
        const msg = await res.text();
        showAuthMessage(msg, true);
    }
}

authForm.addEventListener('submit', e => {
    e.preventDefault();
    handleLoginOrRegister(false);
});
registerBtn.addEventListener('click', e => {
    e.preventDefault();
    handleLoginOrRegister(true);
});

// Call renderLoginStatus on login/logout/page load
if (!sessionToken) {
    showAuthUI(true);
    renderLoginStatus();
} else {
    showAuthUI(false);
    renderLoginStatus();
}

wordEl.addEventListener('input', () => { currentPage = 1; refreshVocabulary(); });
document.addEventListener('DOMContentLoaded', () => {
    refreshVocabulary();
    const table = document.querySelector('table');
    if (table) table.style.marginBottom = '4em';
});
window.addEventListener('resize', renderLoginStatus);
