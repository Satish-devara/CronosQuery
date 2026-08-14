import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // Auth state
  const [username, setUsername] = useState('satish');
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');

  // Record states
  const [key, setKey] = useState('');
  const [payload, setPayload] = useState('{\n  "amount": 2500,\n  "currency": "USD",\n  "status": "APPROVED"\n}');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  
  // SSE Event logs
  const [logs, setLogs] = useState([]);
  const consoleEndRef = useRef(null);

  // Time-travel Slider States
  const [sliderVal, setSliderVal] = useState(0);

  useEffect(() => {
    if (results.length > 0) {
      const endTimes = results.map(r => r.systemEndTime ? new Date(r.systemEndTime).getTime() : new Date().getTime());
      const maxT = Math.max(...endTimes);
      setSliderVal(maxT);
    }
  }, [results]);

  const getSliderBounds = () => {
    if (results.length === 0) return { min: 0, max: 100 };
    const times = results.map(r => new Date(r.systemStartTime).getTime());
    const endTimes = results.map(r => r.systemEndTime ? new Date(r.systemEndTime).getTime() : new Date().getTime());
    const min = Math.min(...times);
    const max = Math.max(...endTimes);
    return {
      min: min === max ? min - 60000 : min,
      max: min === max ? max + 60000 : max
    };
  };

  const bounds = getSliderBounds();

  const getActiveRecordAtSliderVal = () => {
    if (results.length === 0) return null;
    const sorted = [...results].sort((a, b) => new Date(a.systemStartTime).getTime() - new Date(b.systemStartTime).getTime());
    return sorted.find(r => {
      const start = new Date(r.systemStartTime).getTime();
      const end = r.systemEndTime ? new Date(r.systemEndTime).getTime() : Infinity;
      return sliderVal >= start && sliderVal <= end;
    });
  };

  const activeAtSlider = getActiveRecordAtSliderVal();

  const BACKEND_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
  const API_BASE = `${BACKEND_URL}/api/records`;
  const AUTH_BASE = `${BACKEND_URL}/api/auth`;

  // Initialize start/end query timestamps to recent window (30m ago to 30m ahead)
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000);
    const end = new Date(now.getTime() + 30 * 60 * 1000);
    
    const formatInputDateTime = (date) => {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    setStartTime(formatInputDateTime(start));
    setEndTime(formatInputDateTime(end));
  }, []);

  // Listen to Server-Sent Events (SSE) from the backend
  useEffect(() => {
    const eventSource = new EventSource(`${BACKEND_URL}/api/records/events`);

    eventSource.addEventListener('connected', (event) => {
      addLog('system', event.data);
    });

    eventSource.addEventListener('kafka-event', (event) => {
      addLog('kafka', `Kafka Message Received: ${event.data}`);
    });

    eventSource.addEventListener('ai-security-log', (event) => {
      const isThreat = event.data.includes('🚨') || event.data.includes('THREAT');
      addLog(isThreat ? 'threat' : 'ai', event.data);
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection lost or error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto scroll terminal to the bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (type, message) => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Handle Login to get JWT Token
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${AUTH_BASE}/login?username=${username}`);
      const jwtToken = response.data;
      setToken(jwtToken);
      localStorage.setItem('jwt_token', jwtToken);
      setMessage('Successfully logged in and obtained JWT token!');
      addLog('system', `User '${username}' logged in successfully`);
    } catch (err) {
      console.error(err);
      setMessage('Login failed. Check backend connection.');
      addLog('threat', `Login failed for user '${username}'`);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('jwt_token');
    setMessage('Logged out successfully.');
    addLog('system', 'User logged out and token cleared');
  };

  // Helper to get Axios config with Bearer token
  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}?key=${key}`, payload, {
        headers: { 
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage(`Successfully saved version ID: ${response.data.id}`);
      
      // Auto query history to show the update immediately
      setTimeout(() => {
        triggerHistoryQuery(key);
      }, 500);
    } catch (err) {
      console.error(err);
      setMessage('Error saving record (Are you logged in with a valid JWT?)');
      addLog('threat', `Unauthorized attempt or failure to save key '${key}'`);
    }
  };

  const handleRangeQuery = async (e) => {
    e.preventDefault();
    triggerHistoryQuery(key);
  };

  const triggerHistoryQuery = async (queryKey) => {
    if (!queryKey) return;
    try {
      const formattedStart = startTime.length === 16 ? `${startTime}:00` : startTime;
      const formattedEnd = endTime.length === 16 ? `${endTime}:00` : endTime;

      const response = await axios.get(`${API_BASE}/timerange`, {
        ...getAuthHeader(),
        params: {
          key: queryKey,
          startTime: formattedStart,
          endTime: formattedEnd
        }
      });

      setResults(response.data);
      setMessage(`Loaded version history for key '${queryKey}'.`);
    } catch (err) {
      console.error(err);
      setResults([]);
      setMessage('No records found for key or unauthorized access.');
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return 'Active (Present)';
    try {
      const date = new Date(isoStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  };

  const getPayloadDiff = (currentRaw, previousRaw) => {
    if (!previousRaw) return null;
    try {
      const current = JSON.parse(currentRaw);
      const previous = JSON.parse(previousRaw);

      if (typeof current !== 'object' || typeof previous !== 'object' || current === null || previous === null) {
        return null;
      }

      const diffs = [];
      const allKeys = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]));

      for (const key of allKeys) {
        const inPrev = key in previous;
        const inCurr = key in current;

        if (inPrev && inCurr) {
          if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
            diffs.push({
              key,
              type: 'modified',
              oldVal: previous[key],
              newVal: current[key]
            });
          }
        } else if (inPrev) {
          diffs.push({
            key,
            type: 'removed',
            oldVal: previous[key]
          });
        } else {
          diffs.push({
            key,
            type: 'added',
            newVal: current[key]
          });
        }
      }

      return diffs.length > 0 ? diffs : null;
    } catch (e) {
      if (currentRaw !== previousRaw) {
        return [{
          key: 'Content',
          type: 'modified',
          oldVal: previousRaw.substring(0, 30) + (previousRaw.length > 30 ? '...' : ''),
          newVal: currentRaw.substring(0, 30) + (currentRaw.length > 30 ? '...' : '')
        }];
      }
      return null;
    }
  };

  const setDemoKey = (demoKey) => {
    setKey(demoKey);
    triggerHistoryQuery(demoKey);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Premium Dashboard Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6V12L16 14" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            ChronosQuery Dashboard
          </h1>
          <p>Enterprise Bitemporal Database Debugger & AI Anomaly Detector</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {token ? (
            <span className="status-badge active">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              Authenticated
            </span>
          ) : (
            <span className="status-badge inactive">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
              No Active Token
            </span>
          )}
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="dashboard-container">
        
        {/* Left Column: Forms */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Authentication Panel */}
          <div className="glass-card section-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Security Credentials (JWT)
            </h3>
            
            {!token ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Dev Username</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Enter username" 
                    required 
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Generate Signed JWT Token
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Current Token</label>
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '11px', 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)',
                    wordBreak: 'break-all',
                    color: 'var(--text-muted)'
                  }}>
                    {token}
                  </div>
                </div>
                <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%' }}>
                  Revoke & Clear Token
                </button>
              </div>
            )}
          </div>

          {/* Create/Update Record */}
          <div className="glass-card section-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              Bitemporal State Upsert
            </h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Record Key</label>
                <input 
                  type="text" 
                  value={key} 
                  onChange={(e) => setKey(e.target.value)} 
                  placeholder="e.g. test-key, transaction-99" 
                  required 
                />
                
                {/* Preset demo tags */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Demo keys:</span>
                  <button type="button" onClick={() => setDemoKey('transaction-99')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#c084fc', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>transaction-99</button>
                  <button type="button" onClick={() => setDemoKey('user-status')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#6366f1', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>user-status</button>
                </div>
              </div>
              
              <div className="form-group">
                <label>Payload (Text / JSON)</label>
                <textarea 
                  value={payload} 
                  onChange={(e) => setPayload(e.target.value)} 
                  required 
                  rows="4"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                />
              </div>
              
              <button type="submit" className="btn-primary">
                Commit Bitemporal Version
              </button>
            </form>
          </div>

          {/* Range Query */}
          <div className="glass-card section-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Time-Travel History Query
            </h3>
            
            <form onSubmit={handleRangeQuery} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Target Key</label>
                <input 
                  type="text" 
                  value={key} 
                  onChange={(e) => setKey(e.target.value)} 
                  placeholder="Enter key to search history" 
                  required 
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>System Start Time</label>
                  <input 
                    type="datetime-local" 
                    step="1" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>System End Time</label>
                  <input 
                    type="datetime-local" 
                    step="1" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              
              <button type="submit" className="btn-secondary">
                Search Bitemporal Window
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Visual Timeline */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="glass-card section-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Time Travel State Timeline
            </h3>

            {message && (
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderLeft: '4px solid var(--primary)', 
                padding: '12px 16px', 
                borderRadius: '0 8px 8px 0', 
                fontSize: '14px',
                color: '#c7d2fe',
                marginBottom: '20px'
              }}>
                {message}
              </div>
            )}

            {results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Time Travel Slider Control */}
                <div style={{ marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      Drag to Time-Travel:
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '12px', fontWeight: 'bold' }}>
                      {sliderVal ? formatDateTime(new Date(sliderVal).toISOString()) : 'Loading...'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={bounds.min}
                    max={bounds.max}
                    value={sliderVal}
                    onChange={(e) => setSliderVal(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', outline: 'none', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Earliest Update</span>
                    <span>Present (Live)</span>
                  </div>

                  {/* Dynamic Preview Card */}
                  <div style={{ marginTop: '16px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ display: 'flex', gap: '6px', alignItems: 'center', fontWeight: 'bold', color: '#a5b4fc' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }}></span>
                        State at Selected Time
                      </span>
                      {activeAtSlider ? (
                        <span className="version-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>ID: {activeAtSlider.id}</span>
                      ) : (
                        <span className="version-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>Null State</span>
                      )}
                    </div>
                    {activeAtSlider ? (
                      <pre style={{ margin: 0, padding: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#34d399', fontSize: '12.5px', fontFamily: 'var(--font-mono)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {activeAtSlider.payload}
                      </pre>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12.5px' }}>
                        No version was active at this timestamp.
                      </div>
                    )}
                  </div>
                </div>

                <div className="timeline-wrapper" style={{ flexGrow: 1 }}>
                  <div className="timeline">
                    {results.map((res, index) => {
                      const isActive = res.systemEndTime === null;
                      const isHighlighted = activeAtSlider && activeAtSlider.id === res.id;
                      return (
                        <div key={res.id || index} className="timeline-item">
                          <span 
                            className={`timeline-dot ${isActive ? 'active' : ''}`}
                            style={{
                              background: isHighlighted ? 'var(--accent)' : undefined,
                              boxShadow: isHighlighted ? '0 0 12px var(--accent)' : undefined
                            }}
                          ></span>
                          <div 
                            className="timeline-content"
                            style={{
                              borderColor: isHighlighted ? 'var(--accent)' : undefined,
                              background: isHighlighted ? 'rgba(236, 72, 153, 0.05)' : undefined,
                              transform: isHighlighted ? 'scale(1.01)' : undefined
                            }}
                          >
                            <div className="timeline-header">
                              <span className="version-tag">ID: {res.id}</span>
                              {isActive ? (
                                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Active</span>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Superseded</span>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                              <div className="time-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Valid Start: {formatDateTime(res.systemStartTime)}
                              </div>
                              <div className="time-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                  <line x1="16" y1="2" x2="16" y2="6"></line>
                                  <line x1="8" y1="2" x2="8" y2="6"></line>
                                  <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                Valid End: {formatDateTime(res.systemEndTime)}
                              </div>
                            </div>

                            <div className="payload-display">
                              {res.payload}
                            </div>

                            {/* Render Bitemporal Diff Delta */}
                            {(() => {
                              const prevRes = results[index + 1];
                              const diff = getPayloadDiff(res.payload, prevRes?.payload);
                              if (!diff) return null;
                              return (
                                <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Delta Changes (from prev version):
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                                    {diff.map((d, i) => {
                                      if (d.type === 'modified') {
                                        return (
                                          <div key={i} style={{ color: '#fbbf24', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                            <span>🟨 <strong>{d.key}</strong>:</span>
                                            <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{typeof d.oldVal === 'object' ? JSON.stringify(d.oldVal) : String(d.oldVal)}</span>
                                            <span>➔</span>
                                            <span style={{ fontWeight: 'bold' }}>{typeof d.newVal === 'object' ? JSON.stringify(d.newVal) : String(d.newVal)}</span>
                                          </div>
                                        );
                                      } else if (d.type === 'added') {
                                        return (
                                          <div key={i} style={{ color: '#34d399', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span>🟩 <strong>{d.key}</strong> added:</span>
                                            <span style={{ fontWeight: 'bold' }}>{typeof d.newVal === 'object' ? JSON.stringify(d.newVal) : String(d.newVal)}</span>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div key={i} style={{ color: '#f87171', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span>🟥 <strong>{d.key}</strong> removed (was: {typeof d.oldVal === 'object' ? JSON.stringify(d.oldVal) : String(d.oldVal)})</span>
                                          </div>
                                        );
                                      }
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-logs" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>No state changes searched or found yet.</span>
              </div>
            )}
          </div>
        </section>

        {/* Bottom Panel: Live Log Terminal */}
        <section className="console-log-section">
          <div className="glass-card section-card">
            <div className="console-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="console-dots">
                  <span className="console-dot-item" style={{ background: '#ff5f56' }}></span>
                  <span className="console-dot-item" style={{ background: '#ffbd2e' }}></span>
                  <span className="console-dot-item" style={{ background: '#27c93f' }}></span>
                </div>
                <span style={{ fontWeight: 'bold', color: 'var(--text-main)', letterSpacing: '0.5px' }}>Live Security Auditing & Event logs Stream</span>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#27c93f', display: 'inline-block', animation: 'ping 1.5s infinite' }}></span>
                  Connected
                </span>
                <button type="button" onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: '#ff4f5e', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>Clear Console</button>
              </div>
            </div>

            <div className="console-terminal">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="console-log-row">
                    <span className="log-time">[{log.timestamp}]</span>
                    <span className={`log-type ${log.type}`}>{log.type}</span>
                    <span className="log-msg" style={{ color: log.type === 'threat' ? '#ff6b6b' : '#f1f5f9' }}>{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="empty-logs">
                  Waiting for backend Kafka operations or AI transaction checks... (Perform an upsert above to trigger events)
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;