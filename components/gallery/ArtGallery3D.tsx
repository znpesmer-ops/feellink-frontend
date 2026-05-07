'use client'

import { useState, useEffect, useCallback, useRef, Component, type ReactNode } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { X, ZoomIn, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, AlertTriangle, RefreshCw } from 'lucide-react'

interface Artwork {
  id: string
  title?: string
  caption?: string
  media?: Array<{ url: string; type?: string }>
}

interface ArtGallery3DProps {
  artworks: Artwork[]
  isOpen: boolean
  onClose: () => void
}

// ── Error Boundary ─────────────────────────────────────────────────────────────
class Gallery3DBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { crashed: boolean }
> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  reset = () => this.setState({ crashed: false })

  render() {
    if (this.state.crashed) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-5 p-6">
          <button
            onClick={this.props.onClose}
            className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={24} className="text-amber-400" />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-white font-semibold text-base mb-1">Sergi takılmadan açıldı</p>
            <p className="text-white/50 text-sm">3D sergi şu anda başlatılamadı. Sayfayı yenileyerek tekrar deneyebilirsiniz.</p>
          </div>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Tekrar dene
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Room dimensions ────────────────────────────────────────────────────────────
const P    = 820
const RW   = 2800
const RH   = 1600
const RD   = 860
const STEP = 80
const MAX_Z = Math.round(P * 0.65)

const BACK_FRAMES = [
  { left: 310,  top: 330, w: 460, h: 620 },
  { left: 1130, top: 230, w: 540, h: 760 },
  { left: 2030, top: 330, w: 460, h: 620 },
]

const SIDE_FRAMES = [
  { left:  40, top: 340, w: 230, h: 480 },
  { left: 315, top: 250, w: 230, h: 580 },
  { left: 590, top: 340, w: 230, h: 480 },
]

// Brand gradient bars for door frame (purple → orange)
const BRAND_H = 'linear-gradient(90deg,#3b0764 0%,#6d28d9 22%,#a78bfa 42%,#fb923c 62%,#ea580c 80%,#7c3aed 100%)'
const BRAND_V = 'linear-gradient(180deg,#3b0764 0%,#6d28d9 22%,#a78bfa 42%,#fb923c 62%,#ea580c 80%,#7c3aed 100%)'

const CSS = `
  @keyframes spotBreath   { 0%,100%{opacity:.65} 50%{opacity:1} }
  @keyframes gIn          { from{opacity:0} to{opacity:1} }
  @keyframes trackGlow    { 0%,100%{opacity:.55;transform:translateX(-50%) scale(1)} 50%{opacity:.9;transform:translateX(-50%) scale(1.15)} }
  @keyframes haloGlow     { 0%,100%{opacity:.55} 50%{opacity:.85} }
  @keyframes scaleReveal  { 0%{transform:scale(1.04)} 100%{transform:scale(1)} }
  @keyframes filmPeel     { 0%{transform:scaleY(1)} 100%{transform:scaleY(0)} }
  @keyframes auraBreath   { 0%,100%{opacity:.22;transform:scale(1)} 50%{opacity:.45;transform:scale(1.08)} }
  @keyframes auraBreath2  { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.28;transform:scale(1.14)} }
  @keyframes doorFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes particleUp   { 0%{opacity:0;transform:translateY(0) scale(0.5)} 30%{opacity:1} 100%{opacity:0;transform:translateY(-80px) scale(1)} }
  @keyframes shimmer      { 0%{background-position:200% center} 100%{background-position:-200% center} }
`

// ── Premium door sound (sine-based, no harsh sawtooth) ─────────────────────────
function playDoorSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx() as AudioContext
    ctx.resume()
    const t = ctx.currentTime

    // 1. Heavy thud — door mass releasing the latch (sine, sub-bass)
    const thud = ctx.createOscillator()
    const thudG = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(110, t)
    thud.frequency.exponentialRampToValueAtTime(52, t + 0.45)
    thudG.gain.setValueAtTime(0, t)
    thudG.gain.linearRampToValueAtTime(0.45, t + 0.025)
    thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    thud.connect(thudG); thudG.connect(ctx.destination)
    thud.start(t); thud.stop(t + 0.5)

    // 2. Smooth hinge sweep — sine only, organ-like weight
    const hinge = ctx.createOscillator()
    const hingeG = ctx.createGain()
    hinge.type = 'sine'
    hinge.frequency.setValueAtTime(240, t + 0.04)
    hinge.frequency.linearRampToValueAtTime(170, t + 0.45)
    hinge.frequency.linearRampToValueAtTime(205, t + 0.78)
    hinge.frequency.linearRampToValueAtTime(148, t + 1.05)
    hingeG.gain.setValueAtTime(0, t + 0.04)
    hingeG.gain.linearRampToValueAtTime(0.07, t + 0.12)
    hingeG.gain.linearRampToValueAtTime(0.045, t + 0.65)
    hingeG.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
    hinge.connect(hingeG)
    // Subtle reverb tail
    const delayNode = ctx.createDelay(0.3)
    delayNode.delayTime.value = 0.13
    const revG = ctx.createGain(); revG.gain.value = 0.22
    hingeG.connect(delayNode); delayNode.connect(revG); revG.connect(ctx.destination)
    hingeG.connect(ctx.destination)
    hinge.start(t + 0.04); hinge.stop(t + 1.1)

    // 3. Air displacement — low-pass filtered noise, gentle
    const bufLen = Math.ceil(ctx.sampleRate * 0.8)
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1
    const nSrc = ctx.createBufferSource(); nSrc.buffer = noiseBuf
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600
    const nG = ctx.createGain()
    nG.gain.setValueAtTime(0, t + 0.08)
    nG.gain.linearRampToValueAtTime(0.038, t + 0.28)
    nG.gain.exponentialRampToValueAtTime(0.001, t + 0.82)
    nSrc.connect(lp); lp.connect(nG); nG.connect(ctx.destination)
    nSrc.start(t + 0.08)

    // 4. Soft stop thud when door settles (delayed)
    const stop = ctx.createOscillator()
    const stopG = ctx.createGain()
    stop.type = 'sine'
    stop.frequency.setValueAtTime(80, t + 0.92)
    stop.frequency.exponentialRampToValueAtTime(45, t + 1.1)
    stopG.gain.setValueAtTime(0, t + 0.92)
    stopG.gain.linearRampToValueAtTime(0.18, t + 0.94)
    stopG.gain.exponentialRampToValueAtTime(0.001, t + 1.12)
    stop.connect(stopG); stopG.connect(ctx.destination)
    stop.start(t + 0.92); stop.stop(t + 1.12)
  } catch { /* audio blocked */ }
}

// ── Frame ──────────────────────────────────────────────────────────────────────
function Frame({
  artwork, pos, onZoom,
}: {
  artwork: Artwork | null
  pos: { left: number; top: number; w: number; h: number }
  onZoom: (url: string) => void
}) {
  const [hov, setHov] = useState(false)
  const url = artwork?.media?.[0]?.url ? resolveImageUrl(artwork.media[0].url) : null

  return (
    <div
      style={{ position:'absolute', left:pos.left, top:pos.top, width:pos.w, height:pos.h }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Spotlight cone */}
      <div style={{
        position:'absolute', left:'50%', bottom:'100%',
        transform:'translateX(-50%)',
        width: pos.w * 3.8, height: 720,
        background:`radial-gradient(ellipse 36% 100% at 50% 0%,
          rgba(255,218,120,${hov ? 0.30 : 0.19}), transparent 62%)`,
        pointerEvents:'none',
        animation:'spotBreath 5s ease-in-out infinite',
      }} />

      {/* Wall halo glow */}
      <div style={{
        position:'absolute', inset:-100,
        background:`radial-gradient(ellipse 58% 52% at 50% 50%,
          rgba(255,200,90,${hov ? 0.13 : 0.055}), transparent 65%)`,
        pointerEvents:'none',
        animation:'haloGlow 6s ease-in-out infinite',
      }} />

      {/* Floor light pool */}
      <div style={{
        position:'absolute', top:'100%', left:'50%',
        transform:'translateX(-50%)',
        width: pos.w * 2, height: 200,
        background:`radial-gradient(ellipse 65% 55% at 50% 0%,
          rgba(255,200,90,${hov ? 0.11 : 0.065}), transparent 70%)`,
        pointerEvents:'none',
      }} />

      {/* ── Gold frame outer border ── */}
      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:14, background:GOLD_H,
        boxShadow:'0 2px 6px rgba(0,0,0,.7)' }} />
      {/* Bottom bar */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:14, background:GOLD_H,
        boxShadow:'0 -2px 6px rgba(0,0,0,.7)' }} />
      {/* Left bar */}
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:14, background:GOLD_V,
        boxShadow:'2px 0 6px rgba(0,0,0,.7)' }} />
      {/* Right bar */}
      <div style={{ position:'absolute', top:0, right:0, bottom:0, width:14, background:GOLD_V,
        boxShadow:'-2px 0 6px rgba(0,0,0,.7)' }} />

      {/* ── Inner shadow rim ── */}
      <div style={{ position:'absolute', inset:14,
        boxShadow:'inset 0 0 12px rgba(0,0,0,.85)',
        background:'#0c0906',
      }}>
        {/* ── Cream mat board ── */}
        <div style={{ position:'absolute', inset:0, background:'#e8e0d0',
          boxShadow:'inset 0 0 30px rgba(0,0,0,.5)',
        }}>
          {/* ── Artwork canvas ── */}
          <div style={{
            position:'absolute', inset:18,
            background: url ? '#09080a' : '#0d0b07',
            boxShadow:'inset 0 0 20px rgba(0,0,0,.8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            overflow:'hidden',
          }}>
            {url ? (
              <>
                <img
                  src={url}
                  alt={artwork?.title ?? 'Eser'}
                  style={{
                    maxWidth:'100%', maxHeight:'100%',
                    width:'auto', height:'auto',
                    objectFit:'contain', display:'block',
                    transform: hov ? 'scale(1.025)' : 'scale(1)',
                    transition:'transform .7s ease',
                  }}
                  draggable={false}
                />
                {hov && (
                  <button
                    onClick={() => onZoom(url)}
                    style={{
                      position:'absolute', top:8, right:8,
                      width:30, height:30, borderRadius:'50%',
                      background:'rgba(0,0,0,.72)',
                      border:'1px solid rgba(255,218,120,.35)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', color:'rgba(255,218,120,.9)',
                    }}
                  >
                    <ZoomIn size={13} />
                  </button>
                )}
              </>
            ) : (
              <div style={{ width:'100%', height:'100%', background:'#0e0b06',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <div style={{ fontSize:22, color:'rgba(201,165,80,.18)', fontWeight:100 }}>+</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Corner ornaments */}
      {[
        { top:2, left:2 },
        { top:2, right:2 },
        { bottom:2, left:2 },
        { bottom:2, right:2 },
      ].map((s, i) => (
        <div key={i} style={{
          position:'absolute', ...s, width:14, height:14,
          background:'radial-gradient(circle at 50% 50%,#f0c860,#8b6218)',
          boxShadow:'0 0 4px rgba(240,200,96,.4)',
          zIndex:1,
        }} />
      ))}

      {/* Drop shadow for 3-D depth */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        boxShadow: hov
          ? '0 30px 90px rgba(0,0,0,.95), 0 8px 30px rgba(0,0,0,.8)'
          : '0 18px 60px rgba(0,0,0,.9),  0 4px 16px rgba(0,0,0,.7)',
        transition:'box-shadow .4s',
      }} />

      {/* Placard */}
      <div style={{
        position:'absolute', top:'calc(100% + 14px)', left:'50%',
        transform:'translateX(-50%)', minWidth:80, maxWidth:pos.w * .65,
        padding:'5px 14px', textAlign:'center',
        background:'rgba(6,5,3,.92)',
        borderTop:'2px solid rgba(201,165,80,.35)',
        border:'1px solid rgba(201,165,80,.15)',
        boxShadow:'0 4px 20px rgba(0,0,0,.7)',
      }}>
        <div style={{
          fontFamily:'Georgia,serif', fontSize:9.5, letterSpacing:'.2em',
          textTransform:'uppercase', whiteSpace:'nowrap',
          overflow:'hidden', textOverflow:'ellipsis',
          color: artwork?.title ? 'rgba(201,165,80,.65)' : 'rgba(201,165,80,.14)',
        }}>
          {artwork?.title ?? '· · ·'}
        </div>
      </div>
    </div>
  )
}

// ── Wall ───────────────────────────────────────────────────────────────────────
function Wall({
  ws, frames, artworks, onZoom,
}: {
  ws: React.CSSProperties
  frames: typeof BACK_FRAMES
  artworks: (Artwork | null)[]
  onZoom: (url: string) => void
}) {
  return (
    <div style={ws}>
      {/* Deep stone base */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:`
          radial-gradient(ellipse 130% 60% at 50% 0%,  #1c2438 0%,  transparent 55%),
          radial-gradient(ellipse 100% 40% at 50% 100%,#0a0d14 0%,  transparent 50%),
          linear-gradient(175deg,#121926 0%,#0d1320 40%,#111825 70%,#0a0e18 100%)
        `,
      }} />

      {/* Subtle horizontal stone lines */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.04,
        backgroundImage:`repeating-linear-gradient(
          0deg, transparent 0px, transparent 7px,
          rgba(180,190,210,.5) 7px, rgba(180,190,210,.5) 8px
        )`,
      }} />

      {/* Crown molding top */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:38, pointerEvents:'none',
        background:'linear-gradient(180deg,rgba(201,165,80,.16),rgba(201,165,80,.05) 55%,transparent)',
        borderBottom:'1px solid rgba(201,165,80,.28)',
      }} />
      <div style={{ position:'absolute', top:38, left:0, right:0, height:6, pointerEvents:'none',
        background:'linear-gradient(180deg,rgba(201,165,80,.08),transparent)',
      }} />

      {/* Dado rail at 42% */}
      <div style={{ position:'absolute', top:'42%', left:0, right:0, height:4, pointerEvents:'none',
        background:'linear-gradient(180deg,rgba(201,165,80,.22),rgba(201,165,80,.12))',
        boxShadow:'0 3px 0 rgba(0,0,0,.65), 0 -1px 0 rgba(0,0,0,.4)',
      }} />
      <div style={{ position:'absolute', top:'calc(42% + 12px)', left:0, right:0, height:1, pointerEvents:'none',
        background:'rgba(201,165,80,.07)',
      }} />

      {/* Wainscoting lower section — slightly darker */}
      <div style={{ position:'absolute', top:'42%', left:0, right:0, bottom:52, pointerEvents:'none',
        background:'linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.28))',
      }} />

      {/* Baseboard */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:52, pointerEvents:'none',
        background:'linear-gradient(180deg,transparent,rgba(0,0,0,.82))',
        borderTop:'1px solid rgba(201,165,80,.18)',
      }} />
      <div style={{ position:'absolute', bottom:48, left:0, right:0, height:1, pointerEvents:'none',
        background:'rgba(201,165,80,.06)',
      }} />

      {/* Ambient ceiling light */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(180deg,rgba(220,195,140,.07) 0%,transparent 22%)',
      }} />

      {/* Floor shadow */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'26%', pointerEvents:'none',
        background:'linear-gradient(0deg,rgba(0,0,0,.72),transparent)',
      }} />

      {frames.map((f, i) => (
        <Frame key={i} artwork={artworks[i]} pos={f} onZoom={onZoom} />
      ))}
    </div>
  )
}

// ── Main (inner) ───────────────────────────────────────────────────────────────
function ArtGallery3DInner({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [phase,   setPhase]   = useState<'door' | 'opening' | 'black' | 'gallery'>('door')
  const [rotY,    setRotY]    = useState(0)
  const [camZ,    setCamZ]    = useState(0)
  const [room,    setRoom]    = useState(0)
  const [zoomed,  setZoomed]  = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const dragRef    = useRef<{ x: number; baseRot: number } | null>(null)
  const [liveRot,  setLiveRot]  = useState(0)
  const [dragging, setDragging] = useState(false)

  const openDoor = useCallback(() => {
    playDoorSound()
    setPhase('opening')
    setTimeout(() => setPhase('black'), 950)
    // Longer black hold so film strips have time to prepare
    setTimeout(() => { setPhase('gallery'); setVisible(true) }, 1380)
  }, [])

  const imgs       = artworks.filter(a => a.media?.[0]?.url)
  const FPR        = 9
  const totalRooms = Math.max(1, Math.ceil(imgs.length / FPR))
  const wallArts   = useCallback(
    (wi: number) => Array.from({ length: 3 }, (_, fi) => imgs[room * FPR + wi * 3 + fi] ?? null),
    [imgs, room]
  )

  const snap = useCallback((r: number) => {
    const positions = [-180, -90, 0, 90, 180]
    return positions.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a))
  }, [])

  const onDragStart = useCallback((clientX: number) => {
    dragRef.current = { x: clientX, baseRot: rotY }
    setDragging(true)
  }, [rotY])

  const onDragMove = useCallback((clientX: number) => {
    if (!dragRef.current) return
    setLiveRot((dragRef.current.x - clientX) * 0.3)
  }, [])

  const onDragEnd = useCallback(() => {
    if (!dragRef.current) return
    const finalRot = dragRef.current.baseRot + liveRot
    const snapped  = Math.max(-90, Math.min(90, snap(finalRot)))
    setRotY(snapped); setLiveRot(0); setDragging(false); dragRef.current = null
  }, [liveRot, snap])

  const onMouseDown  = useCallback((e: React.MouseEvent)  => onDragStart(e.clientX), [onDragStart])
  const onMouseMove  = useCallback((e: React.MouseEvent)  => onDragMove(e.clientX),  [onDragMove])
  const onMouseUp    = useCallback(                         onDragEnd,                [onDragEnd])
  const onTouchStart = useCallback((e: React.TouchEvent)  => onDragStart(e.touches[0].clientX), [onDragStart])
  const onTouchMove  = useCallback((e: React.TouchEvent)  => { e.preventDefault(); onDragMove(e.touches[0].clientX) }, [onDragMove])
  const onTouchEnd   = useCallback(                         onDragEnd,                [onDragEnd])

  const goLeft  = useCallback(() => { setRotY(r => Math.min(r + 90, 90));  setCamZ(0) }, [])
  const goRight = useCallback(() => { setRotY(r => Math.max(r - 90, -90)); setCamZ(0) }, [])
  const walkIn  = useCallback(() => setCamZ(z => Math.min(z + STEP, MAX_Z)), [])
  const walkOut = useCallback(() => setCamZ(z => Math.max(z - STEP, 0)),    [])

  useEffect(() => {
    if (!isOpen) return
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      { zoomed ? setZoomed(null) : onClose(); return }
      if (e.key === 'ArrowLeft')   goLeft()
      if (e.key === 'ArrowRight')  goRight()
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')   walkIn()
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') walkOut()
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [isOpen, zoomed, onClose, goLeft, goRight, walkIn, walkOut])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setRotY(0); setCamZ(0); setRoom(0); setLiveRot(0)
      setPhase('door'); setVisible(false)
      setRotY(0); setCamZ(0); setRoom(0); setLiveRot(0)
      return
    }
    setVisible(false); setPhase('door')
    document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ── Door entrance screen ───────────────────────────────────────────────────
  if (phase === 'black') {
    return <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#000' }} />
  }

  if (phase === 'door' || phase === 'opening') {
    // Floating particle positions (deterministic)
    const PARTICLES = [
      {x:18,y:72,size:3,dur:3.2,delay:0,   color:'rgba(167,139,250,0.7)'},
      {x:78,y:58,size:2,dur:2.8,delay:0.6, color:'rgba(251,146,60,0.7)'},
      {x:32,y:40,size:2,dur:3.6,delay:1.1, color:'rgba(167,139,250,0.5)'},
      {x:62,y:80,size:3,dur:2.5,delay:0.3, color:'rgba(251,146,60,0.5)'},
      {x:85,y:35,size:2,dur:3.9,delay:1.8, color:'rgba(196,181,253,0.6)'},
      {x:48,y:20,size:2,dur:2.2,delay:0.9, color:'rgba(253,186,116,0.5)'},
      {x:12,y:50,size:2,dur:3.4,delay:1.5, color:'rgba(167,139,250,0.4)'},
      {x:90,y:65,size:2,dur:2.9,delay:0.4, color:'rgba(251,146,60,0.4)'},
    ]
    return (
      <>
        <style>{CSS}</style>
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'#07031a',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          userSelect:'none', overflow:'hidden',
        }}>
          {/* Purple top glow */}
          <div style={{
            position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
            width:'60%', height:'45%',
            background:'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.25) 0%, transparent 70%)',
            pointerEvents:'none',
          }} />
          {/* Orange bottom warm glow */}
          <div style={{
            position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
            width:'50%', height:'35%',
            background:'radial-gradient(ellipse at 50% 100%, rgba(234,88,12,0.14) 0%, transparent 70%)',
            pointerEvents:'none',
          }} />
          {/* Floor gradient */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:'30%',
            background:'linear-gradient(0deg, rgba(6,2,16,0.8) 0%, transparent 100%)',
            pointerEvents:'none',
          }} />

          {/* Floating particles */}
          {PARTICLES.map((p,i) => (
            <div key={i} style={{
              position:'absolute', left:`${p.x}%`, bottom:`${p.y}px`,
              width:p.size, height:p.size, borderRadius:'50%',
              background:p.color,
              boxShadow:`0 0 ${p.size*3}px ${p.color}`,
              animation:`particleUp ${p.dur}s ease-in-out ${p.delay}s infinite`,
              pointerEvents:'none',
            }} />
          ))}

          {/* Label */}
          <p style={{
            color:'rgba(167,139,250,0.5)', fontSize:9.5, letterSpacing:'0.42em',
            textTransform:'uppercase', fontFamily:'Georgia,serif', marginBottom:32,
          }}>
            Sanal Sergi
          </p>

          {/* Door scene */}
          <div style={{
            position:'relative', perspective:'900px', perspectiveOrigin:'50% 50%',
            animation: phase === 'door' ? 'doorFloat 4s ease-in-out infinite' : 'none',
          }}>
            <div style={{ position:'relative', width:200, height:340 }}>

              {/* Purple aura ring 1 */}
              <div style={{
                position:'absolute', inset:-28, borderRadius:6,
                border:'1px solid rgba(124,58,237,0.22)',
                animation:'auraBreath 3s ease-in-out infinite',
                pointerEvents:'none',
              }} />
              {/* Orange aura ring 2 */}
              <div style={{
                position:'absolute', inset:-52, borderRadius:8,
                border:'1px solid rgba(234,88,12,0.12)',
                animation:'auraBreath2 3s ease-in-out 0.9s infinite',
                pointerEvents:'none',
              }} />

              {/* Glow from inside (warm light behind door) */}
              <div style={{
                position:'absolute', inset:0,
                background:'radial-gradient(ellipse 60% 70% at 50% 40%, rgba(251,146,60,0.11), transparent 70%)',
                pointerEvents:'none',
              }} />

              {/* Frame — brand gradient border */}
              <div style={{ position:'absolute', inset:0 }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:8, background:BRAND_H }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:8, background:BRAND_H }} />
                <div style={{ position:'absolute', top:0, left:0, bottom:0, width:8, background:BRAND_V }} />
                <div style={{ position:'absolute', top:0, right:0, bottom:0, width:8, background:BRAND_V }} />
                {/* Corner gems */}
                {([{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}] as React.CSSProperties[]).map((s,i) => (
                  <div key={i} style={{
                    position:'absolute', ...s, width:12, height:12, zIndex:1,
                    background: i<2
                      ? 'radial-gradient(circle at 35% 35%, #a78bfa, #4c1d95)'
                      : 'radial-gradient(circle at 35% 35%, #fb923c, #92400e)',
                    boxShadow: i<2
                      ? '0 0 8px rgba(124,58,237,0.7)'
                      : '0 0 8px rgba(234,88,12,0.7)',
                  }} />
                ))}
              </div>

              {/* Door panel with 3D swing */}
              <div style={{
                position:'absolute', inset:8,
                transformOrigin:'left center',
                transform: phase === 'opening' ? 'rotateY(-82deg)' : 'rotateY(0deg)',
                transition:'transform 1.1s cubic-bezier(0.4,0,0.2,1)',
                transformStyle:'preserve-3d',
                boxShadow: phase === 'opening' ? '14px 0 45px rgba(0,0,0,0.9)' : 'none',
              }}>
                {/* Front face */}
                <div style={{
                  position:'absolute', inset:0, backfaceVisibility:'hidden',
                  background:'linear-gradient(160deg, #130820 0%, #0a0516 45%, #0f0618 75%, #07030e 100%)',
                }}>
                  {/* Purple tint on left side, orange on right */}
                  <div style={{
                    position:'absolute', inset:0,
                    background:'linear-gradient(90deg, rgba(76,29,149,0.08) 0%, transparent 50%, rgba(124,45,12,0.06) 100%)',
                    pointerEvents:'none',
                  }} />
                  {/* Upper panel */}
                  <div style={{ position:'absolute', top:14, left:14, right:14, height:'36%',
                    border:'1px solid rgba(124,58,237,0.12)',
                    background:'rgba(0,0,0,0.3)',
                    boxShadow:'inset 0 2px 8px rgba(0,0,0,0.6)',
                  }} />
                  {/* Lower panel */}
                  <div style={{ position:'absolute', bottom:14, left:14, right:14, top:'calc(36% + 26px)',
                    border:'1px solid rgba(234,88,12,0.1)',
                    background:'rgba(0,0,0,0.3)',
                    boxShadow:'inset 0 2px 8px rgba(0,0,0,0.6)',
                  }} />
                  {/* Center divider */}
                  <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1,
                    background:'linear-gradient(180deg,rgba(124,58,237,0.08),rgba(234,88,12,0.06))',
                  }} />
                  {/* Handle — orange */}
                  <div style={{ position:'absolute', right:16, top:'52%', transform:'translateY(-50%)' }}>
                    <div style={{
                      width:12, height:12, borderRadius:'50%',
                      background:'radial-gradient(circle at 35% 35%, #fb923c, #92400e)',
                      boxShadow:'0 0 10px rgba(234,88,12,0.6), 0 2px 4px rgba(0,0,0,0.6)',
                    }} />
                    <div style={{ width:2, height:18, background:'linear-gradient(180deg,#fb923c,#7c2d12)', margin:'3px auto 0', borderRadius:1 }} />
                  </div>
                </div>
                {/* Back face */}
                <div style={{
                  position:'absolute', inset:0,
                  transform:'rotateY(180deg)', backfaceVisibility:'hidden',
                  background:'#08040f',
                }} />
              </div>

              {/* Light leak when opening — warm orange */}
              {phase === 'opening' && (
                <div style={{
                  position:'absolute', top:8, left:8, bottom:8, width:5,
                  background:'linear-gradient(90deg, rgba(251,146,60,0.45), rgba(167,139,250,0.15), transparent)',
                  animation:'gIn .25s ease',
                }} />
              )}
            </div>
          </div>

          {/* CTA button — purple to orange gradient */}
          <button
            onClick={openDoor}
            disabled={phase === 'opening'}
            style={{
              marginTop:40, padding:'13px 42px',
              background: phase === 'opening'
                ? 'rgba(124,58,237,0.06)'
                : 'linear-gradient(135deg, rgba(109,40,217,0.28) 0%, rgba(234,88,12,0.18) 100%)',
              border: `1px solid ${phase === 'opening' ? 'rgba(124,58,237,0.1)' : 'rgba(167,139,250,0.38)'}`,
              borderRadius:4,
              color: phase === 'opening' ? 'rgba(167,139,250,0.25)' : 'rgba(221,214,254,0.92)',
              fontSize:10.5, letterSpacing:'0.32em', textTransform:'uppercase',
              fontFamily:'Georgia,serif', cursor: phase === 'opening' ? 'default' : 'pointer',
              transition:'all .3s',
              boxShadow: phase === 'opening' ? 'none' : '0 0 24px rgba(109,40,217,0.18), 0 0 48px rgba(234,88,12,0.08)',
            }}
          >
            {phase === 'opening' ? 'Açılıyor…' : 'Kapıyı Aç'}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position:'absolute', top:18, right:22, zIndex:25,
              background:'rgba(255,255,255,.03)', border:'1px solid rgba(124,58,237,.2)',
              borderRadius:'50%', width:34, height:34,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(167,139,250,.45)',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </>
    )
  }

  const effectiveRot = rotY + liveRot
  const viewDir      = effectiveRot > 45 ? 'left' : effectiveRot < -45 ? 'right' : 'center'
  const walkPct      = Math.round((camZ / MAX_Z) * 100)

  const wallBase: React.CSSProperties = {
    position: 'absolute',
    overflow: 'visible',
  }

  const VIEWS: Record<string, string> = { left:'Sol Duvar', center:'Ön Duvar', right:'Sağ Duvar' }

  return (
    <>
      <style>{CSS}</style>

      <div
        style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'radial-gradient(ellipse 110% 90% at 50% 60%, #0d1220 0%, #060810 100%)',
          overflow:'hidden', userSelect:'none',
          animation: visible ? 'scaleReveal 1.2s cubic-bezier(0.25,0.1,0.25,1) forwards' : 'none',
          opacity: 1,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={dragging ? onMouseMove : undefined}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Vignette */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:6,
          background:'radial-gradient(ellipse 88% 88% at 50% 50%, transparent 38%, rgba(0,0,0,.75) 100%)',
        }} />

        {/* Film strip transition — 14 horizontal bars peel away top-to-bottom */}
        {visible && Array.from({length:14}, (_,i) => (
          <div key={i} style={{
            position:'absolute', left:0, right:0, zIndex:8, pointerEvents:'none',
            top:`${(i/14)*100}%`,
            height:`calc(100% / 14 + 2px)`,
            background: i%2===0
              ? 'linear-gradient(90deg,#0c0520,#09031a,#0c0520)'
              : 'linear-gradient(90deg,#0a0418,#060213,#0a0418)',
            transformOrigin:'top center',
            animation:`filmPeel 0.38s cubic-bezier(0.6,0,0.8,1) ${i*48}ms forwards`,
            willChange:'transform',
          }} />
        ))}

        {/* ── Header HUD ── */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:20,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 28px 12px',
          background:'linear-gradient(180deg,rgba(6,8,16,.88),transparent)',
          pointerEvents:'none',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{
              color:'rgba(201,165,80,.4)', fontSize:10, letterSpacing:'.35em',
              textTransform:'uppercase', fontFamily:'Georgia,serif',
            }}>
              Sergi Turu
            </span>
            <span style={{ width:1, height:10, background:'rgba(201,165,80,.18)' }} />
            <span style={{ color:'rgba(201,165,80,.28)', fontSize:9.5, letterSpacing:'.2em' }}>
              {VIEWS[viewDir]}
            </span>
            {totalRooms > 1 && (
              <span style={{ color:'rgba(201,165,80,.16)', fontSize:9.5 }}>
                {room + 1} / {totalRooms}
              </span>
            )}
          </div>
          <span style={{ color:'rgba(201,165,80,.2)', fontSize:9, letterSpacing:'.14em' }}>
            ← sürükle →
          </span>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:'absolute', top:14, right:22, zIndex:25,
            background:'rgba(255,255,255,.04)', border:'1px solid rgba(201,165,80,.15)',
            borderRadius:'50%', width:34, height:34,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'rgba(201,165,80,.45)', transition:'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(201,165,80,.1)'; e.currentTarget.style.color='rgba(201,165,80,.95)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.04)'; e.currentTarget.style.color='rgba(201,165,80,.45)' }}
        >
          <X size={14} />
        </button>

        {/* ── 3-D Scene ── */}
        <div style={{
          position:'absolute', inset:0,
          perspective:`${P}px`, perspectiveOrigin:'50% 44%',
        }}>
          <div style={{
            position:'absolute',
            left:`calc(50% - ${RW / 2}px)`,
            top: `calc(50% - ${RH / 2}px)`,
            width:RW, height:RH,
            transformStyle:'preserve-3d',
            transform:`translateZ(${camZ}px) rotateY(${-effectiveRot}deg)`,
            transition: dragging ? 'none' : 'transform .78s cubic-bezier(.4,0,.15,1)',
          }}>

            {/* ── BACK WALL ── */}
            <Wall
              ws={{ ...wallBase, left:0, top:0, width:RW, height:RH,
                    transform:`translateZ(-${RD}px)` }}
              frames={BACK_FRAMES}
              artworks={wallArts(0)}
              onZoom={setZoomed}
            />

            {/* ── LEFT WALL ── */}
            <Wall
              ws={{ ...wallBase, left:0, top:0, width:RD, height:RH,
                    transformOrigin:'left center', transform:'rotateY(90deg)' }}
              frames={SIDE_FRAMES}
              artworks={wallArts(1)}
              onZoom={setZoomed}
            />

            {/* ── RIGHT WALL ── */}
            <Wall
              ws={{ ...wallBase, right:0, left:'auto', top:0, width:RD, height:RH,
                    transformOrigin:'right center', transform:'rotateY(-90deg)' }}
              frames={SIDE_FRAMES}
              artworks={wallArts(2)}
              onZoom={setZoomed}
            />

            {/* ── FLOOR ── dark polished marble */}
            <div style={{
              position:'absolute', bottom:0, left:0, width:RW, height:RD,
              transformOrigin:'bottom center', transform:'rotateX(-90deg)',
              background:`
                repeating-linear-gradient(86deg,transparent 0px,transparent 59px,rgba(255,255,255,.012) 59px,rgba(255,255,255,.012) 61px),
                repeating-linear-gradient( 4deg,transparent 0px,transparent 59px,rgba(255,255,255,.007) 59px,rgba(255,255,255,.007) 61px),
                linear-gradient(to bottom,#0d1218,#080b10)
              `,
            }}>
              <div style={{ position:'absolute', inset:0,
                background:'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(201,165,80,.04), transparent 70%)',
              }} />
              {BACK_FRAMES.map((f, i) => (
                <div key={i} style={{
                  position:'absolute', top:0,
                  left: f.left + f.w / 2, transform:'translateX(-50%)',
                  width: f.w * 2.4, height: 240,
                  background:'radial-gradient(ellipse at 50% 0%, rgba(255,200,90,.08), transparent 70%)',
                  pointerEvents:'none',
                }} />
              ))}
            </div>

            {/* ── CEILING ── track lighting */}
            <div style={{
              position:'absolute', top:0, left:0, width:RW, height:RD,
              transformOrigin:'top center', transform:'rotateX(90deg)',
              background:'linear-gradient(to bottom,#05070d,#080b12)',
            }}>
              {/* Track rail */}
              <div style={{ position:'absolute', bottom:10, left:0, right:0, height:2,
                background:'linear-gradient(90deg,transparent 2%,rgba(201,165,80,.14) 10%,rgba(201,165,80,.14) 90%,transparent 98%)',
              }} />
              {BACK_FRAMES.map((f, i) => (
                <div key={i}>
                  {/* Track light bulb */}
                  <div style={{
                    position:'absolute', bottom:6,
                    left: f.left + f.w / 2, transform:'translateX(-50%)',
                    width:12, height:12, borderRadius:'50%',
                    background:'rgba(255,235,180,.95)',
                    boxShadow:'0 0 16px 6px rgba(255,215,120,.7), 0 0 50px 18px rgba(255,190,80,.35)',
                    animation:`trackGlow ${3+i*.6}s ease-in-out infinite`,
                    animationDelay:`${i*.9}s`,
                  }} />
                  {/* Light cone to back wall */}
                  <div style={{
                    position:'absolute', bottom:0,
                    left: f.left + f.w / 2, transform:'translateX(-50%)',
                    width: f.w * 2.4, height: RD,
                    background:'radial-gradient(ellipse 34% 100% at 50% 0%, rgba(255,218,120,.20), transparent 68%)',
                    animation:`spotBreath ${4+i*.7}s ease-in-out infinite`,
                    animationDelay:`${i*1.1}s`,
                    pointerEvents:'none',
                  }} />
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── Rotation arrows ── */}
        {[
          { side:'left',  fn:goLeft,  Icon:ChevronLeft  },
          { side:'right', fn:goRight, Icon:ChevronRight },
        ].map(({ side, fn, Icon }) => (
          <button
            key={side}
            onClick={fn}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position:'absolute', [side]:18, top:'50%', transform:'translateY(-50%)',
              zIndex:20, width:46, height:46, borderRadius:'50%',
              background:'rgba(0,0,0,.52)', border:'1px solid rgba(201,165,80,.14)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(201,165,80,.5)',
              backdropFilter:'blur(10px)', transition:'all .25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(201,165,80,.1)'; e.currentTarget.style.borderColor='rgba(201,165,80,.4)'; e.currentTarget.style.color='rgba(201,165,80,.95)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,.52)'; e.currentTarget.style.borderColor='rgba(201,165,80,.14)'; e.currentTarget.style.color='rgba(201,165,80,.5)' }}
          >
            <Icon size={20} />
          </button>
        ))}

        {/* ── Walk buttons ── */}
        <div style={{
          position:'absolute', right:72, top:'50%', transform:'translateY(-50%)',
          zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', gap:5,
        }}>
          {[{ Icon:ArrowUp, fn:walkIn }, { Icon:ArrowDown, fn:walkOut }].map(({ Icon, fn }, i) => (
            <button key={i} onClick={fn} onMouseDown={e => e.stopPropagation()} style={{
              width:34, height:34, borderRadius:'50%',
              background:'rgba(0,0,0,.52)', border:'1px solid rgba(201,165,80,.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(201,165,80,.45)', transition:'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(201,165,80,.1)'; e.currentTarget.style.color='rgba(201,165,80,.9)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,.52)'; e.currentTarget.style.color='rgba(201,165,80,.45)' }}
            >
              <Icon size={13} />
            </button>
          ))}
          <div style={{ width:2, height:34, background:'rgba(201,165,80,.1)', borderRadius:1, overflow:'hidden', margin:'2px 0' }}>
            <div style={{ width:'100%', height:`${walkPct}%`, background:'rgba(201,165,80,.55)', transition:'height .3s', marginTop:`${100-walkPct}%` }} />
          </div>
        </div>

        {/* ── Bottom UI ── */}
        <div style={{
          position:'absolute', bottom:22, left:0, right:0, zIndex:20,
          display:'flex', flexDirection:'column', alignItems:'center', gap:10,
          pointerEvents:'none',
        }}>
          {/* View dots */}
          <div style={{ display:'flex', gap:8, alignItems:'center', pointerEvents:'auto' }}>
            {[90, 0, -90].map(deg => (
              <button key={deg}
                onClick={() => { setRotY(deg); setCamZ(0) }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  width: Math.abs(effectiveRot - deg) < 46 ? 24 : 6,
                  height:6, borderRadius:3, border:'none', padding:0,
                  background: Math.abs(effectiveRot - deg) < 46 ? 'rgba(201,165,80,.7)' : 'rgba(255,255,255,.18)',
                  cursor:'pointer', transition:'all .35s',
                }}
              />
            ))}
          </div>

          {totalRooms > 1 && (
            <div style={{ display:'flex', gap:8, pointerEvents:'auto' }}>
              {[
                { label:'← Önceki', dis:room===0,             fn:()=>{setRoom(r=>r-1);setRotY(0);setCamZ(0)} },
                { label:'Sonraki →', dis:room===totalRooms-1, fn:()=>{setRoom(r=>r+1);setRotY(0);setCamZ(0)} },
              ].map(({ label, dis, fn }) => (
                <button key={label} disabled={dis} onClick={fn} onMouseDown={e=>e.stopPropagation()} style={{
                  padding:'5px 14px', fontSize:9.5, letterSpacing:'.14em', textTransform:'uppercase',
                  background:'rgba(0,0,0,.5)', border:'1px solid rgba(201,165,80,.14)',
                  color: dis ? 'rgba(201,165,80,.14)' : 'rgba(201,165,80,.5)',
                  cursor: dis ? 'default' : 'pointer', borderRadius:2, fontFamily:'Georgia,serif',
                }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <p style={{ color:'rgba(201,165,80,.14)', fontSize:9, letterSpacing:'.16em', margin:0 }}>
            ← sürükle → &nbsp;·&nbsp; W / S ileri-geri &nbsp;·&nbsp; ESC çıkış
          </p>
        </div>

        {/* ── Zoom lightbox ── */}
        {zoomed && (
          <div
            onClick={() => setZoomed(null)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position:'fixed', inset:0, zIndex:110,
              background:'rgba(0,0,0,.97)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'zoom-out',
            }}
          >
            <button onClick={() => setZoomed(null)} style={{
              position:'absolute', top:20, right:20,
              background:'rgba(255,255,255,.05)', border:'1px solid rgba(201,165,80,.15)',
              borderRadius:'50%', width:36, height:36,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(201,165,80,.7)',
            }}>
              <X size={15} />
            </button>
            <img
              src={zoomed} alt="Eser"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth:'90vw', maxHeight:'90vh',
                objectFit:'contain', borderRadius:3,
                boxShadow:'0 0 140px rgba(0,0,0,.95)',
                border:'1px solid rgba(201,165,80,.1)',
              }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </>
  )
}

// ── Exported wrapper with error boundary ───────────────────────────────────────
export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  if (!isOpen) return null
  // key={String(isOpen)} resets error boundary state every time the gallery is opened
  return (
    <Gallery3DBoundary key={String(isOpen)} onClose={onClose}>
      <ArtGallery3DInner artworks={artworks ?? []} isOpen={isOpen} onClose={onClose} />
    </Gallery3DBoundary>
  )
}
