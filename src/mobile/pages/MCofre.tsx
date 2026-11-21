// src/mobile/pages/MCofre.tsx
// ============================================================
// MODO MOBILE — Cofre
//   MCofre         → "/device"            Cofre Digital (chaves + atalhos)
//   (Minhas chaves e Nova chave ficam em MChaves.tsx)
//   MVerCofre/MPerdiCcp ficam em MAcesso.tsx
//   MHerancaApp    → "/heranca-digital"    estado da herança digital
//   MBloqueio      → "/bloqueio"           Kill Switch e vincular este aparelho
//   MEmergencia    → "/emergencia"         recursos de emergência
//   MCofreCompleto → "/cofre/completo"     tela completa do site (pareamento, CCP, herança...)
// Tudo usa as mesmas funções do site (services/vaultFlows.ts).
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  Cpu,
  Eye,
  HelpCircle,
  KeyRound,
  Lightbulb,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Device } from '../../pages/Device';
import { handleApiError } from '../../services/api';
import * as Flows from '../../services/vaultFlows';
import { normalizarSegredo, segredoValido } from '../../crypto/kryptaCrypto';
import { useCofre } from '../useCofre';
import { LinhaChave } from './MChaves';
import { CofreNaoPronto } from './CofreNaoPronto';
import { FONTE, GRAD, MAviso, MBotao, MCampo, MCard, MFolha, MInterruptor, MLinhaAcao, MTitulo, MobileShell, useMCores } from '../ui';

// ============================================================
// COFRE DIGITAL
// ============================================================
export function MCofre() {
  const c = useMCores();
  const navigate = useNavigate();
  const { conta, dispositivo, carregando, erro, aqui, pronto } = useCofre();
  const chaves = dispositivo?.credenciais ?? [];
  const r = conta?.recursos;

  return (
    <MobileShell>
      <MTitulo c={c} titulo="Cofre Digital" sub="Aqui estão suas chaves, sempre protegidas." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : (
        <>
          {erro && <div className="mb-4"><MAviso tipo="erro">{erro}</MAviso></div>}
          {!pronto && <CofreNaoPronto c={c} estado={conta?.status} aqui={aqui} />}
          {!aqui && conta && conta.status !== 'PENDENTE_PAREAMENTO' && (
            <MLinhaAcao c={c} i={1} icone={<Eye className="w-5 h-5" />} titulo="Ver o cofre neste aparelho" texto="Só leitura, com a sua chave de contingência (CCP)." to="/cofre/ver" trava={!r?.multiAparelho} />
          )}

          {pronto && (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/cofre/nova-chave')}
                className="w-full rounded-2xl p-4 flex items-center gap-3 text-left text-white mb-4"
                style={{ background: GRAD, boxShadow: '0 10px 26px rgba(97,49,201,0.4)' }}
              >
                <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ border: '2px solid rgba(255,255,255,0.8)' }}>
                  <Plus className="w-6 h-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[16px]">Criar nova chave</span>
                  <span className="block text-[12px] text-white/80">Adicione uma nova credencial ao seu cofre.</span>
                </span>
                <ChevronRight className="w-6 h-6" />
              </motion.button>

              <MCard c={c} i={1} className="mb-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" style={{ color: c.roxo }} /> Minhas chaves</p>
                  <button type="button" onClick={() => navigate('/cofre/chaves')} className="text-[12px] flex items-center" style={{ color: c.roxo }}>
                    Ver todas <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {chaves.length === 0 ? (
                  <p className="text-[13px] py-4 text-center" style={{ color: c.suave }}>Nenhuma chave ainda. Toque no + para criar a primeira.</p>
                ) : (
                  <ul>{chaves.slice(0, 3).map((cred) => <LinhaChave key={cred.id} c={c} cred={cred} onAbrir={() => navigate('/cofre/chaves')} />)}</ul>
                )}
              </MCard>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <MCard c={c} i={2} onClick={() => navigate('/heranca-digital')}>
              <p className="font-semibold text-[14px] flex items-center gap-1.5"><Users className="w-4 h-4" style={{ color: c.roxo }} /> Herança Digital</p>
              <p className="text-[11.5px] mt-1 leading-snug" style={{ color: c.suave }}>Seu cofre chega a quem você confia.</p>
              <p className="text-[11px] mt-2 font-semibold" style={{ color: conta?.heranca_ativa ? '#22c55e' : c.roxo }}>{conta?.heranca_ativa ? 'Ativa' : r?.heranca ? 'Configurar →' : 'Pro'}</p>
            </MCard>
            <MCard c={c} i={3} onClick={() => navigate('/bloqueio')}>
              <p className="font-semibold text-[14px] flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" style={{ color: c.roxo }} /> Bloqueio Remoto</p>
              <p className="text-[11.5px] mt-1 leading-snug" style={{ color: c.suave }}>Bloqueie o cofre em caso de perda ou roubo.</p>
              <p className="text-[11px] mt-2 font-semibold" style={{ color: conta?.status === 'REVOGADA' ? '#f87171' : c.roxo }}>{conta?.status === 'REVOGADA' ? 'Bloqueado' : r?.killSwitch ? 'Abrir →' : 'Pro'}</p>
            </MCard>
          </div>
          <MLinhaAcao c={c} i={4} icone={<AlertTriangle className="w-5 h-5" />} titulo="Recursos de Emergência" texto="Recuperação, acesso suspeito e suporte." to="/emergencia" />
          <button type="button" onClick={() => navigate('/cofre/completo')} className="w-full text-center text-[12px] mt-4 underline underline-offset-4" style={{ color: c.suave }}>
            Abrir a tela completa do cofre (CCP, dispositivo, kit de herança)
          </button>
        </>
      )}
    </MobileShell>
  );
}

// ============================================================
// HERANÇA DIGITAL
// ============================================================
export function MHerancaApp() {
  const c = useMCores();
  const navigate = useNavigate();
  const { conta, carregando } = useCofre();
  const liberado = !!conta?.recursos?.heranca;
  const ativa = !!conta?.heranca_ativa;

  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Herança Digital" sub="Compartilhe o acesso às suas informações com pessoas de confiança." />
      <p className="text-[12.5px] rounded-xl p-3 mb-4" style={{ background: c.faixa }}>
        Você gera um <strong>kit do herdeiro</strong> (um código que só essa pessoa usa). Se precisar, ela abre seu cofre num aparelho novo, sem ter conta no Krypta.
      </p>
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : (
        <div className="space-y-3">
          <MCard c={c} i={0} className="flex items-center gap-3">
            <Users className="w-6 h-6" style={{ color: c.roxo }} />
            <span className="flex-1">
              <span className="block font-semibold">Status do recurso</span>
              <span className="block text-[12px]" style={{ color: c.suave }}>Sua herança digital está {ativa ? 'ativada' : 'desativada'}.</span>
            </span>
            <MInterruptor ligado={ativa} onChange={() => navigate(liberado || ativa ? '/cofre/completo#heranca' : '/plans')} />
          </MCard>

          {!liberado && !ativa ? (
            <MCard c={c} i={1} destaque>
              <p className="font-semibold flex items-center gap-2"><span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: GRAD }}>PRO</span> Recurso do Krypta Pro</p>
              <p className="text-[12.5px] mt-1 mb-3" style={{ color: c.suave }}>Assine o Pro para ativar a herança digital.</p>
              <MBotao onClick={() => navigate('/plans')}>Ver o Krypta Pro</MBotao>
            </MCard>
          ) : (
            <MLinhaAcao c={c} i={1} icone={<KeyRound className="w-5 h-5" />} titulo={ativa ? 'Trocar ou desativar o kit' : 'Gerar o kit do herdeiro'} texto="Precisa da sua chave de contingência (CCP)." to="/cofre/completo#heranca" />
          )}

          <MCard c={c} i={2}>
            <p className="font-semibold">Você é a pessoa de confiança de alguém?</p>
            <p className="text-[12.5px] mt-1 mb-3" style={{ color: c.suave }}>Use o código do kit que você recebeu para abrir o cofre.</p>
            <MBotao variante="secundario" onClick={() => navigate('/heranca')}>Resgatar com o código</MBotao>
          </MCard>
        </div>
      )}
    </MobileShell>
  );
}

// ============================================================
// BLOQUEIO REMOTO (Kill Switch) — direto daqui, com a CCP
// ============================================================
export function MBloqueio() {
  const c = useMCores();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { contaId, conta, carregando, recarregar } = useCofre();
  const [acao, setAcao] = useState<'bloquear' | 'vincular' | null>(null);
  const [ccp, setCcp] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const liberado = !!conta?.recursos?.killSwitch;
  const bloqueado = conta?.status === 'REVOGADA';

  const executar = async () => {
    setErro(null);
    if (!segredoValido(ccp)) return setErro('CCP inválida: são 32 caracteres em 8 blocos (XXXX-XXXX-...).');
    setOcupado(true);
    try {
      if (acao === 'bloquear') {
        await Flows.acionarKillSwitch(contaId, normalizarSegredo(ccp));
        setOk('Dispositivo bloqueado. Ele não consegue mais entrar no cofre.');
      } else {
        await Flows.vincularNovoDispositivo(contaId, normalizarSegredo(ccp));
        setOk('Este aparelho agora é o dispositivo do seu cofre. Tudo restaurado!');
      }
      setAcao(null);
      setCcp('');
      await Promise.all([recarregar(), refreshUser().catch(() => undefined)]);
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Bloqueio Remoto" sub="Proteja seu cofre mesmo à distância. Bloqueie o dispositivo em caso de perda, roubo ou acesso suspeito." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : !liberado && !bloqueado ? (
        <MCard c={c} destaque>
          <p className="font-semibold">O bloqueio remoto (Kill Switch) é do Krypta Pro</p>
          <p className="text-[12.5px] mt-1 mb-3" style={{ color: c.suave }}>Perdeu o aparelho? Com o Pro você bloqueia na hora e recupera o cofre num novo.</p>
          <MBotao onClick={() => navigate('/plans')}>Ver o Krypta Pro</MBotao>
        </MCard>
      ) : (
        <div className="space-y-3">
          {ok && <MAviso tipo="ok">{ok}</MAviso>}
          <p className="font-semibold">Ações de segurança</p>
          <MLinhaAcao c={c} i={0} icone={<Lock className="w-5 h-5" />} titulo="Bloquear dispositivo remotamente" texto={bloqueado ? 'O dispositivo já está bloqueado.' : 'Impede novas entradas pelo dispositivo perdido.'} onClick={bloqueado ? undefined : () => { setErro(null); setAcao('bloquear'); }} perigo />
          <MLinhaAcao c={c} i={1} icone={<LockOpen className="w-5 h-5" />} titulo="Usar este aparelho como dispositivo" texto={bloqueado ? 'Vincula este aparelho e restaura o cofre do backup.' : 'Disponível depois de um bloqueio.'} onClick={bloqueado ? () => { setErro(null); setAcao('vincular'); } : undefined} />
          <MCard c={c} i={2} style={{ background: c.faixa }}>
            <p className="font-semibold text-[14px]">Importante</p>
            <p className="text-[12.5px] mt-1" style={{ color: c.suave }}>O bloqueio exige a sua chave de contingência (CCP). Ela nunca sai deste aparelho: só uma prova dela vai ao servidor.</p>
          </MCard>
        </div>
      )}

      <MFolha aberta={!!acao} onFechar={() => setAcao(null)} titulo={acao === 'bloquear' ? 'Bloquear o dispositivo?' : 'Vincular este aparelho'}>
        <p className="text-[13px] mb-4" style={{ color: c.suave }}>
          {acao === 'bloquear'
            ? 'O dispositivo atual perde o acesso na hora e não volta mais. Depois você vincula um aparelho novo com a mesma CCP.'
            : 'Este aparelho vira o dispositivo do cofre e baixa o backup cifrado.'}
        </p>
        <MCampo c={c} rotulo="Sua chave de contingência (CCP)" value={ccp} onChange={(e) => setCcp(e.target.value)} onBlur={() => ccp && setCcp(normalizarSegredo(ccp))} placeholder="XXXX-XXXX-XXXX-XXXX-..." autoCapitalize="characters" autoComplete="off" spellCheck={false} />
        {erro && <div className="mt-3"><MAviso tipo="erro">{erro}</MAviso></div>}
        <MBotao className="mt-4" variante={acao === 'bloquear' ? 'perigo' : 'primario'} carregando={ocupado} onClick={executar}>
          {acao === 'bloquear' ? 'Bloquear agora' : 'Vincular e restaurar'}
        </MBotao>
        {ocupado && <p className="text-[11px] text-center mt-2" style={{ color: c.suave }}>Conferindo a CCP... pode levar alguns segundos.</p>}
      </MFolha>
    </MobileShell>
  );
}

// ============================================================
// RECURSOS DE EMERGÊNCIA
// ============================================================
export function MEmergencia() {
  const c = useMCores();
  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Recursos de emergência" sub="Ferramentas rápidas e seguras para situações críticas." />
      <p className="text-[12.5px] rounded-xl p-3 mb-4" style={{ background: c.faixa }}>
        Em caso de perda de acesso, suspeita de invasão ou qualquer situação urgente, use as opções abaixo.
      </p>
      <div className="space-y-3">
        <MLinhaAcao c={c} i={0} icone={<KeyRound className="w-5 h-5" />} titulo="Recuperação de acesso" texto="Esqueceu a senha mestre? Recupere o cofre com a sua CCP." to="/cofre/completo" />
        <MLinhaAcao c={c} i={1} icone={<ShieldAlert className="w-5 h-5" />} titulo="Perdi minha CCP" texto="Crie uma CCP nova pelo dispositivo ou abandone o cofre antigo." to="/perdi-ccp" perigo />
        <MLinhaAcao c={c} i={1} icone={<Search className="w-5 h-5" />} titulo="Acesso suspeito" texto="Veja as atividades recentes e onde sua conta está aberta." to="/profile#sessoes" />
        <MLinhaAcao c={c} i={2} icone={<Cpu className="w-5 h-5" />} titulo="Perdi meu dispositivo" texto="Bloqueio remoto e proteção do cofre." to="/bloqueio" perigo />
        <MLinhaAcao c={c} i={3} icone={<HelpCircle className="w-5 h-5" />} titulo="Preciso de ajuda" texto="Fale com a equipe do Krypta." to="/contact" />
      </div>
      <MCard c={c} i={4} className="mt-4" style={{ background: c.faixa }}>
        <p className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" style={{ color: c.roxo }} /> Dica de segurança</p>
        <p className="text-[12.5px] mt-1" style={{ color: c.suave }}>Guarde sua CCP em papel, longe do celular. Viu algo estranho? Use o bloqueio remoto o quanto antes.</p>
      </MCard>
    </MobileShell>
  );
}

// ============================================================
// TELA COMPLETA DO COFRE (a mesma do site, dentro do app)
// ============================================================
export function MCofreCompleto() {
  return (
    <MobileShell voltar="/device">
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-mx-4" style={{ fontFamily: FONTE }}>
          <Device embutido />
        </motion.div>
      </AnimatePresence>
    </MobileShell>
  );
}
