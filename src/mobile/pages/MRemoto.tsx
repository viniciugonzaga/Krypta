// src/mobile/pages/MRemoto.tsx
// ============================================================
// v1.2.0 (modo Mobile e site)
//
//   /cofre/acesso → SENHA DE ACESSO AO COFRE (Krypta Pro)
//                   • criar/trocar (uma vez, com a CCP): PIN de 6 dígitos ou senha
//                   • abrir o cofre em qualquer aparelho logado, com VER e EDITAR
//                   • remover (senha da conta)
//
//   /cofre/pontos → PONTOS DE RESTAURAÇÃO ("salvar o estado do cofre")
//                   criar, restaurar e apagar exigem a CCP. Antes de restaurar,
//                   o estado atual vira um ponto automático (dá para desfazer).
//
//   FaixaRemota   → faixa "Cofre aberto com a senha de acesso · fecha às HH:MM"
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Crown, History, Info, KeyRound, Loader2, Lock, LockOpen, RotateCcw, Save, ShieldAlert, Smartphone, Trash2, Unlock } from 'lucide-react';
import { VaultAPI, handleApiError, type EstadoAcessoRemoto, type PontoRestauracao } from '../../services/api';
import { SessaoCofre, configurarAcesso, removerAcesso, validarSenhaAcesso, criarPonto, restaurarPonto, apagarPonto, type SessaoPublica, type TipoAcesso } from '../../services/cofreRemoto';
import { normalizarSegredo, segredoValido } from '../../crypto/kryptaCrypto';
import { useCofre } from '../useCofre';
import { GRAD, MAviso, MBotao, MCampo, MCard, MFaixa, MFolha, MTitulo, fmtQuando, useMCores, type MCores } from '../ui';
import { Moldura } from '../Moldura';
import { CampoCcp } from './MAcesso';

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ============================================================
// FAIXA: cofre aberto com a senha de acesso
// ============================================================
export function FaixaRemota({ c, sessao }: { c: MCores; sessao: SessaoPublica | null }) {
  if (!sessao) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2 text-[12.5px]" style={{ background: c.faixa, border: `1px solid ${c.borda}` }}>
      <LockOpen className="w-4 h-4 shrink-0" style={{ color: c.roxo }} />
      <span className="flex-1">Aberto com a senha de acesso · fecha às <strong>{hora(sessao.expiraEm)}</strong></span>
      <button type="button" onClick={() => SessaoCofre.fechar()} className="font-semibold flex items-center gap-1" style={{ color: c.roxo }}>
        <Lock className="w-3.5 h-3.5" /> Fechar
      </button>
    </div>
  );
}

/** Campo do PIN (6 números) ou da senha de acesso */
function CampoAcesso({ c, tipo, valor, onChange, rotulo }: { c: MCores; tipo: TipoAcesso; valor: string; onChange: (v: string) => void; rotulo: string }) {
  return tipo === 'PIN' ? (
    <MCampo
      c={c}
      rotulo={rotulo}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="••••••"
      style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: 20 }}
    />
  ) : (
    <MCampo c={c} rotulo={rotulo} type="password" autoComplete="new-password" value={valor} onChange={(e) => onChange(e.target.value)} />
  );
}

// ============================================================
// SENHA DE ACESSO AO COFRE
// ============================================================
export function MAcessoCofre() {
  const c = useMCores();
  const navigate = useNavigate();
  const { contaId, conta, carregando, aqui, ativo, remoto } = useCofre();
  const [estado, setEstado] = useState<EstadoAcessoRemoto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // abrir
  const [pin, setPin] = useState('');
  // configurar
  const [config, setConfig] = useState(false);
  const [tipo, setTipo] = useState<TipoAcesso>('PIN');
  const [novo, setNovo] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ccp, setCcp] = useState('');
  const [naoEhSenhaConta, setNaoEhSenhaConta] = useState(false);
  // remover
  const [remover, setRemover] = useState(false);
  const [senhaConta, setSenhaConta] = useState('');

  const carregarEstado = useCallback(async () => {
    try {
      setEstado(await VaultAPI.remotoEstado());
    } catch (err) {
      setErro(handleApiError(err).message);
    }
  }, []);
  useEffect(() => {
    carregarEstado();
  }, [carregarEstado]);

  const rodar = async (rotulo: string, fn: () => Promise<unknown>, depois?: () => void) => {
    setErro(null);
    setOk(null);
    setOcupado(rotulo);
    try {
      await fn();
      depois?.();
    } catch (err) {
      setErro(handleApiError(err).message);
      carregarEstado();
    } finally {
      setOcupado(null);
    }
  };

  const abrir = () => {
    if (!estado?.salt || !estado.tipo) return;
    const e = validarSenhaAcesso(estado.tipo, pin);
    if (e) return setErro(e);
    rodar('abrir', () => SessaoCofre.abrir(contaId, pin, estado.salt!), () => {
      setPin('');
      navigate('/cofre/chaves');
    });
  };

  const salvarConfig = () => {
    const e = validarSenhaAcesso(tipo, novo);
    if (e) return setErro(e);
    if (novo !== repetir) return setErro('As duas senhas de acesso não são iguais.');
    if (!segredoValido(ccp)) return setErro('CCP inválida: são 32 caracteres em 8 blocos (XXXX-XXXX-...).');
    rodar('config', () => configurarAcesso(contaId, normalizarSegredo(ccp), tipo, novo), () => {
      setOk(`${tipo === 'PIN' ? 'PIN' : 'Senha de acesso'} criado(a). Agora você abre o cofre em qualquer aparelho logado.`);
      setConfig(false);
      setNovo('');
      setRepetir('');
      setCcp('');
      setNaoEhSenhaConta(false);
      carregarEstado();
    });
  };

  const tirar = () =>
    rodar('remover', () => removerAcesso(senhaConta), () => {
      setOk('Senha de acesso removida. Os outros aparelhos não abrem mais o cofre.');
      setRemover(false);
      setSenhaConta('');
      carregarEstado();
    });

  const carregandoTudo = carregando || !estado;

  return (
    <Moldura voltar="/device">
      <MTitulo c={c} titulo="Cofre em qualquer aparelho" sub="Uma senha de acesso só sua abre e edita o cofre em todos os aparelhos logados na sua conta." />

      {carregandoTudo ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : conta?.status === 'PENDENTE_PAREAMENTO' ? (
        <MAviso tipo="info">Seu cofre ainda não foi ativado. Pareie um aparelho primeiro.</MAviso>
      ) : !ativo ? (
        <MAviso tipo="info">O cofre está em {conta?.status}. Resolva isso no dispositivo antes de usar a senha de acesso.</MAviso>
      ) : !estado.disponivel ? (
        /* ---------------- FREE ---------------- */
        <div className="space-y-3">
          <MCard c={c} destaque>
            <MFaixa c={c} icone={<Crown className="w-5 h-5" />} titulo="Recurso do Krypta Pro" sub="No Free, o cofre abre só no aparelho pareado." />
            <p className="text-[13px] leading-relaxed" style={{ color: c.suave }}>
              Com o Pro você cria um <strong style={{ color: c.texto }}>PIN de 6 dígitos</strong> (ou uma senha) e abre o cofre no celular, no
              notebook do trabalho ou no app Windows, com tudo: ver, criar, editar e remover chaves. Sem precisar da CCP no dia a dia.
            </p>
            <MBotao className="mt-4" onClick={() => navigate('/plans')}>Ver o Krypta Pro</MBotao>
          </MCard>
        </div>
      ) : (
        <div className="space-y-3">
          {ok && <MAviso tipo="ok">{ok}</MAviso>}
          {erro && <MAviso tipo="erro">{erro}</MAviso>}

          {/* ---------------- ABERTO NESTE APARELHO ---------------- */}
          {remoto && (
            <MCard c={c} destaque>
              <MFaixa c={c} icone={<LockOpen className="w-5 h-5" />} titulo="Cofre aberto neste aparelho" sub={`Fecha sozinho às ${hora(remoto.expiraEm)}`} />
              <div className="grid grid-cols-2 gap-3">
                <MBotao onClick={() => navigate('/cofre/chaves')}><KeyRound className="w-4 h-4" /> Minhas chaves</MBotao>
                <MBotao variante="secundario" onClick={() => SessaoCofre.fechar()}><Lock className="w-4 h-4" /> Fechar</MBotao>
              </div>
            </MCard>
          )}

          {/* ---------------- ABRIR ---------------- */}
          {!aqui && !remoto && estado.configurado && !estado.bloqueado && (
            <MCard c={c}>
              <MFaixa c={c} icone={<Unlock className="w-5 h-5" />} titulo={estado.tipo === 'PIN' ? 'Digite seu PIN' : 'Digite sua senha de acesso'} sub={`${estado.tentativasRestantes} tentativa(s) antes de bloquear`} />
              <CampoAcesso c={c} tipo={estado.tipo ?? 'PIN'} valor={pin} onChange={setPin} rotulo={estado.tipo === 'PIN' ? 'PIN de 6 dígitos' : 'Senha de acesso'} />
              <MBotao className="mt-4" carregando={ocupado === 'abrir'} disabled={!!ocupado} onClick={abrir}><Unlock className="w-4 h-4" /> Abrir meu cofre</MBotao>
              {ocupado === 'abrir' && <p className="text-[11px] text-center mt-2" style={{ color: c.suave }}>Conferindo... leva alguns segundos de propósito (protege contra força bruta).</p>}
            </MCard>
          )}

          {aqui && (
            <MAviso tipo="info">Este aparelho é o dispositivo pareado: o cofre já abre aqui sem senha de acesso. Use esta tela para criar o PIN que os OUTROS aparelhos vão usar.</MAviso>
          )}

          {estado.bloqueado && (
            <MCard c={c} style={{ borderColor: 'rgba(239,68,68,0.5)' }}>
              <MFaixa c={c} icone={<ShieldAlert className="w-5 h-5" />} titulo="Senha de acesso bloqueada" sub="Erraram 5 vezes seguidas" />
              <p className="text-[12.5px]" style={{ color: c.suave }}>
                Por segurança, ela não abre mais o cofre. Crie uma nova com a sua CCP. Se não foi você, troque também a senha da conta em Configurações.
              </p>
            </MCard>
          )}

          {/* ---------------- ESTADO ---------------- */}
          <MCard c={c}>
            <MFaixa
              c={c}
              icone={<Smartphone className="w-5 h-5" />}
              titulo={estado.configurado ? (estado.tipo === 'PIN' ? 'PIN de 6 dígitos ativo' : 'Senha de acesso ativa') : 'Nenhuma senha de acesso'}
              sub={estado.configurado ? `Criada ${fmtQuando(estado.criadoEm)}${estado.ultimoUso ? ` · último uso ${fmtQuando(estado.ultimoUso)}` : ''}` : 'Crie uma para abrir o cofre fora de casa'}
            />
            {!config ? (
              <div className="grid grid-cols-1 gap-2">
                <MBotao variante={estado.configurado ? 'secundario' : 'primario'} onClick={() => { setConfig(true); setRemover(false); setErro(null); }}>
                  <KeyRound className="w-4 h-4" /> {estado.configurado || estado.bloqueado ? 'Trocar a senha de acesso' : 'Criar a senha de acesso'}
                </MBotao>
                {(estado.configurado || estado.bloqueado) && !remover && (
                  <button type="button" onClick={() => { setRemover(true); setErro(null); }} className="text-[12.5px] font-semibold mt-1" style={{ color: '#f87171' }}>Remover a senha de acesso</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex p-1 rounded-full" style={{ border: `1.5px solid ${c.borda}` }}>
                  {(['PIN', 'SENHA'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => { setTipo(t); setNovo(''); setRepetir(''); }} className="flex-1 h-9 rounded-full text-[13px] font-semibold" style={tipo === t ? { background: GRAD, color: '#fff' } : { color: c.suave }}>
                      {t === 'PIN' ? 'PIN (6 números)' : 'Senha (mais forte)'}
                    </button>
                  ))}
                </div>
                <CampoAcesso c={c} tipo={tipo} valor={novo} onChange={setNovo} rotulo={tipo === 'PIN' ? 'Novo PIN' : 'Nova senha de acesso (8+ caracteres)'} />
                <CampoAcesso c={c} tipo={tipo} valor={repetir} onChange={setRepetir} rotulo="Repita" />
                <CampoCcp c={c} valor={ccp} onChange={setCcp} rotulo="Sua CCP (só para criar ou trocar)" />
                <label className="flex items-start gap-2 text-[12.5px]">
                  <input type="checkbox" checked={naoEhSenhaConta} onChange={(e) => setNaoEhSenhaConta(e.target.checked)} className="accent-purple-600 w-4 h-4 mt-0.5" />
                  Não é a mesma senha da minha conta Krypta (nem de outro site).
                </label>
                <MBotao carregando={ocupado === 'config'} disabled={!!ocupado || !naoEhSenhaConta} onClick={salvarConfig}><Save className="w-4 h-4" /> Salvar</MBotao>
                {ocupado === 'config' && <p className="text-[11px] text-center" style={{ color: c.suave }}>Conferindo a CCP e cifrando a chave do cofre neste aparelho...</p>}
                <button type="button" onClick={() => { setConfig(false); setErro(null); }} className="w-full text-[13px]" style={{ color: c.suave }}>Cancelar</button>
              </div>
            )}
            {remover && !config && (
              <div className="space-y-3 mt-3">
                <MCampo c={c} rotulo="Senha da sua conta" type="password" autoComplete="current-password" value={senhaConta} onChange={(e) => setSenhaConta(e.target.value)} />
                <MBotao variante="perigo" carregando={ocupado === 'remover'} disabled={!senhaConta || !!ocupado} onClick={tirar}><Trash2 className="w-4 h-4" /> Remover</MBotao>
                <button type="button" onClick={() => setRemover(false)} className="w-full text-[13px]" style={{ color: c.suave }}>Cancelar</button>
              </div>
            )}
          </MCard>

          <MCard c={c} style={{ background: c.faixa }}>
            <p className="font-semibold text-[13.5px] mb-2 flex items-center gap-2"><Info className="w-4 h-4" style={{ color: c.roxo }} /> Como fica seguro</p>
            <ul className="text-[12px] space-y-1.5" style={{ color: c.suave }}>
              <li>• O PIN nunca sai deste aparelho: o servidor guarda só uma prova dele e a chave do cofre cifrada.</li>
              <li>• A chave que abre o cofre depende do PIN <strong style={{ color: c.texto }}>e</strong> de um segredo do servidor, liberado só depois do PIN certo.</li>
              <li>• 5 erros seguidos bloqueiam. Desbloquear exige a CCP.</li>
              <li>• Precisa estar logado na conta: PIN sozinho não abre nada.</li>
              <li>• Cada abertura e cada edição aparecem nos alertas e você recebe e-mail.</li>
              <li>• O cofre fecha sozinho em 15 minutos, ao recarregar a página ou ao sair da conta.</li>
              <li>• Por que não usar a senha da conta? Porque o servidor recebe a senha da conta no login: se ela abrisse o cofre, o servidor também conseguiria.</li>
            </ul>
            <button type="button" onClick={() => navigate('/cofre/ver')} className="text-[12px] font-semibold mt-3 underline underline-offset-4" style={{ color: c.roxo }}>
              Sem a senha de acesso? Ver com a CCP (só leitura)
            </button>
          </MCard>
        </div>
      )}
    </Moldura>
  );
}

// ============================================================
// PONTOS DE RESTAURAÇÃO
// ============================================================
export function MPontos() {
  const c = useMCores();
  const navigate = useNavigate();
  const { contaId, conta, carregando, ativo, recarregar } = useCofre();
  const [dados, setDados] = useState<{ pontos: PontoRestauracao[]; limite: number; manuais: number } | null>(null);
  const [ccp, setCcp] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [acao, setAcao] = useState<{ tipo: 'restaurar' | 'apagar'; ponto: PontoRestauracao } | null>(null);

  const carregarPontos = useCallback(async () => {
    try {
      setDados(await VaultAPI.pontos());
    } catch (err) {
      setErro(handleApiError(err).message);
    }
  }, []);
  useEffect(() => {
    carregarPontos();
  }, [carregarPontos]);

  const ccpOk = segredoValido(ccp);

  const rodar = async (rotulo: string, fn: () => Promise<unknown>, msg: string) => {
    setErro(null);
    setOk(null);
    setOcupado(rotulo);
    try {
      await fn();
      setOk(msg);
      setAcao(null);
      await Promise.all([carregarPontos(), recarregar()]);
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(null);
    }
  };

  const salvarPonto = () =>
    rodar('criar', () => criarPonto(contaId, normalizarSegredo(ccp), nome), 'Ponto salvo. É uma cópia cifrada do cofre como ele está agora.').then(() => setNome(''));

  const confirmarAcao = () => {
    if (!acao) return;
    const { tipo, ponto } = acao;
    if (tipo === 'restaurar') {
      rodar('acao', () => restaurarPonto(contaId, ponto.id, normalizarSegredo(ccp)), `Cofre voltou para "${ponto.nome}". O estado anterior virou um ponto automático.`);
    } else {
      rodar('acao', () => apagarPonto(contaId, ponto.id, normalizarSegredo(ccp)), 'Ponto apagado.');
    }
  };

  return (
    <Moldura voltar="/device">
      <MTitulo c={c} titulo="Pontos de restauração" sub="Salve o estado do cofre e volte a ele se algo der errado. Tudo exige a sua CCP." />

      {carregando || !dados ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : conta?.status === 'PENDENTE_PAREAMENTO' ? (
        <MAviso tipo="info">Seu cofre ainda não foi ativado. Pareie um aparelho primeiro.</MAviso>
      ) : (
        <div className="space-y-3">
          {ok && <MAviso tipo="ok">{ok}</MAviso>}
          {erro && <MAviso tipo="erro">{erro}</MAviso>}

          <MCard c={c}>
            <MFaixa c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Sua CCP" sub="Fica só nesta tela; é apagada quando você sai." />
            <CampoCcp c={c} valor={ccp} onChange={setCcp} />
          </MCard>

          {ativo && (
            <MCard c={c}>
              <MFaixa c={c} icone={<Save className="w-5 h-5" />} titulo="Salvar o estado atual" sub={`${dados.manuais} de ${dados.limite} pontos usados${dados.limite < 20 ? ' · Pro: até 20' : ''}`} />
              <MCampo c={c} rotulo="Nome do ponto (opcional)" maxLength={60} placeholder="Ex.: Antes de trocar as senhas do banco" value={nome} onChange={(e) => setNome(e.target.value)} />
              <MBotao className="mt-3" carregando={ocupado === 'criar'} disabled={!ccpOk || !!ocupado || dados.manuais >= dados.limite} onClick={salvarPonto}><Save className="w-4 h-4" /> Salvar ponto</MBotao>
              {dados.manuais >= dados.limite && (
                <p className="text-[11.5px] mt-2" style={{ color: '#f59e0b' }}>
                  Limite do plano atingido. Apague um ponto antigo{dados.limite < 20 && <> ou <button type="button" className="underline" onClick={() => navigate('/plans')}>assine o Pro</button></>}.
                </p>
              )}
            </MCard>
          )}

          <MCard c={c}>
            <p className="font-semibold mb-2 flex items-center gap-2"><History className="w-4 h-4" style={{ color: c.roxo }} /> Pontos salvos</p>
            {dados.pontos.length === 0 ? (
              <p className="text-[13px] py-3 text-center" style={{ color: c.suave }}>Nenhum ponto ainda.</p>
            ) : (
              <ul>
                {dados.pontos.map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${c.faixa}` }}>
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.faixa, color: c.roxo }}>
                      {p.automatico ? <Clock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-[13.5px] truncate">{p.nome}</span>
                      <span className="block text-[11px]" style={{ color: c.suave }}>
                        {fmtQuando(p.criado_em)} · versão {p.versao_origem}{p.automatico ? ' · automático' : ''}
                      </span>
                    </span>
                    {ativo && (
                      <button type="button" onClick={() => { setErro(null); setAcao({ tipo: 'restaurar', ponto: p }); }} className="p-2" aria-label="Restaurar" style={{ color: c.roxo }}>
                        <RotateCcw className="w-[18px] h-[18px]" />
                      </button>
                    )}
                    <button type="button" onClick={() => { setErro(null); setAcao({ tipo: 'apagar', ponto: p }); }} className="p-2" aria-label="Apagar" style={{ color: '#f87171' }}>
                      <Trash2 className="w-[18px] h-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </MCard>

          <MCard c={c} style={{ background: c.faixa }}>
            <p className="font-semibold text-[13.5px] mb-2 flex items-center gap-2"><Info className="w-4 h-4" style={{ color: c.roxo }} /> Como funciona</p>
            <ul className="text-[12px] space-y-1.5" style={{ color: c.suave }}>
              <li>• O ponto é uma cópia <strong style={{ color: c.texto }}>cifrada</strong> do cofre: o servidor guarda, mas não consegue abrir.</li>
              <li>• Restaurar troca as chaves do cofre pelas do ponto. A CCP e o kit do herdeiro atuais continuam valendo.</li>
              <li>• Antes de restaurar, o estado atual vira um ponto automático: dá para desfazer.</li>
              <li>• O dispositivo pareado e os aparelhos com a senha de acesso recebem a versão restaurada.</li>
              <li>• A CCP é exigida para salvar, restaurar e apagar: quem só tem a senha da conta (ou o PIN) não mexe nos pontos.</li>
            </ul>
          </MCard>
        </div>
      )}

      <MFolha aberta={!!acao} onFechar={() => setAcao(null)} titulo={acao?.tipo === 'restaurar' ? 'Restaurar o cofre' : 'Apagar o ponto'}>
        {acao && (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: c.suave }}>
              {acao.tipo === 'restaurar'
                ? <>O cofre volta a ficar como em <strong style={{ color: c.texto }}>"{acao.ponto.nome}"</strong> ({fmtQuando(acao.ponto.criado_em)}). O estado atual será guardado como ponto automático.</>
                : <>Apagar <strong style={{ color: c.texto }}>"{acao.ponto.nome}"</strong>? Não dá para desfazer.</>}
            </p>
            {!ccpOk && <MAviso tipo="info">Digite a sua CCP no topo da tela primeiro.</MAviso>}
            {erro && <MAviso tipo="erro">{erro}</MAviso>}
            <MBotao variante={acao.tipo === 'apagar' ? 'perigo' : 'primario'} carregando={ocupado === 'acao'} disabled={!ccpOk || !!ocupado} onClick={confirmarAcao}>
              {acao.tipo === 'restaurar' ? <><RotateCcw className="w-4 h-4" /> Restaurar</> : <><Trash2 className="w-4 h-4" /> Apagar</>}
            </MBotao>
            {ocupado === 'acao' && <p className="text-[11px] text-center" style={{ color: c.suave }}>Conferindo a CCP...</p>}
          </div>
        )}
      </MFolha>
    </Moldura>
  );
}
