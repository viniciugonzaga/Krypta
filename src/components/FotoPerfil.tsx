// src/components/FotoPerfil.tsx
// ============================================================
// FOTO DE PERFIL — v1.4.0
//
// • Conta nova: perfil ANÔNIMO (fundo roxo + ícone branco de pessoa).
// • A pessoa pode escolher um dos 12 Kodys como avatar e a COR DO FUNDO.
// • Ou enviar uma foto própria (o app recorta e reduz para 320×320 JPEG
//   antes de enviar; fica salva no banco, em users.avatar_url).
//
// Valor guardado em users.avatar_url:
//   null                      → anônimo
//   "kody:<1-12>:#RRGGBB"     → Kody nº n com o fundo na cor escolhida
//   "data:image/jpeg;base64…" → foto enviada
//   "preset:robo-…"           → formato da v1.3.0 (ainda funciona)
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, Download, ImageUp, Loader2, Palette, RotateCcw, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserAPI, handleApiError } from '../services/api';
import av1 from '../assets/kody/avatar1.webp';
import av2 from '../assets/kody/avatar2.webp';
import av3 from '../assets/kody/avatar3.webp';
import av4 from '../assets/kody/avatar4.webp';
import av5 from '../assets/kody/avatar5.webp';
import av6 from '../assets/kody/avatar6.webp';
import av7 from '../assets/kody/avatar7.webp';
import av8 from '../assets/kody/avatar8.webp';
import av9 from '../assets/kody/avatar9.webp';
import av10 from '../assets/kody/avatar10.webp';
import av11 from '../assets/kody/avatar11.webp';
import av12 from '../assets/kody/avatar12.webp';

export const KODYS = [
  { n: 1, img: av1, nome: 'Kody feliz' },
  { n: 2, img: av2, nome: 'Kody hacker' },
  { n: 3, img: av3, nome: 'Kody pensativo' },
  { n: 4, img: av4, nome: 'Kody chorão' },
  { n: 5, img: av5, nome: 'Kody surpreso' },
  { n: 6, img: av6, nome: 'Kody bravo' },
  { n: 7, img: av7, nome: 'Kody apaixonado' },
  { n: 8, img: av8, nome: 'Kody de gorro' },
  { n: 9, img: av9, nome: 'Kody cavalheiro' },
  { n: 10, img: av10, nome: 'Kody jogador' },
  { n: 11, img: av11, nome: 'Kody gamer' },
  { n: 12, img: av12, nome: 'Kody pipa' },
] as const;

export const CORES_FUNDO = ['#5100BD', '#8D51FF', '#C6AEF8', '#0B0218', '#1E3A8A', '#0EA5E9', '#047857', '#22C55E', '#BE185D', '#F97316', '#FACC15', '#FFFFFF'];

const ANONIMO = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';
const LEGADO: Record<string, string> = {
  'robo-roxo': 'kody:1:#5100BD',
  'robo-noite': 'kody:2:#0B0218',
  'robo-lilas': 'kody:7:#C6AEF8',
  'robo-mar': 'kody:10:#1E3A8A',
  'robo-mata': 'kody:8:#047857',
  'robo-coral': 'kody:3:#BE185D',
};

export type AvatarLido = { tipo: 'anonimo' } | { tipo: 'foto'; src: string } | { tipo: 'kody'; n: number; cor: string };

export function lerAvatar(avatar?: string | null): AvatarLido {
  if (!avatar) return { tipo: 'anonimo' };
  if (avatar.startsWith('data:image/')) return { tipo: 'foto', src: avatar };
  const v = avatar.startsWith('preset:') ? LEGADO[avatar.slice(7)] ?? 'kody:1:#5100BD' : avatar;
  const m = /^kody:(\d{1,2}):(#[0-9a-fA-F]{6})$/.exec(v);
  if (m && +m[1] >= 1 && +m[1] <= 12) return { tipo: 'kody', n: +m[1], cor: m[2] };
  return { tipo: 'anonimo' };
}

function fundoDaCor(cor: string) {
  return `radial-gradient(circle at 30% 25%, ${cor}CC 0%, ${cor} 60%)`;
}

export function FotoPerfil({ avatar, nome, tamanho = 40, className = '' }: { avatar?: string | null; nome?: string; tamanho?: number; className?: string }) {
  const a = lerAvatar(avatar);
  const fundo = a.tipo === 'kody' ? fundoDaCor(a.cor) : a.tipo === 'foto' ? '#1a0b33' : ANONIMO;
  return (
    <span className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`} style={{ width: tamanho, height: tamanho, background: fundo }} title={nome}>
      {a.tipo === 'foto' && <img src={a.src} alt={nome ? `Foto de ${nome}` : 'Foto de perfil'} className="w-full h-full object-cover" draggable={false} />}
      {a.tipo === 'kody' && <img src={KODYS[a.n - 1].img} alt="" className="object-contain" style={{ width: '86%', height: '86%', marginTop: '10%' }} draggable={false} />}
      {a.tipo === 'anonimo' && <User className="text-white" style={{ width: tamanho * 0.52, height: tamanho * 0.52 }} fill="currentColor" strokeWidth={1.5} />}
    </span>
  );
}

/** Recorta no centro e reduz para 320×320 JPEG */
async function reduzir(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não foi possível abrir esta imagem.'));
      i.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 320;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 320, 320);
    return cv.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
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
    if (a.tipo === 'kody') {
      g.addColorStop(0, a.cor);
      g.addColorStop(1, a.cor);
    } else {
      g.addColorStop(0, '#5100BD');
      g.addColorStop(1, '#8d51ff');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    if (a.tipo === 'kody') ctx.drawImage(await carregar(KODYS[a.n - 1].img), 36, 72, 440, 440);
  }
  return cv.toDataURL('image/png');
}

/** Janela para escolher a foto: Kody + cor do fundo, foto própria ou anônimo */
export function EditorFoto({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atual = lerAvatar(user?.avatarUrl);
  const [aba, setAba] = useState<'kody' | 'foto'>('kody');
  const [n, setN] = useState(atual.tipo === 'kody' ? atual.n : 1);
  const [cor, setCor] = useState(atual.tipo === 'kody' ? atual.cor : '#5100BD');
  const [foto, setFoto] = useState<string | null>(atual.tipo === 'foto' ? atual.src : null);

  useEffect(() => {
    if (!aberto) return;
    const a = lerAvatar(user?.avatarUrl);
    setErro(null);
    setAba(a.tipo === 'foto' ? 'foto' : 'kody');
    if (a.tipo === 'kody') {
      setN(a.n);
      setCor(a.cor);
    }
    setFoto(a.tipo === 'foto' ? a.src : null);
  }, [aberto, user?.avatarUrl]);

  const novo = aba === 'kody' ? `kody:${n}:${cor.toUpperCase()}` : foto;

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
      setFoto(await reduzir(f));
      setAba('foto');
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const baixar = async () => {
    const url = await exportarPng(lerAvatar(novo ?? user?.avatarUrl));
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
            <div className="flex flex-col items-center mb-4">
              <motion.div key={novo ?? 'x'} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                <FotoPerfil avatar={novo} nome={user.name} tamanho={112} />
              </motion.div>
              <p className="text-[12px] mt-2" style={{ color: muted }}>
                {aba === 'kody' ? KODYS[n - 1].nome : foto ? 'Sua foto' : 'Escolha uma imagem'}
              </p>
            </div>

            {/* abas */}
            <div className="flex p-1 rounded-full mb-4" style={{ border: `1.5px solid ${borda}` }}>
              {(['kody', 'foto'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setAba(t)} className="flex-1 h-9 rounded-full text-[13px] font-semibold" style={aba === t ? { background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', color: '#fff' } : { color: muted }}>
                  {t === 'kody' ? 'Avatar Kody' : 'Minha foto'}
                </button>
              ))}
            </div>

            {aba === 'kody' ? (
              <>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {KODYS.map((k) => (
                    <button key={k.n} type="button" onClick={() => setN(k.n)} aria-label={k.nome} title={k.nome} className="relative rounded-full" style={{ outline: n === k.n ? `2.5px solid ${roxo}` : 'none', outlineOffset: 2 }}>
                      <FotoPerfil avatar={`kody:${k.n}:${cor}`} tamanho={46} />
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
                <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void escolherArquivo(e.target.files?.[0])} />
                <button type="button" onClick={() => entrada.current?.click()} className="w-full flex flex-col items-center justify-center gap-1 py-6 rounded-2xl text-[13px]" style={{ border: `1.5px dashed ${borda}`, color: roxo }}>
                  <ImageUp className="w-6 h-6" />
                  <span className="font-semibold">{foto ? 'Escolher outra imagem' : 'Escolher imagem do aparelho'}</span>
                  <span style={{ color: muted }}>JPG, PNG ou WebP. O Krypta recorta no centro.</span>
                </button>
              </>
            )}

            <button
              type="button"
              disabled={ocupado || !novo || novo === user.avatarUrl}
              onClick={() => void salvar(novo)}
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
  );
}
