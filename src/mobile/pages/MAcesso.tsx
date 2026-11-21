// src/mobile/pages/MAcesso.tsx
// ============================================================
// ACESSO AO COFRE EM SITUAÇÕES ESPECIAIS (modo Mobile e site)
//
//   /cofre/ver   → VER O COFRE EM OUTRO APARELHO (Krypta Pro, só leitura)
//                  Mesma conta + a CCP: o servidor entrega o backup cifrado e
//                  este aparelho abre. Nada fica salvo aqui. No Free, a tela
//                  explica por que não dá e quais são os caminhos.
//
//   /perdi-ccp   → PERDI MINHA CCP
//                  A) Estou com o dispositivo: ele cria uma CCP nova (+ senha do site).
//                     Nada se perde.
//                  B) Perdi a CCP e o dispositivo: ABANDONAR O COFRE (senha + código
//                     por e-mail). O backup antigo é descartado (ninguém conseguiria
//                     abri-lo) e a conta fica pronta para um cofre novo. Se este
//                     aparelho ainda tiver chaves, elas podem entrar no cofre novo.
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, Copy, Cpu, Crown, Eye, Info, KeyRound, Loader2, Lock, ShieldOff, Timer, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { VaultAPI, handleApiError } from '../../services/api';
import * as Flows from '../../services/vaultFlows';
import { gerarSegredo, normalizarSegredo, segredoValido, type Credencial } from '../../crypto/kryptaCrypto';
import { VirtualDevice } from '../../services/virtualDevice';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useCofre } from '../useCofre';
import { useModo } from '../ModoContext';
import { MAviso, MBotao, MCampo, MCard, MFaixa, MFolha, MTitulo, MobileShell, useMCores, type MCores } from '../ui';
import { DetalheChave, LinhaChave } from './MChaves';

const MINUTOS_ABERTO = 5;

/** Moldura: app (modo Mobile) ou página do site (modo Web) */
function Moldura({ children, voltar }: { children: ReactNode; voltar: string }) {
  const { modo } = useModo();
  const c = useMCores();
  if (modo === 'mobile') return <MobileShell voltar={voltar}>{children}</MobileShell>;
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'rgb(var(--krypta-bg))', color: c.texto }}>
      <Navbar />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-32 pb-16">{children}</main>
      <Footer />
    </div>
  );
}

function CampoCcp({ c, valor, onChange, rotulo = 'Sua chave de contingência (CCP)' }: { c: MCores; valor: string; onChange: (v: string) => void; rotulo?: string }) {
  return (
    <MCampo
      c={c}
      rotulo={rotulo}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => valor && onChange(normalizarSegredo(valor))}
      placeholder="XXXX-XXXX-XXXX-XXXX-..."
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

// ============================================================
// VER O COFRE EM OUTRO APARELHO
// ============================================================
export function MVerCofre() {
  const c = useMCores();
  const navigate = useNavigate();
  const { contaId, conta, carregando, aqui } = useCofre();
  const [ccp, setCcp] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<{ credenciais: Credencial[]; atualizadoEm: string } | null>(null);
  const [restante, setRestante] = useState(MINUTOS_ABERTO * 60);
  const [detalhe, setDetalhe] = useState<Credencial | null>(null);
  const relogio = useRef<number | null>(null);

  const liberado = !!conta?.recursos?.multiAparelho;

  // Fecha sozinho depois de alguns minutos (as senhas saem da memória)
  useEffect(() => {
    if (!aberto) return;
    setRestante(MINUTOS_ABERTO * 60);
    relogio.current = window.setInterval(() => setRestante((s) => s - 1), 1000);
    return () => {
      if (relogio.current) window.clearInterval(relogio.current);
    };
  }, [aberto]);
  useEffect(() => {
    if (aberto && restante <= 0) {
      setAberto(null);
      setDetalhe(null);
    }
  }, [restante, aberto]);

  const abrir = async () => {
    setErro(null);
    if (!segredoValido(ccp)) return setErro('CCP inválida: são 32 caracteres em 8 blocos (XXXX-XXXX-...).');
    setOcupado(true);
    try {
      const r = await Flows.abrirCofreComCcp(contaId, normalizarSegredo(ccp));
      setAberto({ credenciais: r.credenciais, atualizadoEm: r.atualizadoEm });
      setCcp('');
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Moldura voltar="/device">
      <MTitulo c={c} titulo="Ver o cofre neste aparelho" sub="Mesma conta, outro aparelho: abra suas chaves com a sua CCP." />

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : aqui ? (
        <MAviso tipo="info">Este aparelho já é o dispositivo do seu cofre. Suas chaves estão em Cofre Digital.</MAviso>
      ) : conta?.status === 'PENDENTE_PAREAMENTO' ? (
        <MAviso tipo="info">Seu cofre ainda não foi ativado. Pareie um aparelho primeiro.</MAviso>
      ) : !liberado ? (
        /* ---------------- FREE: explicação ---------------- */
        <div className="space-y-3">
          <MCard c={c} destaque>
            <MFaixa c={c} icone={<Crown className="w-5 h-5" />} titulo="Recurso do Krypta Pro" sub="No Free, o cofre fica só no aparelho pareado." />
            <p className="text-[13px] leading-relaxed" style={{ color: c.suave }}>
              A chave do cofre mora no dispositivo onde você pareou (o navegador, o app ou o Krypta físico). Por segurança, no plano
              gratuito ele é o <strong style={{ color: c.texto }}>único</strong> lugar onde as senhas abrem.
            </p>
            <MBotao className="mt-4" onClick={() => navigate('/plans')}>Ver o Krypta Pro</MBotao>
          </MCard>
          <MCard c={c}>
            <p className="font-semibold text-[14px] mb-2 flex items-center gap-2"><Info className="w-4 h-4" style={{ color: c.roxo }} /> No Free, você pode:</p>
            <ul className="text-[12.5px] space-y-2" style={{ color: c.suave }}>
              <li>• Abrir o cofre no aparelho onde ele foi pareado.</li>
              <li>• Ver sua conta, plano, compras e alertas em qualquer aparelho.</li>
              <li>• Perdeu o aparelho pareado e não tem a CCP? Use <strong style={{ color: c.texto }}>Perdi minha CCP → Abandonar o cofre</strong> e comece um cofre novo aqui.</li>
            </ul>
          </MCard>
        </div>
      ) : !aberto ? (
        /* ---------------- PRO: pedir a CCP ---------------- */
        <MCard c={c}>
          <MFaixa c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Abrir com a CCP" sub="Só leitura · fecha sozinho em 5 minutos" />
          <ul className="text-[12.5px] space-y-1.5 mb-4" style={{ color: c.suave }}>
            <li>• A CCP é conferida neste aparelho: só uma prova dela vai ao servidor.</li>
            <li>• O servidor envia o cofre cifrado e é este aparelho que abre.</li>
            <li>• Para criar ou editar chaves, use o aparelho pareado.</li>
            <li>• Você recebe um alerta por e-mail a cada abertura.</li>
          </ul>
          <CampoCcp c={c} valor={ccp} onChange={setCcp} />
          {erro && <div className="mt-3"><MAviso tipo="erro">{erro}</MAviso></div>}
          <MBotao className="mt-4" carregando={ocupado} onClick={abrir}><Eye className="w-4 h-4" /> Abrir meu cofre</MBotao>
          {ocupado && <p className="text-[11px] text-center mt-2" style={{ color: c.suave }}>Conferindo a CCP... pode levar alguns segundos.</p>}
        </MCard>
      ) : (
        /* ---------------- ABERTO (só leitura) ---------------- */
        <div className="space-y-3">
          <MAviso tipo="info">
            <span className="flex items-center gap-2"><Timer className="w-4 h-4" /> Só leitura · fecha em {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}</span>
          </MAviso>
          <MCard c={c}>
            {aberto.credenciais.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: c.suave }}>O cofre está vazio.</p>
            ) : (
              <ul>{aberto.credenciais.map((cred) => <LinhaChave key={cred.id} c={c} cred={cred} onAbrir={() => setDetalhe(cred)} />)}</ul>
            )}
            <p className="text-[11px] mt-3" style={{ color: c.suave }}>Backup de {new Date(aberto.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</p>
          </MCard>
          <MBotao variante="secundario" onClick={() => { setAberto(null); setDetalhe(null); }}><Lock className="w-4 h-4" /> Fechar o cofre agora</MBotao>
        </div>
      )}

      <MFolha aberta={!!detalhe} onFechar={() => setDetalhe(null)} titulo="Detalhes (só leitura)">
        {detalhe && <DetalheChave c={c} cred={detalhe} />}
      </MFolha>
    </Moldura>
  );
}

// ============================================================
// PERDI MINHA CCP
// ============================================================
export function MPerdiCcp() {
  const c = useMCores();
  const navigate = useNavigate();
  const { modo } = useModo();
  const { refreshUser } = useAuth();
  const { contaId, conta, carregando, aqui, ativo, recarregar } = useCofre();
  const [caminho, setCaminho] = useState<'dispositivo' | 'abandonar' | null>(null);

  // A) CCP nova pelo dispositivo
  const [senha, setSenha] = useState('');
  const [ccpNova, setCcpNova] = useState('');
  const [anotei, setAnotei] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // B) Abandonar
  const [entendi, setEntendi] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState<boolean | null>(null);
  const [codigo, setCodigo] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [levarChaves, setLevarChaves] = useState(true);

  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<'ccp' | 'abandonado' | null>(null);

  const chavesNesteAparelho = VirtualDevice.carregar(contaId)?.credenciais.length ?? 0;
  const podeDispositivo = aqui && ativo;
  const semCofre = conta?.status === 'PENDENTE_PAREAMENTO';

  const executar = async (acao: () => Promise<unknown>, depois: () => void) => {
    setErro(null);
    setOcupado(true);
    try {
      await acao();
      depois();
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  const criarCcpNova = () =>
    executar(
      () => Flows.redefinirCcpComDispositivo(contaId, senha, ccpNova),
      () => {
        setFeito('ccp');
        setSenha('');
        recarregar();
      }
    );

  const pedirCodigo = () =>
    executar(
      async () => setCodigoEnviado((await VaultAPI.pedirAbandono(senha)).enviado),
      () => setSenha('')
    );

  const abandonar = () =>
    executar(
      () => Flows.abandonarCofre(contaId, codigo, levarChaves),
      () => {
        setFeito('abandonado');
        recarregar();
        refreshUser().catch(() => undefined);
      }
    );

  const copiarCcp = async () => {
    try {
      await navigator.clipboard.writeText(ccpNova);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão */
    }
  };

  return (
    <Moldura voltar="/emergencia">
      <MTitulo c={c} titulo="Perdi minha CCP" sub="A chave de contingência abre o cofre quando o dispositivo não está à mão. Veja o que dá para fazer." />

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : feito === 'ccp' ? (
        <MCard c={c}>
          <p className="font-semibold flex items-center gap-2" style={{ color: '#22c55e' }}><Check className="w-5 h-5" /> CCP nova criada</p>
          <p className="text-[13px] mt-2" style={{ color: c.suave }}>A CCP antiga não vale mais. Suas chaves continuam todas no cofre. Se a herança estava ativa, o kit do herdeiro continua valendo.</p>
          <MBotao className="mt-4" onClick={() => navigate('/device')}>Voltar ao cofre</MBotao>
        </MCard>
      ) : feito === 'abandonado' ? (
        <MCard c={c}>
          <p className="font-semibold flex items-center gap-2" style={{ color: '#22c55e' }}><Check className="w-5 h-5" /> Cofre antigo abandonado</p>
          <p className="text-[13px] mt-2" style={{ color: c.suave }}>
            Sua conta, plano e compras continuam. Agora crie o cofre novo: você vai gerar uma CCP nova (guarde em papel!).
            {Flows.lerChavesParaImportar().length > 0 && ` As ${Flows.lerChavesParaImportar().length} chave(s) deste aparelho entram no cofre novo.`}
          </p>
          <MBotao className="mt-4" onClick={() => navigate(modo === 'mobile' ? '/cofre/completo' : '/device')}>Criar meu cofre novo</MBotao>
        </MCard>
      ) : semCofre ? (
        <MAviso tipo="info">Sua conta não tem cofre ativo. Pareie um aparelho para criar um cofre novo.</MAviso>
      ) : !caminho ? (
        /* ---------------- ESCOLHA DO CAMINHO ---------------- */
        <div className="space-y-3">
          <MCard c={c} onClick={podeDispositivo ? () => setCaminho('dispositivo') : undefined} style={podeDispositivo ? undefined : { opacity: 0.6 }}>
            <MFaixa c={c} icone={<Cpu className="w-5 h-5" />} titulo="Estou com o dispositivo" sub="Nada se perde" />
            <p className="text-[12.5px]" style={{ color: c.suave }}>
              O dispositivo tem a chave do cofre e cria uma CCP nova. Para isso o Krypta pede também a senha da sua conta.
            </p>
            {!podeDispositivo && <p className="text-[11.5px] mt-2 font-semibold" style={{ color: '#f59e0b' }}>Disponível só no aparelho onde o cofre está pareado.</p>}
          </MCard>

          <MCard c={c} onClick={() => setCaminho('abandonar')} style={{ borderColor: 'rgba(239,68,68,0.5)' }}>
            <MFaixa c={c} icone={<ShieldOff className="w-5 h-5" />} titulo="Perdi a CCP e o dispositivo" sub="Abandonar o cofre e começar um novo" />
            <p className="text-[12.5px]" style={{ color: c.suave }}>
              Sem a CCP e sem o dispositivo, ninguém consegue abrir o cofre antigo, nem o Krypta. Ele é descartado e sua conta fica livre para um cofre novo.
            </p>
          </MCard>

          <MCard c={c} style={{ background: c.faixa }}>
            <p className="text-[12.5px]" style={{ color: c.suave }}>
              <strong style={{ color: c.texto }}>Tem a CCP, mas perdeu o dispositivo?</strong> Aí não precisa disso: use o Bloqueio Remoto (Kill Switch, Pro) e vincule um aparelho novo com a mesma CCP.
            </p>
          </MCard>
        </div>
      ) : caminho === 'dispositivo' ? (
        /* ---------------- A) CCP NOVA PELO DISPOSITIVO ---------------- */
        <MCard c={c}>
          <MFaixa c={c} icone={<Cpu className="w-5 h-5" />} titulo="Criar uma CCP nova" sub="Pelo dispositivo deste aparelho" />
          <div className="space-y-3">
            <MCampo c={c} rotulo="Senha da sua conta" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            {!ccpNova ? (
              <MBotao variante="secundario" onClick={() => setCcpNova(gerarSegredo())}><KeyRound className="w-4 h-4" /> Gerar a CCP nova</MBotao>
            ) : (
              <>
                <div className="rounded-xl p-3 text-center" style={{ background: c.faixa }}>
                  <p className="font-mono font-bold text-[15px] tracking-wide break-all">{ccpNova}</p>
                  <button type="button" onClick={copiarCcp} className="mt-2 text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: copiado ? '#22c55e' : c.roxo }}>
                    {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiado ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
                <label className="flex items-start gap-2 text-[12.5px]">
                  <input type="checkbox" checked={anotei} onChange={(e) => setAnotei(e.target.checked)} className="accent-purple-600 w-4 h-4 mt-0.5" />
                  Anotei a CCP nova em papel e guardei num lugar seguro. Ela aparece só agora.
                </label>
              </>
            )}
            {erro && <MAviso tipo="erro">{erro}</MAviso>}
            <MBotao carregando={ocupado} disabled={!senha || !ccpNova || !anotei} onClick={criarCcpNova}>Salvar a CCP nova</MBotao>
            <button type="button" onClick={() => { setCaminho(null); setErro(null); }} className="w-full text-[13px]" style={{ color: c.suave }}>Voltar</button>
          </div>
        </MCard>
      ) : (
        /* ---------------- B) ABANDONAR O COFRE ---------------- */
        <MCard c={c} style={{ borderColor: 'rgba(239,68,68,0.5)' }}>
          <MFaixa c={c} icone={<AlertTriangle className="w-5 h-5" />} titulo="Abandonar o cofre" sub="Não dá para desfazer" />
          <div className="text-[12.5px] space-y-1.5 mb-4" style={{ color: c.suave }}>
            <p><strong style={{ color: '#f87171' }}>Some:</strong> o backup cifrado do cofre antigo, o kit de herança e o vínculo com o dispositivo perdido (ele não entra mais).</p>
            <p><strong style={{ color: '#22c55e' }}>Fica:</strong> sua conta, plano, compras e histórico. Um Krypta físico comprado pode ser pareado de novo.</p>
            <p>Por segurança, pedimos a senha e um código enviado ao seu e-mail.</p>
          </div>

          {codigoEnviado === null ? (
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-[12.5px]">
                <input type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.target.checked)} className="accent-purple-600 w-4 h-4 mt-0.5" />
                Entendo que as chaves do cofre antigo não poderão ser recuperadas.
              </label>
              <MCampo c={c} rotulo="Senha da sua conta" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              {erro && <MAviso tipo="erro">{erro}</MAviso>}
              <MBotao variante="perigo" carregando={ocupado} disabled={!entendi || !senha} onClick={pedirCodigo}>Enviar código por e-mail</MBotao>
            </div>
          ) : (
            <div className="space-y-3">
              <MAviso tipo="info">
                {codigoEnviado ? 'Enviamos um código de 6 números para o seu e-mail. Ele vale 15 minutos.' : 'E-mail não configurado neste servidor: o código apareceu no terminal do servidor (desenvolvimento).'}
              </MAviso>
              <MCampo c={c} rotulo="Código do e-mail" inputMode="numeric" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
              <MCampo c={c} rotulo='Digite "ABANDONAR" para confirmar' value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoCapitalize="characters" />
              {chavesNesteAparelho > 0 && (
                <label className="flex items-start gap-2 text-[12.5px]">
                  <input type="checkbox" checked={levarChaves} onChange={(e) => setLevarChaves(e.target.checked)} className="accent-purple-600 w-4 h-4 mt-0.5" />
                  Este aparelho ainda guarda {chavesNesteAparelho} chave(s) do cofre antigo. Levar para o cofre novo.
                </label>
              )}
              {erro && <MAviso tipo="erro">{erro}</MAviso>}
              <MBotao variante="perigo" carregando={ocupado} disabled={codigo.length !== 6 || confirmacao.trim().toUpperCase() !== 'ABANDONAR'} onClick={abandonar}>
                <Trash2 className="w-4 h-4" /> Abandonar o cofre
              </MBotao>
            </div>
          )}
          <button type="button" onClick={() => { setCaminho(null); setErro(null); setCodigoEnviado(null); }} className="w-full text-[13px] mt-3" style={{ color: c.suave }}>Voltar</button>
        </MCard>
      )}

      {!carregando && !feito && (
        <p className="text-[11px] mt-5 text-center" style={{ color: c.suave }}>
          Por que não dá para recuperar a CCP? Porque ela nunca sai do seu aparelho: o Krypta guarda só uma prova dela. É isso que impede qualquer pessoa (até o Krypta) de abrir seu cofre.
        </p>
      )}
    </Moldura>
  );
}
