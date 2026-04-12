import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend as RLegend, ComposedChart
} from 'recharts';
import {
  CloudRain, ThermometerSun, Wind, Send, Bot, MessageSquare,
  AlertTriangle, AlertCircle, Droplets, CalendarDays, Sun,
  ChevronRight, X, Zap
} from 'lucide-react';

/* ── Inject global styles once ── */
const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  .dash-scroll::-webkit-scrollbar { width: 4px; }
  .dash-scroll::-webkit-scrollbar-track { background: transparent; }
  .dash-scroll::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
  @keyframes marquee-slide {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .bounce1 { animation: bounce 1s ease-in-out infinite; }
  .bounce2 { animation: bounce 1s ease-in-out 0.15s infinite; }
  .bounce3 { animation: bounce 1s ease-in-out 0.3s infinite; }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-6px); }
  }
`;

/* ── Tooltip style ── */
const TT = {
  backgroundColor: '#0a0f1e',
  borderColor: '#1e3a5f',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace',
};

/* ── Forecast Card ── */
function ForecastCard({ day, isFirst }) {
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const isRainy = day.precip > 0.5;
  const isHot = day.temp_max > 38;

  return (
    <div style={{
      flexShrink: 0,
      width: 76,
      borderRadius: 10,
      padding: '8px 6px',
      border: isFirst
        ? '1px solid rgba(56,189,248,0.5)'
        : isRainy
          ? '1px solid rgba(59,130,246,0.25)'
          : '1px solid rgba(255,255,255,0.06)',
      background: isFirst
        ? 'rgba(56,189,248,0.08)'
        : 'rgba(255,255,255,0.03)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 8, color: '#64748b', fontFamily: 'JetBrains Mono', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {isFirst ? 'TODAY' : dayName}
      </p>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
        {month} {dayNum}
      </p>
      <div style={{ fontSize: 18, lineHeight: 1.2, margin: '3px 0' }}>
        {isRainy ? '🌧️' : isHot ? '☀️' : '⛅'}
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', margin: 0, fontFamily: 'JetBrains Mono' }}>
        {day.temp_max}°
        <span style={{ color: '#475569', fontWeight: 400, fontSize: 9 }}>/{day.temp_min}°</span>
      </p>
      {isRainy && (
        <p style={{ fontSize: 8, color: '#38bdf8', margin: '2px 0 0', fontFamily: 'JetBrains Mono' }}>{day.precip}mm</p>
      )}
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({ label, value, icon, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ color: accent || '#38bdf8', display: 'flex', alignItems: 'center' }}>{icon}</div>
      <p style={{ fontSize: 9, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', margin: 0, fontFamily: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</h3>
    </div>
  );
}

/* ── Chart Card ── */
function ChartCard({ title, icon, accent, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: '12px 14px 10px',
    }}>
      <h3 style={{
        fontSize: 11, fontWeight: 600, color: '#94a3b8',
        margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: accent }}>{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════ */
export default function ClimateDashboard({ messages = [], setMessages, district }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [paused, setPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/climate-stats')
      .then(r => { if (!r.ok) throw new Error('Failed to fetch climate stats'); return r.json(); })
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    const d = district || 'korangi';
    fetch(`/api/forecast?district=${d}`)
      .then(r => r.json())
      .then(d => setForecast(d.days || []))
      .catch(() => { });
  }, [district]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let b = buf.indexOf('\n\n');
        while (b !== -1) {
          const chunk = buf.slice(0, b);
          buf = buf.slice(b + 2);
          if (chunk.startsWith('data: ')) {
            const raw = chunk.replace('data: ', '');
            if (raw === '[DONE]') { setChatLoading(false); return; }
            try {
              const p = JSON.parse(raw);
              if (p.text) {
                setMessages(prev => {
                  const n = [...prev];
                  n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + p.text };
                  return n;
                });
              }
            } catch (_) { }
          }
          b = buf.indexOf('\n\n');
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Ensure backend is running.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMd = t => t
    ? t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')
    : '';

  /* ── Screens ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020817', color: '#38bdf8', fontFamily: 'Syne' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #1e3a5f', borderTop: '3px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#64748b' }}>Loading 25 years of climate data…</p>
      </div>
    </div>
  );
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020817' }}>
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 32, textAlign: 'center', color: '#ef4444', fontFamily: 'Syne' }}>
        <AlertTriangle style={{ width: 40, height: 40, marginBottom: 12 }} />
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    </div>
  );

  const CHAT_W = 340;

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ══ ROOT ══ */}
      <div style={{ position: 'relative', height: '100%', width: '100%', background: '#020817', color: '#e2e8f0', overflow: 'hidden' }}>

        {/* ════ MAIN CONTENT — right edge stops before chat panel ════ */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          right: chatOpen ? CHAT_W : 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'right 0.3s ease',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '12px 20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                background: 'linear-gradient(90deg, #38bdf8, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}>
                Karachi Climate Insights
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#334155', letterSpacing: '0.05em' }}>
                25-YEAR ANALYSIS · 2000–2025
              </p>
            </div>
            {/* Chat toggle when closed */}
            {!chatOpen && (
              <button
                onClick={() => setChatOpen(true)}
                style={{
                  background: 'rgba(56,189,248,0.1)',
                  border: '1px solid rgba(56,189,248,0.3)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontFamily: 'Syne',
                  fontWeight: 600,
                }}
              >
                <MessageSquare style={{ width: 14, height: 14 }} />
                Climate AI
              </button>
            )}
          </div>

          {/* ── Scrollable Body ── */}
          <div className="dash-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 20px 16px' }}>

            {/* KPI Row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { label: 'Total Rain (25y)', value: `${stats.kpis.total_rain_25y} mm`, icon: <CloudRain style={{ width: 13, height: 13 }} />, accent: '#38bdf8' },
                { label: 'Hottest Day', value: `${stats.kpis.hottest_day_C}°C`, icon: <ThermometerSun style={{ width: 13, height: 13 }} />, accent: '#f97316' },
                { label: 'Avg Wind', value: `${stats.kpis.avg_wind_speed} m/s`, icon: <Wind style={{ width: 13, height: 13 }} />, accent: '#14b8a6' },
                { label: 'Rainiest Year', value: stats.kpis.rainiest_year, icon: <AlertCircle style={{ width: 13, height: 13 }} />, accent: '#a78bfa' },
                { label: 'Rainy Days', value: stats.kpis.total_rainy_days, icon: <Droplets style={{ width: 13, height: 13 }} />, accent: '#818cf8' },
                { label: 'Avg Temp (25y)', value: `${stats.kpis.avg_temp_25y}°C`, icon: <CalendarDays style={{ width: 13, height: 13 }} />, accent: '#fb7185' },
              ].map((k, i) => <KpiCard key={i} {...k} />)}
            </div>

            {/* Forecast Marquee */}
            {forecast && forecast.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 10,
              }}>
                <p style={{ fontSize: 10, color: '#475569', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <Sun style={{ width: 11, height: 11, color: '#fbbf24' }} />
                  16-Day Forecast — <span style={{ color: '#38bdf8' }}>{district || 'Korangi'}</span>
                </p>
                <div
                  style={{ overflow: 'hidden' }}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                >
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    width: 'max-content',
                    animation: 'marquee-slide 40s linear infinite',
                    animationPlayState: paused ? 'paused' : 'running',
                  }}>
                    {forecast.map((d, i) => <ForecastCard key={`a${i}`} day={d} isFirst={i === 0} />)}
                    {forecast.map((d, i) => <ForecastCard key={`b${i}`} day={d} isFirst={false} />)}
                  </div>
                </div>
              </div>
            )}

            {/* Charts 2×3 Grid — each chart is ~220px tall */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              {/* 1 — Annual Precipitation */}
              <ChartCard title="Annual Precipitation (mm)" icon={<CloudRain style={{ width: 13, height: 13 }} />} accent="#38bdf8">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.yearly}>
                    <defs>
                      <linearGradient id="gRain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1c2e" vertical={false} />
                    <XAxis dataKey="year" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={TT} />
                    <Area type="monotone" dataKey="total_rain" stroke="#38bdf8" strokeWidth={2} fill="url(#gRain)" name="Rain (mm)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 2 — Temperature Extremes */}
              <ChartCard title="Temperature Extremes (°C)" icon={<ThermometerSun style={{ width: 13, height: 13 }} />} accent="#f97316">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.yearly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1c2e" vertical={false} />
                    <XAxis dataKey="year" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={TT} />
                    <RLegend wrapperStyle={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="max_temp" stroke="#f97316" strokeWidth={2} dot={false} name="Max °C" />
                    <Line type="monotone" dataKey="min_temp" stroke="#06b6d4" strokeWidth={2} dot={false} name="Min °C" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 3 — Monthly Rainfall */}
              <ChartCard title="Avg Monthly Rainfall (mm)" icon={<Droplets style={{ width: 13, height: 13 }} />} accent="#818cf8">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.monthly}>
                    <defs>
                      <linearGradient id="gMonthly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1c2e" vertical={false} />
                    <XAxis dataKey="month_name" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="avg_rain" fill="url(#gMonthly)" radius={[5, 5, 0, 0]} name="Avg Rain" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 4 — Soil Moisture & ET */}
              <ChartCard title="Soil Moisture & Evapotranspiration" icon={<CloudRain style={{ width: 13, height: 13 }} />} accent="#34d399">
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={stats.yearly}>
                    <defs>
                      <linearGradient id="gSoil" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1c2e" vertical={false} />
                    <XAxis dataKey="year" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={TT} />
                    <RLegend wrapperStyle={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="avg_evapotranspiration" stroke="#fbbf24" fill="none" strokeWidth={2} name="Evapotransp." />
                    <Area type="monotone" dataKey="avg_soil_moisture" stroke="#10b981" fillOpacity={1} fill="url(#gSoil)" strokeWidth={2} name="Soil Moisture" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 5 — Rainfall vs Temp */}
              <ChartCard title="Rainfall vs Temperature (Yearly)" icon={<AlertCircle style={{ width: 13, height: 13 }} />} accent="#a78bfa">
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={stats.yearly}>
                    <defs>
                      <linearGradient id="gCorr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1c2e" vertical={false} />
                    <XAxis dataKey="year" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <YAxis yAxisId="rain" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} orientation="left" />
                    <YAxis yAxisId="temp" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} orientation="right" />
                    <Tooltip contentStyle={TT} />
                    <RLegend wrapperStyle={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono' }} />
                    <Bar yAxisId="rain" dataKey="total_rain" fill="url(#gCorr)" radius={[4, 4, 0, 0]} name="Rainfall (mm)" opacity={0.8} />
                    <Line yAxisId="temp" type="monotone" dataKey="avg_temp" stroke="#f97316" strokeWidth={2.5} dot={false} name="Avg Temp (°C)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 6 — Wind Speed */}
              <ChartCard title="Avg Annual Wind Speed (m/s)" icon={<Wind style={{ width: 13, height: 13 }} />} accent="#14b8a6">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.yearly}>
                    <defs>
                      <linearGradient id="gWind" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1c2e" vertical={false} />
                    <XAxis dataKey="year" stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#1e3a5f" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={TT} />
                    <Area type="monotone" dataKey="avg_wind" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#gWind)" name="Wind Speed" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          </div>
        </div>

        {/* ════ GLASS CHAT PANEL — absolute, slides in/out ════ */}
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          height: '100%',
          width: CHAT_W,
          transform: chatOpen ? 'translateX(0)' : `translateX(${CHAT_W}px)`,
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(5, 10, 25, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(56,189,248,0.15)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.6)',
          zIndex: 100,
        }}>

          {/* Gradient glow at top of panel */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            background: 'linear-gradient(180deg, rgba(56,189,248,0.06) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* ── Panel Header ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(56,189,248,0.4)',
              }}>
                <Bot style={{ width: 17, height: 17, color: '#fff' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                  Karachi Climate AI
                </p>
                <p style={{ margin: 0, fontSize: 9, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                  GEMINI 2.5 FLASH
                </p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: 6,
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* ── Messages ── */}
          <div className="dash-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.35 }}>
                <Zap style={{ width: 28, height: 28, color: '#38bdf8', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Ask about Karachi's climate,<br />rainfall patterns, or flood risks.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fade-up 0.2s ease both',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: 7,
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginRight: 7, marginTop: 2,
                  }}>
                    <Bot style={{ width: 12, height: 12, color: '#fff' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '9px 12px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)'
                    : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                  boxShadow: msg.role === 'user' ? '0 4px 16px rgba(56,189,248,0.2)' : 'none',
                  wordBreak: 'break-word',
                }}
                  dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }}
                />
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot style={{ width: 12, height: 12, color: '#fff' }} />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} className={`bounce${j + 1}`} style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: '50%', opacity: 0.8 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ── */}
          <div style={{
            padding: '10px 12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            background: 'rgba(0,0,0,0.2)',
          }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about Karachi's climate…"
                disabled={chatLoading}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '9px 13px',
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.5)'; e.target.style.boxShadow = '0 0 12px rgba(56,189,248,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                disabled={!input.trim() || chatLoading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  background: input.trim() && !chatLoading ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)' : 'rgba(255,255,255,0.07)',
                  cursor: input.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s, box-shadow 0.2s',
                  boxShadow: input.trim() && !chatLoading ? '0 0 12px rgba(56,189,248,0.3)' : 'none',
                }}
              >
                <Send style={{ width: 14, height: 14, color: input.trim() && !chatLoading ? '#fff' : '#475569' }} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </>
  );
}