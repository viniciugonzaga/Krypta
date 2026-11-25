// src/components/FotoPerfil.tsx
// ============================================================
// v1.3.0 — FOTO DE PERFIL (opcional) e AVATAR PADRÃO DO KRYPTA
//
// Antes aparecia só a letra do nome. Agora:
//   • foto enviada pela pessoa (o app reduz para 256×256 JPEG antes de enviar)
//   • ou um avatar padrão do Krypta (robôs em cores diferentes)
//   • sem nada escolhido → robô roxo padrão (igual para todo mundo)
// Guardado em users.avatar_url ("data:image/..." ou "preset:<id>").
// ============================================================
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, Loader2, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserAPI, handleApiError } from '../services/api';
import roboAcenando from '../assets/sprites/sprite_robo_acenando.png';
import roboVerificado from '../assets/sprites/sprite_robo_verificado.png';
import roboAbraco from '../assets/sprites/sprite_robo_abraco.png';
import roboAnimado from '../assets/sprites/sprite_robo_animado.png';
import roboConfig from '../assets/sprites/sprite_robo_configuracao.png';
import roboInterrogacao from '../assets/sprites/sprite_robo_interrogacao.png';

export const AVATARES = [
  { id: 'robo-roxo', nome: 'Roxo', img: roboAcenando, fundo: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' },
  { id: 'robo-noite', nome: 'Noite', img: roboVerificado, fundo: 'linear-gradient(135deg, #0b0218 0%, #3a1180 100%)' },
  { id: 'robo-lilas', nome: 'Lilás', img: roboAbraco, fundo: 'linear-gradient(135deg, #8d51ff 0%, #C6AEF8 100%)' },
  { id: 'robo-mar', nome: 'Mar', img: roboAnimado, fundo: 'linear-gradient(135deg, #1e3a8a 0%, #38bdf8 100%)' },
  { id: 'robo-mata', nome: 'Mata', img: roboConfig, fundo: 'linear-gradient(135deg, #065f46 0%, #34d399 100%)' },
  { id: 'robo-coral', nome: 'Coral', img: roboInterrogacao, fundo: 'linear-gradient(135deg, #9d174d 0%, #fb7185 100%)' },
] as const;
const PADRAO = AVATARES[0];

export function FotoPerfil({ avatar, nome, tamanho = 40, className = '' }: { avatar?: string | null; nome?: string; tamanho?: number; className?: string }) {
  const foto = avatar?.startsWith('data:image/') ? avatar : null;
  const preset = AVATARES.find((a) => avatar === `preset:${a.id}`) ?? PADRAO;
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: tamanho, height: tamanho, background: foto ? '#1a0b33' : preset.fundo }}
      title={nome}
    >
      {foto ? (
        <img src={foto} alt={nome ? `Foto de ${nome}` : 'Foto de perfil'} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <img src={preset.img} alt="" className="object-contain" style={{ width: '82%', height: '82%', marginTop: '12%' }} draggable={false} />
      )}
    </span>
  );
}

/** Reduz a imagem escolhida para um quadrado de 256 px (JPEG) */
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
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
    return cv.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Janela para trocar a foto: enviar, escolher um avatar do Krypta ou remover */
export function EditorFoto({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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

  const escolher = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setErro('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
    try {
      await salvar(await reduzir(f));
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.6)';
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
            className="w-full max-w-sm rounded-3xl p-5"
            style={{ background: isDark ? '#140726' : '#FFFFFF', color: fg, border: `1.5px solid ${isDark ? 'rgba(141,81,255,0.45)' : 'rgba(97,49,201,0.25)'}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-lg">Foto de perfil</p>
              <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 opacity-70 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <FotoPerfil avatar={user.avatarUrl} nome={user.name} tamanho={96} />
            </div>
            <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void escolher(e.target.files?.[0])} />
            <button
              type="button"
              disabled={ocupado}
              onClick={() => entrada.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}
            >
              {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Enviar uma foto
            </button>
            <p className="text-[12px] mt-4 mb-2" style={{ color: muted }}>
              Ou use um avatar do Krypta:
            </p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARES.map((a) => {
                const atual = user.avatarUrl === `preset:${a.id}` || (!user.avatarUrl && a.id === PADRAO.id);
                return (
                  <button key={a.id} type="button" disabled={ocupado} onClick={() => void salvar(`preset:${a.id}`)} aria-label={`Avatar ${a.nome}`} className="relative rounded-full" style={{ outline: atual ? '2.5px solid #8d51ff' : 'none', outlineOffset: 2 }}>
                    <FotoPerfil avatar={`preset:${a.id}`} tamanho={44} />
                    {atual && <Check className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full p-0.5 text-white" style={{ background: '#22c55e' }} />}
                  </button>
                );
              })}
            </div>
            {user.avatarUrl && (
              <button type="button" disabled={ocupado} onClick={() => void salvar(null)} className="mt-4 w-full flex items-center justify-center gap-1.5 text-[13px]" style={{ color: '#f87171' }}>
                <Trash2 className="w-4 h-4" /> Remover foto
              </button>
            )}
            {erro && <p className="mt-3 text-[12.5px] text-center" style={{ color: '#f87171' }}>{erro}</p>}
            <p className="mt-4 text-[11px] text-center" style={{ color: muted }}>
              A foto é opcional e ajuda você e seus herdeiros a reconhecerem a conta.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
