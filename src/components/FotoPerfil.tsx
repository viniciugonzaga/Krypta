// src/components/FotoPerfil.tsx
// ============================================================
// FOTO DE PERFIL — v1.4.0
//
// • Conta nova: perfil ANÔNIMO (fundo roxo + ícone branco de pessoa).
// • A pessoa pode escolher um dos 12 Codys como avatar e a COR DO FUNDO.
// • Ou enviar uma foto própria (o app recorta e reduz para 320×320 JPEG
//   antes de enviar; fica salva no banco, em users.avatar_url).
//
// Valor guardado em users.avatar_url:
//   null                      → anônimo
//   "cody:<1-12>:#RRGGBB"     → Cody nº n com o fundo na cor escolhida
//   "data:image/jpeg;base64…" → foto enviada
//   "preset:robo-…"           → formato da v1.3.0 (ainda funciona)
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, Download, ImageUp, Loader2, Palette, RotateCcw, User, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Camada } from './Camada';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserAPI, handleApiError } from '../services/api';
import av1 from '../assets/cody/avatar1.webp';
import av2 from '../assets/cody/avatar2.webp';
import av3 from '../assets/cody/avatar3.webp';
import av4 from '../assets/cody/avatar4.webp';
import av5 from '../assets/cody/avatar5.webp';
import av6 from '../assets/cody/avatar6.webp';
import av7 from '../assets/cody/avatar7.webp';
import av8 from '../assets/cody/avatar8.webp';
import av9 from '../assets/cody/avatar9.webp';
import av10 from '../assets/cody/avatar10.webp';
import av11 from '../assets/cody/avatar11.webp';
import av12 from '../assets/cody/avatar12.webp';

export const CODYS = [
  { n: 1, img: av1, nome: 'Cody feliz' },
  { n: 2, img: av2, nome: 'Cody hacker' },
  { n: 3, img: av3, nome: 'Cody pensativo' },
  { n: 4, img: av4, nome: 'Cody chorão' },
  { n: 5, img: av5, nome: 'Cody surpreso' },
  { n: 6, img: av6, nome: 'Cody bravo' },
  { n: 7, img: av7, nome: 'Cody apaixonado' },
  { n: 8, img: av8, nome: 'Cody de gorro' },
  { n: 9, img: av9, nome: 'Cody cavalheiro' },
  { n: 10, img: av10, nome: 'Cody jogador' },
  { n: 11, img: av11, nome: 'Cody gamer' },
  { n: 12, img: av12, nome: 'Cody pipa' },
] as const;

export const CORES_FUNDO = ['#5100BD', '#8D51FF', '#C6AEF8', '#0B0218', '#1E3A8A', '#0EA5E9', '#047857', '#22C55E', '#BE185D', '#F97316', '#FACC15', '#FFFFFF'];

const ANONIMO = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';
const LEGADO: Record<string, string> = {
  'robo-roxo': 'cody:1:#5100BD',
  'robo-noite': 'cody:2:#0B0218',
  'robo-lilas': 'cody:7:#C6AEF8',
  'robo-mar': 'cody:10:#1E3A8A',
  'robo-mata': 'cody:8:#047857',
  'robo-coral': 'cody:3:#BE185D',
};

export type AvatarLido = { tipo: 'anonimo' } | { tipo: 'foto'; src: string } | { tipo: 'cody'; n: number; cor: string };

export function lerAvatar(avatar?: string | null): AvatarLido {
  if (!avatar) return { tipo: 'anonimo' };
  if (avatar.startsWith('data:image/')) return { tipo: 'foto', src: avatar };
  const v = avatar.startsWith('preset:') ? LEGADO[avatar.slice(7)] ?? 'cody:1:#5100BD' : avatar;
  const m = /^[ck]ody:(\d{1,2}):(#[0-9a-fA-F]{6})$/.exec(v); // "kody:" = salvo na v1.4.0
  if (m && +m[1] >= 1 && +m[1] <= 12) return { tipo: 'cody', n: +m[1], cor: m[2] };
  return { tipo: 'anonimo' };
}

function fundoDaCor(cor: string) {
  return `radial-gradient(circle at 30% 25%, ${cor}CC 0%, ${cor} 60%)`;
}

export function FotoPerfil({ avatar, nome, tamanho = 40, className = '' }: { avatar?: string | null; nome?: string; tamanho?: number; className?: string }) {
  const a = lerAvatar(avatar);
  const fundo = a.tipo === 'cody' ? fundoDaCor(a.cor) : a.tipo === 'foto' ? '#1a0b33' : ANONIMO;
  return (
    <span className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`} style={{ width: tamanho, height: tamanho, background: fundo }} title={nome}>
      {a.tipo === 'foto' && <img src={a.src} alt={nome ? `Foto de ${nome}` : 'Foto de perfil'} className="w-full h-full object-cover" draggable={false} />}
      {a.tipo === 'cody' && <img src={CODYS[a.n - 1].img} alt="" className="object-contain" style={{ width: '86%', height: '86%', marginTop: '10%' }} draggable={false} />}
      {a.tipo === 'anonimo' && <User className="text-white" style={{ width: tamanho * 0.52, height: tamanho * 0.52 }} fill="currentColor" strokeWidth={1.5} />}
    </span>
  );
}

// ------------------------------------------------------------
// AJUSTAR A FOTO (v1.5.0): arrastar para posicionar + zoom
// ------------------------------------------------------------
const VISOR = 240; // tamanho do círculo de ajuste na tela (px)

interface Original {
  img: HTMLImageElement;
  w: number;
  h: number;
}

async function abrirImagem(arquivo: File): Promise<Original> {
  const url = URL.createObjectURL(arquivo);
  const img = await new Promise<HTMLImageElement>((ok, erro) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => erro(new Error('Não foi possível abrir esta imagem.'));
    i.src = url;
  });
  return { img, w: img.naturalWidth, h: img.naturalHeight };
}

/** tamanho exibido da imagem no visor, para um zoom */
function exibido(o: Original, zoom: number) {
  const base = VISOR / Math.min(o.w, o.h);
  return { w: o.w * base * zoom, h: o.h * base * zoom };
}

/** não deixa sobrar espaço vazio dentro do círculo */
function limitar(o: Original, zoom: number, x: number, y: number) {
  const d = exibido(o, zoom);
  const mx = (d.w - VISOR) / 2;
  const my = (d.h - VISOR) / 2;
  return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
}

/** gera o JPEG 320×320 exatamente como aparece no círculo */
function recortar(o: Original, zoom: number, x: number, y: number): string {
  const d = exibido(o, zoom);
  const k = 320 / VISOR;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 320;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(o.img, ((VISOR - d.w) / 2 + x) * k, ((VISOR - d.h) / 2 + y) * k, d.w * k, d.h * k);
  return cv.toDataURL('image/jpeg', 0.86);
}

function Ajustador({ o, zoom, pos, onZoom, onPos, borda, muted }: { o: Original; zoom: number; pos: { x: number; y: number }; onZoom: (z: number) => void; onPos: (p: { x: number; y: number }) => void; borda: string; muted: string }) {
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const d = exibido(o, zoom);
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ width: VISOR, height: VISOR, border: `2px solid ${borda}`, background: '#1a0b33' }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (a) onPos(limitar(o, zoom, a.x + e.clientX - a.px, a.y + e.clientY - a.py));
        }}
        onPointerUp={() => (arrasto.current = null)}
        onPointerCancel={() => (arrasto.current = null)}
        onWheel={(e) => {
          const z = Math.max(1, Math.min(3, zoom - e.deltaY * 0.0015));
          onZoom(z);
          onPos(limitar(o, z, pos.x, pos.y));
        }}
        aria-label="Arraste para posicionar a foto"
      >
        <img
          src={o.img.src}
          alt=""
          draggable={false}
          className="absolute max-w-none pointer-events-none"
          style={{ width: d.w, height: d.h, left: (VISOR - d.w) / 2 + pos.x, top: (VISOR - d.h) / 2 + pos.y }}
        />
      </div>
      <label className="w-full max-w-[260px] mt-3 flex items-center gap-3 text-[12px]" style={{ color: muted }}>
        <ZoomOut className="w-4 h-4 shrink-0" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => {
            const z = Number(e.target.value);
            onZoom(z);
            onPos(limitar(o, z, pos.x, pos.y));
          }}
          className="flex-1 accent-purple-600"
          aria-label="Zoom da foto"
        />
        <ZoomIn className="w-4 h-4 shrink-0" />
      </label>
      <p className="text-[11.5px] mt-1" style={{ color: muted }}>
        Arraste para posicionar e use o zoom para ajustar.
      </p>
    </div>
  );
}

/** Gera um PNG 512×512 do avatar atual (para baixar e usar em outro lugar) */
async function exportarPng(a: AvatarLido): Promise<string> {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const ctx = cv.getContext('2d')!;
  const carregar = (src: string) =>
    new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = src;
    });
  ctx.beginPath();
  ctx.arc(256, 256, 256, 0, Math.PI * 2);
  ctx.clip();
  if (a.tipo === 'foto') ctx.drawImage(await carregar(a.src), 0, 0, 512, 512);
  else {
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    if (a.tipo === 'cody') {
      g.addColorStop(0, a.cor);
      g.addColorStop(1, a.cor);
    } else {
      g.addColorStop(0, '#5100BD');
      g.addColorStop(1, '#8d51ff');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    if (a.tipo === 'cody') ctx.drawImage(await carregar(CODYS[a.n - 1].img), 36, 72, 440, 440);
  }
  return cv.toDataURL('image/png');
}

/** Janela para escolher a foto: Cody + cor do fundo, foto própria ou anônimo */
export function EditorFoto({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atual = lerAvatar(user?.avatarUrl);
  const [aba, setAba] = useState<'cody' | 'foto'>('cody');
  const [n, setN] = useState(atual.tipo === 'cody' ? atual.n : 1);
  const [cor, setCor] = useState(atual.tipo === 'cody' ? atual.cor : '#5100BD');
  const [foto, setFoto] = useState<string | null>(atual.tipo === 'foto' ? atual.src : null);
  // foto nova escolhida agora (ainda sendo ajustada)
  const [original, setOriginal] = useState<Original | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!aberto) return;
    const a = lerAvatar(user?.avatarUrl);
    setErro(null);
    setAba(a.tipo === 'foto' ? 'foto' : 'cody');
    if (a.tipo === 'cody') {
      setN(a.n);
      setCor(a.cor);
    }
    setFoto(a.tipo === 'foto' ? a.src : null);
    setOriginal(null);
  }, [aberto, user?.avatarUrl]);

  const novo = aba === 'cody' ? `cody:${n}:${cor.toUpperCase()}` : original ? 'ajustando' : foto;

  const salvar = async (avatar: string | null) => {
    setErro(null);
    setOcupado(true);
    try {
      await UserAPI.update({ avatar });
      updateUser({ avatarUrl: avatar });
      onFechar();
    } catch (e) {
      setErro(handleApiError(e).message);
    } finally {
      setOcupado(false);
    }
  };

  const escolherArquivo = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setErro('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
    try {
      setOriginal(await abrirImagem(f));
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setAba('foto');
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const baixar = async () => {
    const atualNovo = aba === 'foto' && original ? recortar(original, zoom, pos.x, pos.y) : novo;
    const url = await exportarPng(lerAvatar(atualNovo ?? user?.avatarUrl));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'krypta-avatar.png';
    a.click();
  };

  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.6)';
  const borda = isDark ? 'rgba(141,81,255,0.35)' : 'rgba(97,49,201,0.22)';
  const roxo = isDark ? '#c9b3ff' : '#5100BD';

  return (
    <Camada>
    <AnimatePresence>
      {aberto && user && (
        <motion.div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(5,0,16,0.6)' }} onClick={onFechar}>
          <motion.div
            role="dialog"
            aria-label="Foto de perfil"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl p-5 max-h-[92dvh] overflow-y-auto"
            style={{ background: isDark ? '#140726' : '#FFFFFF', color: fg, border: `1.5px solid ${borda}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-lg">Foto de perfil</p>
              <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 opacity-70 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* prévia */}
            <div className={`flex flex-col items-center mb-4 ${aba === 'foto' && original ? 'hidden' : ''}`}>
              <motion.div key={novo ?? 'x'} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                <FotoPerfil avatar={novo === 'ajustando' ? null : novo} nome={user.name} tamanho={112} />
              </motion.div>
              <p className="text-[12px] mt-2" style={{ color: muted }}>
                {aba === 'cody' ? CODYS[n - 1].nome : foto ? 'Sua foto' : 'Escolha uma imagem'}
              </p>
            </div>

            {/* abas */}
            <div className="flex p-1 rounded-full mb-4" style={{ border: `1.5px solid ${borda}` }}>
              {(['cody', 'foto'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setAba(t)} className="flex-1 h-9 rounded-full text-[13px] font-semibold" style={aba === t ? { background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', color: '#fff' } : { color: muted }}>
                  {t === 'cody' ? 'Avatar Cody' : 'Minha foto'}
                </button>
              ))}
            </div>

            {aba === 'cody' ? (
              <>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {CODYS.map((k) => (
                    <button key={k.n} type="button" onClick={() => setN(k.n)} aria-label={k.nome} title={k.nome} className="relative rounded-full" style={{ outline: n === k.n ? `2.5px solid ${roxo}` : 'none', outlineOffset: 2 }}>
                      <FotoPerfil avatar={`cody:${k.n}:${cor}`} tamanho={46} />
                    </button>
                  ))}
                </div>
                <p className="text-[12px] mb-2 flex items-center gap-1.5" style={{ color: muted }}>
                  <Palette className="w-3.5 h-3.5" /> Cor do fundo
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  {CORES_FUNDO.map((k) => (
                    <button key={k} type="button" onClick={() => setCor(k)} aria-label={`Fundo ${k}`} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: k, border: `1.5px solid ${borda}`, outline: cor.toUpperCase() === k ? `2.5px solid ${roxo}` : 'none', outlineOffset: 2 }}>
                      {cor.toUpperCase() === k && <Check className="w-4 h-4" style={{ color: k === '#FFFFFF' || k === '#FACC15' || k === '#C6AEF8' ? '#1a1a1a' : '#fff' }} />}
                    </button>
                  ))}
                  <label className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer flex items-center justify-center" title="Outra cor" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: `1.5px solid ${borda}` }}>
                    <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Escolher outra cor" />
                  </label>
                </div>
              </>
            ) : (
              <>
                {original && <Ajustador o={original} zoom={zoom} pos={pos} onZoom={setZoom} onPos={setPos} borda={roxo} muted={muted} />}
                <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void escolherArquivo(e.target.files?.[0])} />
                <button type="button" onClick={() => entrada.current?.click()} className={`w-full flex flex-col items-center justify-center gap-1 rounded-2xl text-[13px] ${original ? 'py-3 mt-3' : 'py-6'}`} style={{ border: `1.5px dashed ${borda}`, color: roxo }}>
                  <ImageUp className="w-6 h-6" />
                  <span className="font-semibold">{foto || original ? 'Escolher outra imagem' : 'Escolher imagem do aparelho'}</span>
                  {!original && <span style={{ color: muted }}>JPG, PNG ou WebP. Depois você ajusta a posição e o zoom.</span>}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={ocupado || !novo || novo === user.avatarUrl}
              onClick={() => void salvar(novo === 'ajustando' && original ? recortar(original, zoom, pos.x, pos.y) : novo)}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}
            >
              {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Usar como foto de perfil
            </button>
            <div className="flex items-center justify-center gap-5 mt-3 text-[12.5px]">
              <button type="button" onClick={() => void baixar()} className="flex items-center gap-1.5" style={{ color: roxo }}>
                <Download className="w-4 h-4" /> Baixar imagem
              </button>
              {user.avatarUrl && (
                <button type="button" disabled={ocupado} onClick={() => void salvar(null)} className="flex items-center gap-1.5" style={{ color: muted }}>
                  <RotateCcw className="w-4 h-4" /> Voltar ao anônimo
                </button>
              )}
            </div>
            {erro && <p className="mt-3 text-[12.5px] text-center" style={{ color: '#f87171' }}>{erro}</p>}
            <p className="mt-4 text-[11px] text-center" style={{ color: muted }}>
              Opcional. A foto fica salva na sua conta e aparece no site, no celular e no app do Windows.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </Camada>
  );
}
