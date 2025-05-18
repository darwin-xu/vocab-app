// JavaScript code moved from index.html
// ...existing code from <script type="module">...</script> in index.html...

const wordEl = document.getElementById('word');
const listEl = document.getElementById('list');
const addBtn = document.getElementById('addBtn');

let currentPage = 1;
const pageSize = 20;
let totalItems = 0;
let totalPages = 1;

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
    const word = wordEl.value.trim();
    if (!word) return;
    // Check if word already exists in the current list
    const existing = Array.from(listEl.querySelectorAll('td.montserrat-unique')).some(td => td.textContent === word);
    if (existing) return;
    await fetch('/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
    });
    wordEl.value = '';
    refreshVocabulary();
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
    const res = await fetch(`/vocab?q=${encodeURIComponent(q)}&page=${currentPage}&pageSize=${pageSize}`);
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
    await fetch('/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: selected })
    });
    refreshVocabulary();
});

addBtn.addEventListener('click', addWord);
wordEl.addEventListener('input', () => { currentPage = 1; refreshVocabulary(); });
document.addEventListener('DOMContentLoaded', () => {
    refreshVocabulary();
    const table = document.querySelector('table');
    if (table) table.style.marginBottom = '4em';
});
