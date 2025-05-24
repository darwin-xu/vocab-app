import React, { useState, useEffect, useCallback } from 'react'
import { marked } from 'marked'
import './app.css'
import {
    login, register, fetchVocab, addWord, removeWords,
    openaiCall, ttsCall, logout
} from './api'

const PAGE_SIZE = 20;

interface VocabItem { word: string; add_date: string }
function App() {
    const [view, setView] = useState<'auth' | 'vocab'>('auth')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [authMsg, setAuthMsg] = useState('')
    const [q, setQ] = useState('')
    const [vocab, setVocab] = useState<VocabItem[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [popup, setPopup] = useState<{ word: string; x: number; y: number; func?: string } | null>(null)
    const [hover, setHover] = useState<{ show: boolean; x: number; y: number; content: string }>({ show: false, x: 0, y: 0, content: '' })

    // check login on mount
    useEffect(() => {
        if (localStorage.getItem('sessionToken')) setView('vocab')
    }, [])

    // memoized loader
    const loadVocab = useCallback(async () => {
        try {
            const data = await fetchVocab(q, page, PAGE_SIZE)
            setVocab(data.results)
            setTotalPages(Math.max(1, Math.ceil(data.total / PAGE_SIZE)))
            setSelected(new Set())
        } catch {
            logout()
        }
    }, [q, page])

    // trigger load when view becomes 'vocab'
    useEffect(() => {
        if (view === 'vocab') loadVocab()
    }, [view, loadVocab])

    async function handleAuth(isRegister = false) {
        try {
            if (isRegister) await register(username, password)
            else await login(username, password)
            setView('vocab'); setAuthMsg('')
        } catch (e) {
            setAuthMsg((e as Error).message)
        }
    }

    async function handleAdd() {
        if (q) { await addWord(q); setQ(''); loadVocab() }
    }

    async function handleRemove() {
        await removeWords(Array.from(selected)); loadVocab()
    }

    function toggleSelect(word: string) {
        const s = new Set(selected)
        if (s.has(word)) s.delete(word)
        else s.add(word)
        setSelected(s)
    }

    function openMenu(e: React.MouseEvent, word: string) {
        e.stopPropagation(); setPopup({ word, x: e.pageX, y: e.pageY })
    }

    async function doPopup(action: string) {
        if (!popup) return
        const text = await openaiCall(popup.word, action)
        setHover({ show: true, x: popup.x, y: popup.y, content: text })
        setPopup(null)
    }

    function closeHover() { setHover(h => ({ ...h, show: false })) }

    return view === 'auth' ? (
        <div className="container">
            <h1>Login / Register</h1>
            <div id="auth-container">
                <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <button onClick={() => handleAuth(false)}>Login</button>
                <button onClick={() => handleAuth(true)}>Register</button>
                <div id="auth-message">{authMsg}</div>
            </div>
        </div>
    ) : (
        <div onClick={() => {
            if (popup) setPopup(null)
            closeHover()
        }}>
            <div id="login-status">
                👤 {localStorage.getItem('username')} <button onClick={logout}>Logout</button>
            </div>
            <div className="container">
                <h1>Vocabulary</h1>
                <div className="field-row">
                    <input id="word" placeholder="Word (type to search)…" value={q}
                        onChange={e => setQ(e.target.value)} />
                    <button id="addBtn" onClick={handleAdd}>Add Word</button>
                </div>
                <table>
                    <thead>
                        <tr><th></th><th>Word</th><th></th><th></th><th>Added</th></tr>
                    </thead>
                    <tbody>
                        {vocab.map(r => (
                            <tr key={r.word}>
                                <td><input type="checkbox" checked={selected.has(r.word)} onChange={() => toggleSelect(r.word)} /></td>
                                <td><span className="montserrat-unique" onClick={e => openMenu(e, r.word)}>{r.word}</span></td>
                                <td><button className="dict-btn" onClick={() => window.open(`https://dictionary.cambridge.org/dictionary/english/${r.word}`)}><img src="https://dictionary.cambridge.org/favicon.ico" alt="Cambridge" /></button></td>
                                <td><button className="mw-btn" onClick={() => window.open(`https://www.merriam-webster.com/dictionary/${r.word}`)}><img src="https://www.merriam-webster.com/favicon.ico" alt="MW" /></button></td>
                                <td>{r.add_date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button id="removeBtn" disabled={!selected.size} onClick={handleRemove}>Remove</button>
            </div>
            <div id="pagination">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&lt;</button>
                {[...Array(totalPages)].map((_, i) => <span key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</span>)}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>&gt;</button>
            </div>
            {popup && (
                <div className="popup-menu" style={{ left: popup.x, top: popup.y }}>
                    <button onClick={() => doPopup('define')}>Define</button>
                    <button onClick={() => doPopup('example')}>Example</button>
                    <button onClick={() => doPopup('synonym')}>Synonym</button>
                </div>
            )}
            {hover.show && (
                <div id="hover-window" className="show" style={{ left: hover.x, top: hover.y }} onClick={() => {
                    ttsCall(hover.content).then(b64 => new Audio(`data:audio/wav;base64,${b64}`).play()); closeHover();
                }} dangerouslySetInnerHTML={{ __html: marked(hover.content) }} />
            )}
        </div>
    )
}

export default App
