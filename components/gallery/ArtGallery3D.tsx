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
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center gap-5 p-6">
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

// Gold gradient for frames
const GOLD_H = 'linear-gradient(90deg,#7a5512 0%,#c8952c 18%,#f0c860 38%,#d4a030 55%,#8b6218 72%,#c8952c 88%,#7a5512 100%)'
const GOLD_V = 'linear-gradient(180deg,#7a5512 0%,#c8952c 18%,#f0c860 38%,#d4a030 55%,#8b6218 72%,#c8952c 88%,#7a5512 100%)'

const CSS = `
  @keyframes spotBreath  { 0%,100%{opacity:.65} 50%{opacity:1} }
  @keyframes gIn         { from{opacity:0} to{opacity:1} }
  @keyframes trackGlow   { 0%,100%{opacity:.55;transform:translateX(-50%) scale(1)} 50%{opacity:.9;transform:translateX(-50%) scale(1.15)} }
  @keyframes haloGlow    { 0%,100%{opacity:.55} 50%{opacity:.85} }
  @keyframes walkIn      { 0%{opacity:0;transform:scale(1.18)} 100%{opacity:1;transform:scale(1)} }
`

// ── Audio helpers ──────────────────────────────────────────────────────────────
function playDoorCreak() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx() as AudioContext
    ctx.resume()

    // Primary creak — sawtooth with pitch envelope
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(155, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(88, ctx.currentTime + 0.38)
    osc.frequency.exponentialRampToValueAtTime(138, ctx.currentTime + 0.72)
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.05)
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.10, ctx.currentTime + 0.55)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 1.2)

    // Low mechanical groan
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(58, ctx.currentTime)
    osc2.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 1.0)
    gain2.gain.setValueAtTime(0.001, ctx.currentTime)
    gain2.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1)
    osc2.connect(gain2); gain2.connect(ctx.destination)
    osc2.start(); osc2.stop(ctx.currentTime + 1.1)
  } catch { /* audio blocked — silently skip */ }
}

function playWalkIn() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx() as AudioContext
    ctx.resume()

    // White-noise whoosh filtered to a whomp
    const sampleRate = ctx.sampleRate
    const len = Math.ceil(sampleRate * 0.75)
    const buffer = ctx.createBuffer(1, len, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(900, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.65)
    filter.Q.value = 0.6
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75)
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    src.start()
  } catch { /* audio blocked — silently skip */ }
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
  const [phase,   setPhase]   = useState<'door' | 'opening' | 'walkin' | 'gallery'>('door')
  const [rotY,    setRotY]    = useState(0)
  const [camZ,    setCamZ]    = useState(0)
  const [room,    setRoom]    = useState(0)
  const [zoomed,  setZoomed]  = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const dragRef    = useRef<{ x: number; baseRot: number } | null>(null)
  const [liveRot,  setLiveRot]  = useState(0)
  const [dragging, setDragging] = useState(false)

  const openDoor = useCallback(() => {
    playDoorCreak()
    setPhase('opening')
    setTimeout(() => {
      playWalkIn()
      setPhase('walkin')
      setTimeout(() => {
        setPhase('gallery')
        setVisible(true)
      }, 750)
    }, 1000)
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
    setVisible(false)
    setPhase('door')
    document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ── Door entrance screen ───────────────────────────────────────────────────
  if (phase === 'door' || phase === 'opening' || phase === 'walkin') {
    return (
      <>
        <style>{CSS}</style>
        <div style={{
          position:'fixed', inset:0, zIndex:100,
          background:'radial-gradient(ellipse 130% 90% at 50% 35%, #13192a 0%, #080b12 100%)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:0, userSelect:'none',
        }}>
          {/* Ambient floor glow */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:'40%',
            background:'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
            pointerEvents:'none',
          }} />
          {/* Ceiling light halo */}
          <div style={{
            position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
            width:300, height:200,
            background:'radial-gradient(ellipse at 50% 0%, rgba(201,165,80,0.07), transparent 70%)',
            pointerEvents:'none',
          }} />

          {/* Label */}
          <p style={{
            color:'rgba(201,165,80,0.35)', fontSize:10, letterSpacing:'0.38em',
            textTransform:'uppercase', fontFamily:'Georgia,serif', marginBottom:28,
          }}>
            Sanal Sergi
          </p>

          {/* Door scene */}
          <div style={{ position:'relative', perspective:'900px', perspectiveOrigin:'50% 50%' }}>
            <div style={{ position:'relative', width:200, height:340 }}>

              {/* Glow from inside the gallery */}
              <div style={{
                position:'absolute', inset:0,
                background:'radial-gradient(ellipse 70% 80% at 50% 40%, rgba(255,200,90,0.13), transparent 70%)',
                pointerEvents:'none',
              }} />

              {/* Frame — gold border */}
              <div style={{ position:'absolute', inset:0, boxSizing:'border-box',
                border:'10px solid transparent',
                background:'transparent',
                outline:'none',
                boxShadow:'inset 0 0 0 10px rgba(201,165,80,0.0)',
              }}>
                {/* Top */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:GOLD_H }} />
                {/* Bottom */}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:10, background:GOLD_H }} />
                {/* Left */}
                <div style={{ position:'absolute', top:0, left:0, bottom:0, width:10, background:GOLD_V }} />
                {/* Right */}
                <div style={{ position:'absolute', top:0, right:0, bottom:0, width:10, background:GOLD_V }} />
                {/* Corners */}
                {([{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}] as React.CSSProperties[]).map((s,i) => (
                  <div key={i} style={{
                    position:'absolute', ...s, width:14, height:14, zIndex:1,
                    background:'radial-gradient(circle at 40% 40%, #f0c860, #7a5512)',
                    boxShadow:'0 0 6px rgba(201,165,80,0.5)',
                  }} />
                ))}
              </div>

              {/* Door panel */}
              <div style={{
                position:'absolute', inset:10,
                transformOrigin:'left center',
                transform: phase === 'opening' ? 'rotateY(-82deg)' : 'rotateY(0deg)',
                transition:'transform 1.1s cubic-bezier(0.4,0,0.2,1)',
                transformStyle:'preserve-3d',
                boxShadow: phase === 'opening' ? '12px 0 40px rgba(0,0,0,0.8)' : '0 0 0',
              }}>
                {/* Front face */}
                <div style={{
                  position:'absolute', inset:0, backfaceVisibility:'hidden',
                  background:'linear-gradient(160deg, #1e1408 0%, #110d04 45%, #1a1008 75%, #0d0804 100%)',
                }}>
                  {/* Upper panel recess */}
                  <div style={{ position:'absolute', top:14, left:14, right:14, height:'36%',
                    border:'1.5px solid rgba(201,165,80,0.13)',
                    background:'rgba(0,0,0,0.25)',
                    boxShadow:'inset 0 2px 8px rgba(0,0,0,0.5)',
                  }} />
                  {/* Lower panel recess */}
                  <div style={{ position:'absolute', bottom:14, left:14, right:14, top:'calc(36% + 28px)',
                    border:'1.5px solid rgba(201,165,80,0.13)',
                    background:'rgba(0,0,0,0.25)',
                    boxShadow:'inset 0 2px 8px rgba(0,0,0,0.5)',
                  }} />
                  {/* Center divider */}
                  <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1,
                    background:'rgba(201,165,80,0.06)',
                  }} />
                  {/* Handle */}
                  <div style={{ position:'absolute', right:16, top:'52%', transform:'translateY(-50%)' }}>
                    <div style={{
                      width:13, height:13, borderRadius:'50%',
                      background:'radial-gradient(circle at 35% 35%, #f0c860, #7a5512)',
                      boxShadow:'0 0 10px rgba(201,165,80,0.5), 0 2px 4px rgba(0,0,0,0.6)',
                    }} />
                    <div style={{ width:2, height:20, background:'linear-gradient(180deg,#c8952c,#7a5512)', margin:'3px auto 0', borderRadius:1 }} />
                  </div>
                </div>
                {/* Back face (inner door edge, visible when ajar) */}
                <div style={{
                  position:'absolute', inset:0,
                  transform:'rotateY(180deg)', backfaceVisibility:'hidden',
                  background:'#120e06',
                }} />
              </div>

              {/* Light leak through door crack (shows when opening) */}
              {phase === 'opening' && (
                <div style={{
                  position:'absolute', top:10, left:10, bottom:10, width:4,
                  background:'linear-gradient(90deg, rgba(255,200,90,0.35), transparent)',
                  animation:'gIn .3s ease',
                }} />
              )}
            </div>
          </div>

          {/* Enter button — hidden during walkin */}
          {phase !== 'walkin' && (
            <button
              onClick={openDoor}
              disabled={phase === 'opening'}
              style={{
                marginTop:36,
                padding:'12px 36px',
                background: phase === 'opening'
                  ? 'rgba(201,165,80,0.08)'
                  : 'linear-gradient(135deg,rgba(201,165,80,0.18),rgba(201,165,80,0.1))',
                border:'1px solid rgba(201,165,80,' + (phase === 'opening' ? '0.12' : '0.35') + ')',
                borderRadius:3,
                color: phase === 'opening' ? 'rgba(201,165,80,0.3)' : 'rgba(201,165,80,0.9)',
                fontSize:11, letterSpacing:'0.3em', textTransform:'uppercase',
                fontFamily:'Georgia,serif', cursor: phase === 'opening' ? 'default' : 'pointer',
                transition:'all .25s',
              }}
            >
              {phase === 'opening' ? 'Açılıyor…' : 'Kapıyı Aç'}
            </button>
          )}

          {/* Walk-in: gallery rushes toward viewer */}
          {phase === 'walkin' && (
            <div style={{
              position:'fixed', inset:0, zIndex:5,
              animation:'walkIn 0.75s cubic-bezier(0.2,0,0.4,1) forwards',
              background:'radial-gradient(ellipse 110% 80% at 50% 55%, #0d1220 0%, #060810 100%)',
            }} />
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position:'absolute', top:18, right:22, zIndex:25,
              background:'rgba(255,255,255,.04)', border:'1px solid rgba(201,165,80,.15)',
              borderRadius:'50%', width:34, height:34,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(201,165,80,.45)',
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
          position:'fixed', inset:0, zIndex:100,
          background:'radial-gradient(ellipse 110% 90% at 50% 60%, #0d1220 0%, #060810 100%)',
          overflow:'hidden', userSelect:'none',
          animation: visible ? 'walkIn 0.85s cubic-bezier(0.2,0,0.35,1) forwards' : 'none',
          opacity: visible ? undefined : 0,
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
  return (
    <Gallery3DBoundary onClose={onClose}>
      <ArtGallery3DInner artworks={artworks} isOpen={isOpen} onClose={onClose} />
    </Gallery3DBoundary>
  )
}
