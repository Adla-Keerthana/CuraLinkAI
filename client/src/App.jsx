import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, BookOpen, FlaskConical, ChevronRight, Activity, Award, User, Clock, Loader2, Link as LinkIcon, ShieldCheck, Zap, Info, Database, Sparkles, Plus, Trash2, MessageSquare, ChevronDown, MoreHorizontal, Edit3, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Use environment variable for production, fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

// ─── Particle Field Background ────────────────────────────────────────────────
const ParticleField = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.8 + 0.4, opacity: Math.random() * 0.35 + 0.05
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw connections
      dots.forEach((d, i) => {
        dots.slice(i + 1).forEach(d2 => {
          const dist = Math.hypot(d.x - d2.x, d.y - d2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d2.x, d2.y);
            ctx.strokeStyle = `rgba(42,127,255,${0.04 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,197,253,${d.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="particle-canvas" />;
};

// ─── Status Orb ──────────────────────────────────────────────────────────────
const StatusOrb = ({ color = 'emerald' }) => (
  <span className={`status-orb status-orb--${color}`} />
);

// ─── Session Item with hover actions ─────────────────────────────────────────
const SessionItem = ({ session, isActive, onClick, onDelete, onRename }) => {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(session.preview || 'Untitled Session');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleRename = () => {
    onRename(session.sessionId, editVal);
    setEditing(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`session-item ${isActive ? 'session-item--active' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onClick={!editing ? onClick : undefined}
    >
      {isActive && <div className="session-item__indicator" />}

      <div className="session-item__icon">
        <MessageSquare size={13} />
      </div>

      <div className="session-item__body">
        {editing ? (
          <div className="session-item__edit" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="session-edit-input"
            />
            <button onClick={handleRename} className="session-edit-btn session-edit-btn--confirm"><Check size={11} /></button>
            <button onClick={() => setEditing(false)} className="session-edit-btn session-edit-btn--cancel"><X size={11} /></button>
          </div>
        ) : (
          <>
            <div className="session-item__title">{session.preview || 'Untitled Session'}</div>
            <div className="session-item__meta">
              <Clock size={9} />
              {formatDate(session.lastUpdate)}
              {session.messageCount > 0 && (
                <span className="session-item__count">{session.messageCount} msgs</span>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {hovered && !editing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="session-item__actions"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="session-action-btn"
              title="Rename"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            >
              <Edit3 size={11} />
            </button>
            <button
              className="session-action-btn session-action-btn--delete"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(session.sessionId); }}
            >
              <Trash2 size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Tab Badge ────────────────────────────────────────────────────────────────
const TabCount = ({ n }) => (
  <span className="tab-count">{n}</span>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem('curalink_sid') || Math.random().toString(36).substring(7)
  );
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionNames, setSessionNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('curalink_names') || '{}'); } catch { return {}; }
  });
  const [deletedSessions, setDeletedSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('curalink_deleted') || '[]'); } catch { return []; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [context, setContext] = useState({
    disease: 'General',
    patientName: '',
    location: '',
    intent: 'Research'
  });
  const [showContextEdit, setShowContextEdit] = useState(false);
  const [queryMode, setQueryMode] = useState('natural'); // 'natural' or 'structured'
  const [structuredDraft, setStructuredDraft] = useState({
    condition: '',
    intervention: '',
    location: '',
    patientName: ''
  });

  const saveNames = (names) => {
    setSessionNames(names);
    localStorage.setItem('curalink_names', JSON.stringify(names));
  };

  const saveDeleted = (deleted) => {
    setDeletedSessions(deleted);
    localStorage.setItem('curalink_deleted', JSON.stringify(deleted));
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions`);
      const filtered = res.data.filter(s => !deletedSessions.includes(s.sessionId));
      const enriched = filtered.map(s => ({
        ...s,
        preview: sessionNames[s.sessionId] || s.preview,
        messageCount: s.messageCount || 0
      }));
      setSessions(enriched);
    } catch (e) { console.error("Session list failed", e); }
  };

  const startNewChat = () => {
    const newId = Math.random().toString(36).substring(7);
    setSessionId(newId);
    setResults(null);
    setActiveTab('chat');
  };

  const handleDeleteSession = (sid) => {
    const newDeleted = [...deletedSessions, sid];
    saveDeleted(newDeleted);
    setSessions(prev => prev.filter(s => s.sessionId !== sid));
    if (sid === sessionId) {
      const remaining = sessions.filter(s => s.sessionId !== sid);
      if (remaining.length > 0) setSessionId(remaining[0].sessionId);
      else startNewChat();
    }
    setShowDeleteConfirm(null);
  };

  const handleRenameSession = (sid, newName) => {
    const newNames = { ...sessionNames, [sid]: newName };
    saveNames(newNames);
    setSessions(prev => prev.map(s => s.sessionId === sid ? { ...s, preview: newName } : s));
  };

  useEffect(() => {
    localStorage.setItem('curalink_sid', sessionId);
    const fetchHistory = async () => {
      setLoading(true);
      // Don't clear results here if you want a smooth transition, 
      // but we should reset them to null if it's a new session
      try {
        const res = await axios.get(`${API_BASE}/chat/${sessionId}`);
        const chatData = res.data || { messages: [] };
        
        if (chatData.messages && chatData.messages.length > 0) {
          setMessages(chatData.messages);
          const lastAI = [...chatData.messages].reverse().find(m => m.role === 'assistant');
          setResults(lastAI?.results || null);
        } else {
          setResults(null);
          setMessages([{
            role: 'assistant',
            text: "Systems online. I'm CuraLink AI — your advanced medical research architect. Ask me anything about medical literature, clinical trials, or research synthesis.",
            isWelcome: true
          }]);
        }
      } catch (e) {
        setResults(null);
        setMessages([{ role: 'assistant', text: "Protocol error: Failed to retrieve session data." }]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
    fetchSessions();
  }, [sessionId]);

  const handleSend = async () => {
    let userMsg = input.trim();
    let currentContext = { ...context };

    if (queryMode === 'structured') {
      if (!structuredDraft.condition.trim()) return;
      // Construct a readable message for the UI
      userMsg = `Structured Search: ${structuredDraft.condition}`;
      if (structuredDraft.intervention) userMsg += ` | Intervention: ${structuredDraft.intervention}`;
      if (input.trim()) userMsg += ` | Query: ${input.trim()}`;
      
      // Enrich context with structured fields
      currentContext = {
        ...currentContext,
        disease: structuredDraft.condition,
        location: structuredDraft.location || currentContext.location,
        intervention: structuredDraft.intervention
      };
    }

    if (!userMsg || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    if (queryMode === 'structured') {
      setStructuredDraft({ condition: '', intervention: '', location: '', patientName: '' });
      setQueryMode('natural'); // Switch back after structured submit
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/research`, {
        query: userMsg,
        sessionId,
        context: currentContext
      });
      const { summary, results: r } = res.data;
      setMessages(prev => [...prev, { role: 'assistant', text: summary, results: r }]);
      setResults(r);
      await fetchSessions();
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Protocol error: synthesis interrupted. Please retry.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const totalSources = results ? (results.publications?.length || 0) + (results.clinicalTrials?.length || 0) : 0;

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-2" />;
      if (line.startsWith('### ')) return <h3 key={i} className="md-h3">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="md-h2">{line.slice(3)}</h2>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="md-bold">{line.slice(2, -2)}</p>;
      if (line.startsWith('- ') || line.startsWith('* '))
        return <div key={i} className="md-li"><span className="md-li__dot">◆</span><span>{line.slice(2)}</span></div>;
      return <p key={i} className="md-p">{line}</p>;
    });
  };

  // Group sessions by time
  const groupedSessions = () => {
    const now = new Date();
    const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
    sessions.forEach(s => {
      const d = new Date(s.lastUpdate);
      const diff = Math.floor((now - d) / 86400000);
      if (diff === 0) groups.today.push(s);
      else if (diff === 1) groups.yesterday.push(s);
      else if (diff < 7) groups.thisWeek.push(s);
      else groups.older.push(s);
    });
    return groups;
  };

  const groups = groupedSessions();
  const hasAnySessions = sessions.length > 0;

  return (
    <div className="shell">
      <ParticleField />

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__glow" />

        {/* Logo */}
        <div className="sidebar__logo">
          <div className="logo-mark">
            <Activity size={18} />
            <div className="logo-mark__ring" />
          </div>
          <div>
            <span className="logo-name">CuraLink</span>
            <span className="logo-sub">Medical AI · v2.4</span>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pt-5 pb-3">
          <button onClick={startNewChat} className="new-chat-btn">
            <Plus size={15} strokeWidth={2.5} />
            <span>New Research Session</span>
            <Zap size={12} className="ml-auto opacity-60" />
          </button>
        </div>

        {/* Patient Context Settings */}
        <div className="sidebar__section sidebar__section--context">
          <div className="flex items-center justify-between mb-2">
            <p className="sidebar__eyebrow">Medical Context</p>
            <button 
              onClick={() => setShowContextEdit(!showContextEdit)}
              className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showContextEdit ? 'Save' : 'Edit'}
            </button>
          </div>
          
          <div className={`context-panel ${showContextEdit ? 'context-panel--editing' : ''}`}>
            {showContextEdit ? (
              <div className="space-y-2 p-1">
                <div className="context-field">
                  <label>Disease</label>
                  <input 
                    value={context.disease} 
                    onChange={e => setContext({...context, disease: e.target.value})}
                    placeholder="e.g. Parkinson's"
                  />
                </div>
                <div className="context-field">
                  <label>Location</label>
                  <input 
                    value={context.location} 
                    onChange={e => setContext({...context, location: e.target.value})}
                    placeholder="e.g. Toronto"
                  />
                </div>
                <div className="context-field">
                  <label>Patient Name</label>
                  <input 
                    value={context.patientName} 
                    onChange={e => setContext({...context, patientName: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
              </div>
            ) : (
              <div className="context-summary">
                <div className="context-chip"><Activity size={10} /> {context.disease}</div>
                {context.location && <div className="context-chip"><LinkIcon size={10} /> {context.location}</div>}
                {context.patientName && <div className="context-chip"><User size={10} /> {context.patientName}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Sessions */}
        <div className="sessions-container">
          {!hasAnySessions ? (
            <div className="sessions-empty">
              <MessageSquare size={28} strokeWidth={1} />
              <p>No sessions yet</p>
              <span>Start a new research query above</span>
            </div>
          ) : (
            <>
              {groups.today.length > 0 && (
                <div className="session-group">
                  <div className="session-group__label">Today</div>
                  {groups.today.map((s, i) => (
                    <SessionItem
                      key={i}
                      session={s}
                      isActive={sessionId === s.sessionId}
                      onClick={() => setSessionId(s.sessionId)}
                      onDelete={() => setShowDeleteConfirm(s.sessionId)}
                      onRename={handleRenameSession}
                    />
                  ))}
                </div>
              )}
              {groups.yesterday.length > 0 && (
                <div className="session-group">
                  <div className="session-group__label">Yesterday</div>
                  {groups.yesterday.map((s, i) => (
                    <SessionItem key={i} session={s} isActive={sessionId === s.sessionId}
                      onClick={() => setSessionId(s.sessionId)}
                      onDelete={() => setShowDeleteConfirm(s.sessionId)}
                      onRename={handleRenameSession} />
                  ))}
                </div>
              )}
              {groups.thisWeek.length > 0 && (
                <div className="session-group">
                  <div className="session-group__label">This Week</div>
                  {groups.thisWeek.map((s, i) => (
                    <SessionItem key={i} session={s} isActive={sessionId === s.sessionId}
                      onClick={() => setSessionId(s.sessionId)}
                      onDelete={() => setShowDeleteConfirm(s.sessionId)}
                      onRename={handleRenameSession} />
                  ))}
                </div>
              )}
              {groups.older.length > 0 && (
                <div className="session-group">
                  <div className="session-group__label">Older</div>
                  {groups.older.map((s, i) => (
                    <SessionItem key={i} session={s} isActive={sessionId === s.sessionId}
                      onClick={() => setSessionId(s.sessionId)}
                      onDelete={() => setShowDeleteConfirm(s.sessionId)}
                      onRename={handleRenameSession} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Intelligence Streams */}
        <div className="sidebar__section sidebar__section--streams">
          <p className="sidebar__eyebrow">Intelligence Streams</p>
          <div className="streams">
            {[
              { icon: BookOpen, label: 'PubMed', sub: '35M+ articles', color: 'blue' },
              { icon: LinkIcon, label: 'OpenAlex', sub: '250M+ works', color: 'cyan' },
              { icon: FlaskConical, label: 'ClinicalTrials', sub: '480K+ trials', color: 'purple' },
            ].map((s, i) => (
              <div key={i} className="nav-stream">
                <div className={`nav-stream__icon nav-stream__icon--${s.color}`}><s.icon size={14} /></div>
                <div>
                  <div className="nav-stream__label">{s.label}</div>
                  <div className="nav-stream__sub">{s.sub}</div>
                </div>
                <div className="nav-stream__dot" />
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="sidebar__section">
          <p className="sidebar__eyebrow">System Status</p>
          <div className="status-panel">
            <div className="status-row">
              <span className="status-label">Llama Engine</span>
              <span className="status-value status-value--on">Active <StatusOrb /></span>
            </div>
            <div className="status-row">
              <span className="status-label">Stream Latency</span>
              <span className="status-value" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>142ms</span>
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="sidebar__trust">
          <div className="trust-item"><ShieldCheck size={12} className="text-emerald-500" /> Secure Protocol</div>
          <div className="trust-item"><Award size={12} className="text-amber-500" /> ISO-27001 Certified</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        <header className="topbar">
          <nav className="tab-nav">
            <button className={`tab-btn ${activeTab === 'chat' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('chat')}>
              <Sparkles size={13} /> Assistant
            </button>
            <button className={`tab-btn ${activeTab === 'evidence' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('evidence')}>
              <Database size={13} /> Evidence
              {totalSources > 0 && <TabCount n={totalSources} />}
            </button>
          </nav>

          <div className="topbar__right">
            <div className="model-badge">
              <div className="model-badge__dot" />
              <span className="model-badge__label">llama-3.3-70b</span>
            </div>
            <button className="icon-btn"><Info size={15} /></button>
          </div>
        </header>

        <div className="panel-wrap">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="chat-panel">
                <div className="chat-feed">
                  {messages.map((ms, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i === messages.length - 1 ? 0 : 0 }}
                      className={`msg-row ${ms.role === 'user' ? 'msg-row--user' : 'msg-row--ai'}`}
                    >
                      <div className={`msg-avatar ${ms.role === 'user' ? 'msg-avatar--user order-2' : 'msg-avatar--ai'}`}>
                        {ms.role === 'user' ? <User size={14} /> : <Activity size={14} />}
                      </div>
                      <div className={`msg-bubble ${ms.role === 'user' ? 'msg-bubble--user mr-3' : 'msg-bubble--ai ml-3'}`}>
                        {ms.isWelcome && (
                          <div className="welcome-badge">
                            <Zap size={11} /> Ready
                          </div>
                        )}
                        {ms.role === 'assistant' ? renderMarkdown(ms.text) : <span>{ms.text}</span>}
                        {ms.results && (
                          <div className="msg-source-chip" onClick={() => { setResults(ms.results); setActiveTab('evidence'); }}>
                            <Database size={11} />
                            {(ms.results.publications?.length || 0) + (ms.results.clinicalTrials?.length || 0)} sources found →
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="msg-row msg-row--ai">
                      <div className="msg-avatar msg-avatar--ai"><Activity size={14} /></div>
                      <div className="msg-bubble msg-bubble--ai ml-3">
                        <div className="thinking-dots">
                          <span /><span /><span />
                        </div>
                        <span className="thinking-label">Synthesizing intelligence...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="input-dock">
                  <div className="query-mode-toggle">
                    <button 
                      className={`mode-tab ${queryMode === 'natural' ? 'mode-tab--active' : ''}`}
                      onClick={() => setQueryMode('natural')}
                    >
                      <Sparkles size={12} /> Natural Language
                    </button>
                    <button 
                      className={`mode-tab ${queryMode === 'structured' ? 'mode-tab--active' : ''}`}
                      onClick={() => setQueryMode('structured')}
                    >
                      <Database size={12} /> Structured Query
                    </button>
                  </div>

                  <div className="input-wrap">
                    {queryMode === 'natural' ? (
                      <textarea
                        ref={textareaRef}
                        className="chat-input scrollbar-hide"
                        placeholder="Ask about medical literature, clinical trials, or research synthesis..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                        }}
                      />
                    ) : (
                      <div className="structured-form">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Disease / Condition</label>
                            <input 
                              placeholder="e.g. Parkinson's disease" 
                              value={structuredDraft.condition}
                              onChange={e => setStructuredDraft({...structuredDraft, condition: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Intervention / Drug</label>
                            <input 
                              placeholder="e.g. Deep Brain Stimulation" 
                              value={structuredDraft.intervention}
                              onChange={e => setStructuredDraft({...structuredDraft, intervention: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Location (City/Country)</label>
                            <input 
                              placeholder="e.g. Toronto, Canada" 
                              value={structuredDraft.location}
                              onChange={e => setStructuredDraft({...structuredDraft, location: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Additional Query</label>
                            <input 
                              placeholder="e.g. Latest side effects" 
                              value={input}
                              onChange={e => setInput(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="input-actions">
                      <span className="input-hint">⏎ send · ⇧⏎ newline</span>
                      <button className="send-btn" onClick={handleSend} disabled={loading || (queryMode === 'natural' ? !input.trim() : !structuredDraft.condition.trim())}>
                        {loading ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="evidence-panel">
                {!results ? (
                  <div className="evidence-empty">
                    <Database size={52} strokeWidth={0.8} />
                    <p>No evidence synthesized yet</p>
                    <span>Send a research query to populate the evidence board</span>
                  </div>
                ) : (
                  <>
                    <div className="evidence-header">
                      <h2 className="evidence-title">Evidence Board</h2>
                      <div className="evidence-stats">
                        <div className="ev-stat"><BookOpen size={13} />{results.publications?.length || 0} Publications</div>
                        <div className="ev-stat"><FlaskConical size={13} />{results.clinicalTrials?.length || 0} Trials</div>
                      </div>
                    </div>
                    <div className="evidence-grid">
                      {results.publications?.map((p, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="evidence-card evidence-card--pub"
                        >
                          <div className="evidence-card__type">
                            <BookOpen size={11} /> Publication
                          </div>
                          <h4 className="evidence-card__title">{p.title}</h4>
                          <p className="evidence-card__meta">{p.year} · {p.authors}</p>
                          {p.abstract && <p className="evidence-card__abstract">{p.abstract.slice(0, 120)}...</p>}
                        </motion.div>
                      ))}
                      {results.clinicalTrials?.map((t, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (results.publications?.length || 0) * 0.05 + i * 0.05 }}
                          className="evidence-card evidence-card--trial"
                        >
                          <div className="evidence-card__type evidence-card__type--trial">
                            <FlaskConical size={11} /> Clinical Trial
                          </div>
                          <h4 className="evidence-card__title">{t.title}</h4>
                          <p className="evidence-card__meta">{t.status} · {t.location}</p>
                          <div className="trial-status-badge">{t.status}</div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="delete-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="delete-modal__icon"><Trash2 size={22} /></div>
              <h3>Delete Session?</h3>
              <p>This research session will be permanently removed from your history.</p>
              <div className="delete-modal__actions">
                <button onClick={() => setShowDeleteConfirm(null)} className="delete-modal__cancel">Cancel</button>
                <button onClick={() => handleDeleteSession(showDeleteConfirm)} className="delete-modal__confirm">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
