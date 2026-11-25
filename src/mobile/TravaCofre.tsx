// src/mobile/TravaCofre.tsx
// ============================================================
// v1.3.0 — TRAVA DO COFRE NESTE APARELHO (site, app do celular e Windows)
//
//  • DesbloquearCofre → PIN/senha, biometria ou "esqueci o PIN" (chave de contingência)
//  • CriarTrava       → obrigatório antes de usar o cofre num aparelho sem trava
//  • GerenciarTrava   → trocar PIN, ligar/desligar biometria, trancar agora
//  • GuardaTrava      → envolve as telas do cofre e mostra o que faltar
//
// Mesmo no aparelho que pareou, o cofre só abre com o PIN ou a biometria.
// Os dados ficam cifrados no aparelho (ver services/virtualDevice.ts).
// ============================================================
import { useEffect, useState, type ReactNode } from 'react';
import { Fingerprint, KeyRound, Lock, LockOpen, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Trava, type TipoTrava } from '../services/virtualDevice';
import { configurarAcesso, validarSenhaAcesso } from '../services/cofreRemoto';
import { normalizarSegredo, segredoValido } from '../crypto/kryptaCrypto';
import { GRAD, MAviso, MBotao, MCampo, MCard, MFaixa, useMCores, type MCores } from './ui';
import { CampoCcp } from './pages/MAcesso';

export const NOME_SEGREDO = { PIN: 'PIN', SENHA: 'senha' } as const;

/** Atualiza a tela quando a trava abre, fecha (5 min sem uso) ou muda */
export function useTrava(contaId: string) {
  const [, setTique] = useState(0);
  useEffect(() => Trava.assinar(() => setTique((t) => t + 1)), []);
  return { situacao: contaId ? Trava.situacao(contaId) : ('sem-dispositivo' as const), info: Trava.info(contaId) };
}

function SeletorTipo({ c, tipo, onChange }: { c: MCores; tipo: TipoTrava; onChange: (t: TipoTrava) => void }) {
  return (
    <div className="flex p-1 rounded-full" style={{ border: `1.5px solid ${c.borda}` }}>
      {(['PIN', 'SENHA'] as const).map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)} className="flex-1 h-9 rounded-full text-[13px] font-semibold" style={tipo === t ? { background: GRAD, color: '#fff' } : { color: c.suave }}>
          {t === 'PIN' ? 'PIN (6 números)' : 'Senha (mais forte)'}
        </button>
      ))}
    </div>
  );
}

export function CampoSegredoTrava({ c, tipo, valor, onChange, rotulo, autoFocus }: { c: MCores; tipo: TipoTrava; valor: string; onChange: (v: string) => void; rotulo: string; autoFocus?: boolean }) {
  return tipo === 'PIN' ? (
    <MCampo
      c={c}
      rotulo={rotulo}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      maxLength={6}
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="••••••"
      style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: 20 }}
    />
  ) : (
    <MCampo c={c} rotulo={rotulo} type="password" autoComplete="new-password" autoFocus={autoFocus} value={valor} onChange={(e) => onChange(e.target.value)} />
  );
}

// ============================================================
// DESBLOQUEAR
// ============================================================
export function DesbloquearCofre({ contaId, onAberto }: { contaId: string; onAberto?: () => void }) {
  const c = useMCores();
  const { info } = useTrava(contaId);
  const tipo: TipoTrava = info.tipo ?? 'PIN';
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [esqueci, setEsqueci] = useState(false);
  const [ccp, setCcp] = useState('');
  const [novoPin, setNovoPin] = useState<{ tipo: TipoTrava; valor: string; repetir: string } | null>(null);

  const rodar = async (rotulo: string, fn: () => Promise<unknown>) => {
    setErro(null);
    setOcupado(rotulo);
    try {
      await fn();
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const abrirPin = async () => {
    if (await rodar('pin', () => Trava.abrirComPin(contaId, valor))) {
      setValor('');
      onAberto?.();
    }
  };
  const abrirBio = async () => {
    if (await rodar('bio', () => Trava.abrirComBiometria(contaId))) onAberto?.();
  };
  const abrirCcp = async () => {
    if (await rodar('ccp', () => Trava.abrirComCcp(contaId, normalizarSegredo(ccp)))) {
      setCcp('');
      setNovoPin({ tipo, valor: '', repetir: '' });
    }
  };
  const salvarNovo = async () => {
    if (!novoPin) return;
    const e = validarSenhaAcesso(novoPin.tipo, novoPin.valor);
    if (e) return setErro(e);
    if (novoPin.valor !== novoPin.repetir) return setErro('Os dois não são iguais.');
    if (await rodar('novo', () => Trava.trocarPin(contaId, novoPin.tipo, novoPin.valor))) {
      setNovoPin(null);
      setEsqueci(false);
      onAberto?.();
    }
  };

  // Abriu com a chave de contingência: agora cria o PIN novo
  if (novoPin) {
    return (
      <MCard c={c} destaque>
        <MFaixa c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Crie um PIN novo" sub="O cofre abriu com a chave de contingência" />
        <div className="space-y-3">
          <SeletorTipo c={c} tipo={novoPin.tipo} onChange={(t) => setNovoPin({ tipo: t, valor: '', repetir: '' })} />
          <CampoSegredoTrava c={c} tipo={novoPin.tipo} valor={novoPin.valor} onChange={(v) => setNovoPin({ ...novoPin, valor: v })} rotulo={novoPin.tipo === 'PIN' ? 'Novo PIN' : 'Nova senha'} autoFocus />
          <CampoSegredoTrava c={c} tipo={novoPin.tipo} valor={novoPin.repetir} onChange={(v) => setNovoPin({ ...novoPin, repetir: v })} rotulo="Repita" />
          {erro && <MAviso tipo="erro">{erro}</MAviso>}
          <MBotao carregando={ocupado === 'novo'} disabled={!!ocupado} onClick={salvarNovo}>Salvar e abrir</MBotao>
        </div>
      </MCard>
    );
  }

  return (
    <MCard c={c} destaque>
      <MFaixa c={c} icone={<Lock className="w-5 h-5" />} titulo="Cofre trancado" sub={`Digite seu ${NOME_SEGREDO[tipo]} para abrir neste aparelho`} />
      {!esqueci ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            abrirPin();
          }}
        >
          <CampoSegredoTrava c={c} tipo={tipo} valor={valor} onChange={setValor} rotulo={tipo === 'PIN' ? 'PIN do cofre' : 'Senha do cofre'} autoFocus />
          {info.esperaSegundos > 0 && <MAviso tipo="info">Muitas tentativas erradas. Espere {info.esperaSegundos} s.</MAviso>}
          {erro && <MAviso tipo="erro">{erro}</MAviso>}
          <MBotao type="submit" carregando={ocupado === 'pin'} disabled={!!ocupado || !valor}>
            <LockOpen className="w-4 h-4" /> Abrir o cofre
          </MBotao>
          {ocupado === 'pin' && <p className="text-[11px] text-center" style={{ color: c.suave }}>Conferindo... leva alguns segundos de propósito.</p>}
          {info.biometria && (
            <MBotao type="button" variante="secundario" carregando={ocupado === 'bio'} disabled={!!ocupado} onClick={abrirBio}>
              <Fingerprint className="w-4 h-4" /> Usar biometria
            </MBotao>
          )}
          <button type="button" onClick={() => { setEsqueci(true); setErro(null); }} className="w-full text-[12.5px] font-semibold" style={{ color: c.roxo }}>
            Esqueci o {NOME_SEGREDO[tipo]}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-[12.5px]" style={{ color: c.suave }}>
            Use a sua <strong style={{ color: c.texto }}>chave de contingência</strong> (a que você anotou no pareamento). Depois você cria um {NOME_SEGREDO[tipo]} novo.
          </p>
          <CampoCcp c={c} valor={ccp} onChange={setCcp} rotulo="Chave de contingência" />
          {erro && <MAviso tipo="erro">{erro}</MAviso>}
          <MBotao carregando={ocupado === 'ccp'} disabled={!!ocupado || !segredoValido(ccp)} onClick={abrirCcp}>Abrir com a chave de contingência</MBotao>
          <button type="button" onClick={() => { setEsqueci(false); setErro(null); }} className="w-full text-[13px]" style={{ color: c.suave }}>Voltar</button>
        </div>
      )}
    </MCard>
  );
}

// ============================================================
// CRIAR (obrigatório num aparelho sem trava)
// ============================================================
export function CriarTrava({ contaId, ccpInicial, isPro, onPronto }: { contaId: string; ccpInicial?: string; isPro: boolean; onPronto?: () => void }) {
  const c = useMCores();
  const [tipo, setTipo] = useState<TipoTrava>('PIN');
  const [valor, setValor] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ccp, setCcp] = useState(ccpInicial ?? '');
  const [remoto, setRemoto] = useState(isPro);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const salvar = async () => {
    const e = validarSenhaAcesso(tipo, valor);
    if (e) return setErro(e);
    if (valor !== repetir) return setErro('Os dois não são iguais.');
    if (!segredoValido(ccp)) return setErro('Chave de contingência inválida: são 32 caracteres em 8 blocos.');
    setErro(null);
    setOcupado(true);
    try {
      const chave = normalizarSegredo(ccp);
      await Trava.criar(contaId, { tipo, segredo: valor, ccp: chave });
      if (isPro && remoto) {
        try {
          await configurarAcesso(contaId, chave, tipo, valor);
        } catch (err) {
          setAviso(`O cofre deste aparelho já está protegido. A senha para outros aparelhos não foi criada: ${(err as Error).message} Crie depois em "Senha do cofre".`);
        }
      }
      onPronto?.();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MCard c={c} destaque>
      <MFaixa c={c} icone={<ShieldAlert className="w-5 h-5" />} titulo="Proteja o cofre neste aparelho" sub="Obrigatório: sem isso, qualquer pessoa com o aparelho veria suas senhas" />
      <div className="space-y-3">
        <SeletorTipo c={c} tipo={tipo} onChange={(t) => { setTipo(t); setValor(''); setRepetir(''); }} />
        <CampoSegredoTrava c={c} tipo={tipo} valor={valor} onChange={setValor} rotulo={tipo === 'PIN' ? 'Crie um PIN de 6 números' : 'Crie uma senha (8+ caracteres)'} />
        <CampoSegredoTrava c={c} tipo={tipo} valor={repetir} onChange={setRepetir} rotulo="Repita" />
        {!ccpInicial && <CampoCcp c={c} valor={ccp} onChange={setCcp} rotulo="Sua chave de contingência (para recuperar se esquecer)" />}
        {isPro && (
          <label className="flex items-start gap-2 text-[12.5px]">
            <input type="checkbox" checked={remoto} onChange={(e) => setRemoto(e.target.checked)} className="accent-purple-600 w-4 h-4 mt-0.5" />
            Usar o mesmo {NOME_SEGREDO[tipo]} para abrir o cofre nos meus outros aparelhos (Krypta Pro)
          </label>
        )}
        <p className="text-[11.5px]" style={{ color: c.suave }}>
          Não use a senha da sua conta. Depois você pode ligar a biometria (digital, rosto ou Windows Hello).
        </p>
        {erro && <MAviso tipo="erro">{erro}</MAviso>}
        {aviso && <MAviso tipo="info">{aviso}</MAviso>}
        <MBotao carregando={ocupado} disabled={ocupado} onClick={salvar}>
          <ShieldCheck className="w-4 h-4" /> Proteger o cofre
        </MBotao>
        {ocupado && <p className="text-[11px] text-center" style={{ color: c.suave }}>Cifrando o cofre neste aparelho...</p>}
      </div>
    </MCard>
  );
}

// ============================================================
// GERENCIAR
// ============================================================
export function GerenciarTrava({ contaId }: { contaId: string }) {
  const c = useMCores();
  const { user } = useAuth();
  const { situacao, info } = useTrava(contaId);
  const [bioOk, setBioOk] = useState<boolean | null>(null);
  const [trocar, setTrocar] = useState<{ tipo: TipoTrava; valor: string; repetir: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    Trava.biometriaDisponivel().then(setBioOk);
  }, []);

  if (situacao === 'sem-dispositivo') return null;
  if (situacao === 'trancado') return <DesbloquearCofre contaId={contaId} />;
  if (situacao === 'sem-trava') return null;

  const rodar = async (rotulo: string, fn: () => Promise<unknown>, msg: string) => {
    setErro(null);
    setOk(null);
    setOcupado(rotulo);
    try {
      await fn();
      setOk(msg);
      setTrocar(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <MCard c={c}>
      <MFaixa c={c} icone={<ShieldCheck className="w-5 h-5" />} titulo="Trava deste aparelho" sub={`${info.tipo === 'SENHA' ? 'Senha' : 'PIN'}${info.biometria ? ' + biometria' : ''} · tranca sozinha após 5 min sem uso`} />
      {ok && <MAviso tipo="ok">{ok}</MAviso>}
      {erro && <MAviso tipo="erro">{erro}</MAviso>}
      {!trocar ? (
        <div className="grid grid-cols-1 gap-2 mt-2">
          <MBotao variante="secundario" onClick={() => setTrocar({ tipo: info.tipo ?? 'PIN', valor: '', repetir: '' })}>
            <KeyRound className="w-4 h-4" /> Trocar o {info.tipo === 'SENHA' ? 'senha' : 'PIN'}
          </MBotao>
          {info.biometria ? (
            <MBotao variante="secundario" carregando={ocupado === 'bio'} disabled={!!ocupado} onClick={() => rodar('bio', () => Trava.desligarBiometria(contaId), 'Biometria desligada.')}>
              <Fingerprint className="w-4 h-4" /> Desligar biometria
            </MBotao>
          ) : (
            <MBotao
              variante="secundario"
              carregando={ocupado === 'bio'}
              disabled={!!ocupado || bioOk === false}
              onClick={() => rodar('bio', () => Trava.ligarBiometria(contaId, { nome: user?.name ?? 'Krypta', email: user?.email ?? 'krypta' }), 'Biometria ligada! Na próxima vez, toque em "Usar biometria".')}
            >
              <Fingerprint className="w-4 h-4" /> {bioOk === false ? 'Biometria indisponível neste aparelho' : 'Ligar biometria'}
            </MBotao>
          )}
          <MBotao variante="secundario" onClick={() => Trava.fechar(contaId)}>
            <Lock className="w-4 h-4" /> Trancar agora
          </MBotao>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          <SeletorTipo c={c} tipo={trocar.tipo} onChange={(t) => setTrocar({ tipo: t, valor: '', repetir: '' })} />
          <CampoSegredoTrava c={c} tipo={trocar.tipo} valor={trocar.valor} onChange={(v) => setTrocar({ ...trocar, valor: v })} rotulo="Novo" autoFocus />
          <CampoSegredoTrava c={c} tipo={trocar.tipo} valor={trocar.repetir} onChange={(v) => setTrocar({ ...trocar, repetir: v })} rotulo="Repita" />
          <MBotao
            carregando={ocupado === 'pin'}
            disabled={!!ocupado}
            onClick={() => {
              const e = validarSenhaAcesso(trocar.tipo, trocar.valor);
              if (e) return setErro(e);
              if (trocar.valor !== trocar.repetir) return setErro('Os dois não são iguais.');
              rodar('pin', () => Trava.trocarPin(contaId, trocar.tipo, trocar.valor), 'Pronto! Use o novo para abrir o cofre neste aparelho.');
            }}
          >
            Salvar
          </MBotao>
          <button type="button" onClick={() => setTrocar(null)} className="w-full text-[13px]" style={{ color: c.suave }}>Cancelar</button>
        </div>
      )}
      <p className="text-[11px] mt-3" style={{ color: c.suave }}>
        A biometria usa o Windows Hello, a digital ou o rosto do aparelho. Ela nunca sai do aparelho: o Krypta só recebe uma chave que abre a trava.
      </p>
    </MCard>
  );
}

// ============================================================
// GUARDA: o que a tela do cofre precisa antes de mostrar as chaves
// ============================================================
export function GuardaTrava({ contaId, aqui, ativo, isPro, children }: { contaId: string; aqui: boolean; ativo: boolean; isPro: boolean; children: ReactNode }) {
  const { situacao } = useTrava(contaId);
  if (aqui && ativo && situacao === 'trancado') return <DesbloquearCofre contaId={contaId} />;
  if (aqui && ativo && situacao === 'sem-trava') return <CriarTrava contaId={contaId} isPro={isPro} />;
  return <>{children}</>;
}
