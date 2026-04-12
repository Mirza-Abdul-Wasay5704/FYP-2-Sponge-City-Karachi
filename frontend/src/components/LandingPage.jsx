import React, { useEffect, useRef, useCallback, useState } from 'react';
import logo from '../assets/sponge_city_khi_logo.png';
import { MapPin, ChevronRight, Zap } from 'lucide-react';

const DISTRICTS = [
  { id: 'south', name: 'Karachi District', subtitle: 'Formerly Karachi South', emoji: '🏙️' },
  { id: 'gulshan', name: 'Gulshan District', subtitle: 'Formerly Karachi East', emoji: '🌳' },
  { id: 'nazimabad', name: 'Nazimabad District', subtitle: 'Formerly Karachi Central', emoji: '🏢' },
  { id: 'orangi', name: 'Orangi District', subtitle: 'Formerly Karachi West', emoji: '🏘️' },
  { id: 'korangi', name: 'Korangi District', subtitle: '', emoji: '🏭' },
  { id: 'malir', name: 'Malir District', subtitle: '', emoji: '🌾' },
  { id: 'keamari', name: 'Keamari District', subtitle: '', emoji: '⚓' },
];

export default function LandingPage({ onDistrictSelect }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const dropsRef = useRef([]);
  const animRef = useRef(null);
  const boltsRef = useRef([]);
  const [showSelector, setShowSelector] = useState(false);

  const TOTAL_DROPS = 400;
  const CURSOR_RADIUS = 200;

  const createDrop = useCallback((canvas) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    length: Math.random() * 20 + 8,
    speed: Math.random() * 2.5 + 1.2,
    opacity: Math.random() * 0.3 + 0.06,
    width: Math.random() * 1.2 + 0.3,
  }), []);

  const createBolt = useCallback((canvas) => {
    const startX = Math.random() * canvas.width;
    const segments = [];
    let x = startX, y = 0;
    const endY = canvas.height * (0.4 + Math.random() * 0.4);
    const steps = 12 + Math.floor(Math.random() * 10);
    for (let i = 0; i < steps; i++) {
      const nx = x + (Math.random() - 0.5) * 80;
      const ny = y + (endY / steps);
      segments.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx; y = ny;
    }
    const branches = [];
    if (Math.random() > 0.4) {
      const forkIdx = Math.floor(segments.length * 0.4 + Math.random() * segments.length * 0.3);
      const forkSeg = segments[forkIdx];
      if (forkSeg) {
        let bx = forkSeg.x2, by = forkSeg.y2;
        for (let j = 0; j < 4 + Math.floor(Math.random() * 5); j++) {
          const nbx = bx + (Math.random() - 0.3) * 60;
          const nby = by + (endY / steps) * 0.8;
          branches.push({ x1: bx, y1: by, x2: nbx, y2: nby });
          bx = nbx; by = nby;
        }
      }
    }
    return { segments, branches, life: 1.0, glow: 0.6 + Math.random() * 0.4 };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    dropsRef.current = Array.from({ length: TOTAL_DROPS }, () => createDrop(canvas));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      for (let b = boltsRef.current.length - 1; b >= 0; b--) {
        const bolt = boltsRef.current[b];
        bolt.life -= 0.035;
        if (bolt.life <= 0) { boltsRef.current.splice(b, 1); continue; }
        const alpha = bolt.life;
        const drawSegs = (segs, w) => {
          ctx.beginPath();
          for (const s of segs) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
          ctx.strokeStyle = `rgba(180,210,255,${alpha * 0.9})`;
          ctx.lineWidth = w;
          ctx.shadowColor = `rgba(150,200,255,${alpha * bolt.glow})`;
          ctx.shadowBlur = 25 * alpha;
          ctx.stroke();
          ctx.shadowBlur = 0;
        };
        drawSegs(bolt.segments, 2.5 * alpha + 0.5);
        if (bolt.branches.length) drawSegs(bolt.branches, 1.5 * alpha);
        if (bolt.life > 0.8) {
          ctx.fillStyle = `rgba(200,220,255,${(bolt.life - 0.8) * 0.12})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      if (Math.random() < 0.004) boltsRef.current.push(createBolt(canvas));

      for (const d of dropsRef.current) {
        const dx = d.x - mx, dy = d.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const accel = dist < CURSOR_RADIUS ? 1 + (1 - dist / CURSOR_RADIUS) * 6 : 1;
        d.y += d.speed * accel;
        if (d.y > canvas.height) { d.y = -d.length; d.x = Math.random() * canvas.width; }
        const gf = dist < CURSOR_RADIUS ? (1 - dist / CURSOR_RADIUS) : 0;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 0.3, d.y + d.length * (1 + gf * 0.5));
        ctx.strokeStyle = `rgba(${100 + gf * 80},${180 + gf * 50},${180 + gf * 75},${d.opacity + gf * 0.4})`;
        ctx.lineWidth = d.width + gf * 0.8;
        ctx.stroke();
        if (gf > 0.35 && d.y + d.length >= canvas.height - 3) {
          ctx.beginPath();
          ctx.arc(d.x + (Math.random() - 0.5) * 6, canvas.height - Math.random() * 5, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(140,200,255,${gf * 0.4})`;
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current); };
  }, [createDrop, createBolt]);

  const handleMouseMove = useCallback((e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; }, []);
  const handleMouseLeave = useCallback(() => { mouseRef.current = { x: -1000, y: -1000 }; }, []);

  return (
    <div
      className="min-h-screen bg-[#040a14] relative overflow-hidden flex flex-col items-center justify-center font-sans"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* ─── HERO CONTENT (flies to left when overlay opens) ─── */}
      <div
        className={`relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center transition-all duration-700 ease-in-out ${showSelector
          ? 'opacity-0 -translate-x-[300px] scale-90 pointer-events-none'
          : 'opacity-100 translate-x-0 scale-100'
          }`}
      >
        <div className="mb-10 flex flex-col items-center">
          {/* Logo — larger, subtle ring glow instead of heavy blur */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 scale-[1.15]" />
            <div className="absolute inset-0 rounded-full border border-blue-400/10 scale-[1.3]" />
            <img
              src={logo}
              alt="Sponge City Karachi Logo"
              className="relative w-44 h-44 object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.25)] transform transition duration-500 hover:scale-110"
            />
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 mb-4 tracking-tight">
            Sponge City Karachi
          </h1>
          <p className="text-xl text-blue-100/80 max-w-2xl font-light">
            Advanced geospatial intelligence for urban flood resilience and topographic analysis.
          </p>
          <p className="text-xs text-blue-300/30 mt-3 italic tracking-wide">Move your cursor to intensify the storm</p>
        </div>

        <button
          onClick={() => setShowSelector(true)}
          className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white font-bold text-lg shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-105 flex items-center gap-3"
        >
          <MapPin className="w-5 h-5" />
          Select Your Region
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="absolute bottom-6 w-full text-center text-sm text-blue-200/40 z-10">
        <p>© {new Date().getFullYear()} Sponge City Karachi. Powered by GeoTIFF & Leaflet.</p>
      </div>

      {/* ═══ FULLSCREEN GLASS UI OVERLAY ═══ */}
      <div
        className={`fixed inset-0 z-50 flex transition-all duration-500 ease-in-out ${showSelector
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowSelector(false)} />

        {/* Content split */}
        <div className="relative z-10 flex w-full h-full">

          {/* LEFT — Branding (slides in from left) */}
          <div
            className={`hidden md:flex flex-col items-center justify-center w-[45%] px-12 bg-gradient-to-br from-blue-950/50 to-indigo-950/40 border-r border-white/5 transition-all duration-700 ease-out ${showSelector ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              }`}
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/15 scale-[1.12]" />
              <img src={logo} alt="Logo" className="relative w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
            </div>
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-3">
              Sponge City Karachi
            </h2>
            <div className="mt-2 flex items-center gap-2 text-blue-300/40 text-sm">
              <Zap className="w-4 h-4" />
              <span>AI-Powered Urban Flood Intelligence Platform</span>
            </div>
          </div>

          {/* RIGHT — District Picker (slides in from right) */}
          <div
            className={`flex-1 flex flex-col items-center justify-center px-8 md:px-16 relative transition-all duration-700 ease-out delay-100 ${showSelector ? 'translate-x-0 opacity-100' : 'translate-x-[100px] opacity-0'
              }`}
          >
            <button
              onClick={() => setShowSelector(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white text-3xl font-light transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              ×
            </button>

            <h3 className="text-2xl font-bold text-white mb-2">Choose Your District</h3>
            <p className="text-gray-400 text-sm mb-8">Select a region to begin the analysis</p>

            <div className="w-full max-w-md space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2">
              {DISTRICTS.map((district, i) => (
                <button
                  key={district.id}
                  onClick={() => onDistrictSelect(district.id)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="w-full group flex items-center gap-4 bg-white/[0.04] hover:bg-white/[0.1] backdrop-blur border border-white/[0.07] hover:border-blue-500/40 rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:scale-[1.02] animate-fadeIn"
                >
                  <div className="w-12 h-12 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-colors">
                    {district.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold group-hover:text-blue-200 transition-colors">{district.name}</h4>
                    {district.subtitle && <p className="text-gray-500 text-xs mt-0.5">{district.subtitle}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
