// src/mobile/pages/MChaves.tsx
// ============================================================
// MODO MOBILE — chaves do cofre
//   LinhaChave      → linha da lista (ícone da marca, nome, resumo, olho, copiar)
//   MChaves         → "/cofre/chaves"        todas as chaves + detalhes de cada uma
//   MNovaChave      → "/cofre/nova-chave"    criar (botão "+") ou editar (?id=)
//
// Cada chave tem um TIPO (Login, Cartão, Endereço, Wi-Fi, Documento, Nota,
// Personalizado) com os campos iniciais dele, e a pessoa pode adicionar ou
// remover quantos campos quiser. O ícone é reconhecido pelo nome (logo da
// marca) ou escolhido à mão. Tudo é cifrado junto no cofre.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Eye, EyeOff, Lightbulb, Loader2, Lock, Pencil, Plus, Search, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { handleApiError } from '../../services/api';
import type { CampoCredencial, Credencial } from '../../crypto/kryptaCrypto';
import { gerarSenhaForte, useCofre } from '../useCofre';
import { TIPOS, camposDoTipo, camposParaMostrar, novoCampo, resumo, tipoDe, type TipoCredencial } from '../credenciais';
import { IconeServico, PADRAO, normalizar, resolverIcone, useMarcas, type IconePadrao } from '../icones';
import { GRAD, MAviso, MBotao, MCampo, MCard, MFaixa, MFolha, MTitulo, MobileShell, useMCores, type MCores } from '../ui';
import { CofreNaoPronto } from './CofreNaoPronto';

export const CATEGORIAS = ['Pessoal', 'Bancos', 'Redes sociais', 'Trabalho', 'Estudos', 'Compras', 'Jogos', 'Casa', 'Saúde', 'Outros'];

// ============================================================
// COPIAR / MOSTRAR
// ============================================================
function useCopiar() {
  const [copiado, setCopiado] = useState<string | null>(null);
  const copiar = async (id: string, valor: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1400);
    } catch {
      /* sem permissão */
    }
  };
  return { copiado, copiar };
}

/** Linha da lista de chaves */
export function LinhaChave({ c, cred, onAbrir }: { c: MCores; cred: Credencial; onAbrir?: () => void }) {
  const [ver, setVer] = useState(false);
  const { copiado, copiar } = useCopiar();
  // Valor principal: senha (login) ou o primeiro campo secreto
  const principal = cred.senha || (cred.campos ?? []).find((f) => f.secreto && f.valor)?.valor || '';

  return (
    <li className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${c.faixa}` }}>
      <button type="button" onClick={onAbrir} className="flex items-center gap-3 flex-1 min-w-0 text-left" disabled={!onAbrir}>
        <IconeServico nome={cred.servico} icone={cred.icone} tipo={cred.tipo} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[14px] truncate">{cred.servico}</span>
          <span className="block text-[12px] truncate" style={{ color: c.suave }}>
            {ver && principal ? <span className="font-mono">{principal}</span> : resumo(cred)}
          </span>
        </span>
      </button>
      {principal && (
        <>
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder' : 'Mostrar'} className="p-2" style={{ color: c.roxo }}>
            {ver ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
          <button type="button" onClick={() => copiar('p', principal)} aria-label="Copiar" className="p-2" style={{ color: copiado ? '#22c55e' : c.roxo }}>
            {copiado ? <Check className="w-[18px] h-[18px]" /> : <Copy className="w-[18px] h-[18px]" />}
          </button>
        </>
      )}
    </li>
  );
}

/** Todos os campos de uma chave (detalhe) */
export function DetalheChave({ c, cred }: { c: MCores; cred: Credencial }) {
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>({});
  const { copiado, copiar } = useCopiar();
  const campos = camposParaMostrar(cred);
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <IconeServico nome={cred.servico} icone={cred.icone} tipo={cred.tipo} tamanho={48} />
        <div className="min-w-0">
          <p className="font-semibold text-[17px] truncate">{cred.servico}</p>
          <p className="text-[12px]" style={{ color: c.suave }}>
            {TIPOS[tipoDe(cred)].rotulo}
            {cred.categoria ? ` · ${cred.categoria}` : ''}
          </p>
        </div>
      </div>
      {campos.length === 0 ? (
        <p className="text-[13px]" style={{ color: c.suave }}>Nenhum campo preenchido.</p>
      ) : (
        <ul className="space-y-2">
          {campos.map((f) => {
            const mostrar = !f.secreto || visiveis[f.id];
            return (
              <li key={f.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: c.faixa }}>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px]" style={{ color: c.suave }}>{f.rotulo}</span>
                  <span className={`block text-[14px] break-all ${f.secreto ? 'font-mono' : ''}`}>{mostrar ? f.valor : '••••••••••'}</span>
                </span>
                {f.secreto && (
                  <button type="button" onClick={() => setVisiveis((v) => ({ ...v, [f.id]: !v[f.id] }))} aria-label="Mostrar" className="p-1.5" style={{ color: c.roxo }}>
                    {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
                <button type="button" onClick={() => copiar(f.id, f.valor)} aria-label={`Copiar ${f.rotulo}`} className="p-1.5" style={{ color: copiado === f.id ? '#22c55e' : c.roxo }}>
                  {copiado === f.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// TODAS AS CHAVES
// ============================================================
export function MChaves() {
  const c = useMCores();
  const navigate = useNavigate();
  const { dispositivo, pronto, carregando, conta, aqui, salvar } = useCofre();
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<Credencial | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const lista = useMemo(() => {
    const t = normalizar(busca);
    const todas = [...(dispositivo?.credenciais ?? [])].sort((a, b) => a.servico.localeCompare(b.servico));
    if (!t) return todas;
    return todas.filter((x) =>
      normalizar([x.servico, x.usuario, x.categoria ?? '', TIPOS[tipoDe(x)].rotulo, ...(x.campos ?? []).filter((f) => !f.secreto).map((f) => f.valor)].join(' ')).includes(t)
    );
  }, [dispositivo, busca]);

  const excluir = async () => {
    if (!aberta || !dispositivo) return;
    setOcupado(true);
    setErro(null);
    try {
      await salvar(dispositivo.credenciais.filter((x) => x.id !== aberta.id));
      setAberta(null);
      setConfirmarExclusao(false);
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Minhas chaves" sub="Toque numa chave para ver todos os campos." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : !pronto ? (
        <CofreNaoPronto c={c} estado={conta?.status} aqui={aqui} />
      ) : (
        <>
          <label className="relative block mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.suave }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, tipo ou categoria" className="w-full h-11 pl-9 pr-3 rounded-xl text-[14px] outline-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }} />
          </label>
          <MCard c={c} className="mb-4">
            {lista.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: c.suave }}>{busca ? 'Nada encontrado.' : 'Nenhuma chave ainda.'}</p>
            ) : (
              <ul>
                {lista.map((cred) => (
                  <LinhaChave key={cred.id} c={c} cred={cred} onAbrir={() => { setErro(null); setConfirmarExclusao(false); setAberta(cred); }} />
                ))}
              </ul>
            )}
          </MCard>
          <MBotao onClick={() => navigate('/cofre/nova-chave')}><Plus className="w-5 h-5" /> Criar nova chave</MBotao>
        </>
      )}

      <MFolha aberta={!!aberta} onFechar={() => setAberta(null)} titulo="Detalhes da chave">
        {aberta && (
          <>
            <DetalheChave c={c} cred={aberta} />
            {erro && <div className="mt-3"><MAviso tipo="erro">{erro}</MAviso></div>}
            {!confirmarExclusao ? (
              <div className="grid grid-cols-2 gap-3 mt-5">
                <MBotao variante="secundario" onClick={() => navigate(`/cofre/nova-chave?id=${aberta.id}`)}><Pencil className="w-4 h-4" /> Editar</MBotao>
                <MBotao variante="perigo" onClick={() => setConfirmarExclusao(true)}><Trash2 className="w-4 h-4" /> Excluir</MBotao>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-[13px] mb-3" style={{ color: c.suave }}>Excluir <strong style={{ color: c.texto }}>{aberta.servico}</strong> do cofre e do backup? Não dá para desfazer.</p>
                <MBotao variante="perigo" carregando={ocupado} onClick={excluir}>Sim, excluir</MBotao>
              </div>
            )}
          </>
        )}
      </MFolha>
    </MobileShell>
  );
}

// ============================================================
// ESCOLHER ÍCONE
// ============================================================
function EscolherIcone({ c, aberta, onFechar, nome, tipo, valor, onEscolher }: {
  c: MCores;
  aberta: boolean;
  onFechar: () => void;
  nome: string;
  tipo: string;
  valor?: string;
  onEscolher: (v: string | undefined) => void;
}) {
  const marcas = useMarcas();
  const [aba, setAba] = useState<'marcas' | 'padrao'>('marcas');
  const [busca, setBusca] = useState('');
  useEffect(() => {
    if (aberta) setBusca(nome);
  }, [aberta, nome]);

  const filtradas = useMemo(() => {
    const t = normalizar(busca).replace(/ /g, '');
    const lista = t ? marcas.filter((m) => normalizar(m.t).replace(/ /g, '').includes(t) || m.s.includes(t)) : marcas;
    return lista.slice(0, 60);
  }, [marcas, busca]);

  const escolher = (v: string | undefined) => {
    onEscolher(v);
    onFechar();
  };
  const auto = resolverIcone(nome, undefined, marcas, tipo);

  return (
    <MFolha aberta={aberta} onFechar={onFechar} titulo="Ícone da chave">
      <button type="button" onClick={() => escolher(undefined)} className="w-full flex items-center gap-3 p-3 rounded-xl mb-3" style={{ border: `1.5px solid ${!valor ? c.roxo : c.borda}` }}>
        <IconeServico nome={nome} tipo={tipo} resolvido={auto} />
        <span className="flex-1 text-left">
          <span className="block font-semibold text-[14px] flex items-center gap-1.5"><Sparkles className="w-4 h-4" style={{ color: c.roxo }} /> Automático</span>
          <span className="block text-[11.5px]" style={{ color: c.suave }}>O Krypta reconhece pelo nome da chave.</span>
        </span>
        {!valor && <Check className="w-5 h-5" style={{ color: c.roxo }} />}
      </button>

      <div className="flex p-1 rounded-full mb-3" style={{ border: `1.5px solid ${c.borda}` }}>
        {(['marcas', 'padrao'] as const).map((a) => (
          <button key={a} type="button" onClick={() => setAba(a)} className="flex-1 h-9 rounded-full text-[13px] font-semibold" style={aba === a ? { background: GRAD, color: '#fff' } : { color: c.suave }}>
            {a === 'marcas' ? `Marcas (${marcas.length})` : 'Ícones do Krypta'}
          </button>
        ))}
      </div>

      {aba === 'marcas' ? (
        <>
          <label className="relative block mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.suave }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar marca (Netflix, Epic Games...)" className="w-full h-11 pl-9 pr-3 rounded-xl text-[14px] outline-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }} />
          </label>
          {marcas.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: c.suave }}>A biblioteca de marcas ainda não foi gerada neste projeto (rode "npm install"). Use os ícones do Krypta.</p>
          ) : filtradas.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: c.suave }}>Nenhuma marca com esse nome. Veja os ícones do Krypta.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filtradas.map((m) => (
                <button key={m.s} type="button" onClick={() => escolher(`marca:${m.s}`)} className="flex flex-col items-center gap-1 p-1.5 rounded-xl" style={valor === `marca:${m.s}` ? { background: c.faixa } : undefined}>
                  <IconeServico nome={m.t} resolvido={{ tipo: 'marca', marca: m }} tamanho={42} />
                  <span className="text-[10px] text-center leading-tight line-clamp-2">{m.t}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(PADRAO) as IconePadrao[]).map((k) => (
            <button key={k} type="button" onClick={() => escolher(`padrao:${k}`)} className="flex flex-col items-center gap-1 p-1.5 rounded-xl" style={valor === `padrao:${k}` ? { background: c.faixa } : undefined}>
              <IconeServico nome="" resolvido={{ tipo: 'padrao', chave: k }} tamanho={42} />
              <span className="text-[10px] text-center leading-tight">{PADRAO[k].rotulo}</span>
            </button>
          ))}
        </div>
      )}
    </MFolha>
  );
}

// ============================================================
// CRIAR / EDITAR CHAVE
// ============================================================
export function MNovaChave() {
  const c = useMCores();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const idEdicao = params.get('id');
  const { dispositivo, pronto, carregando, conta, aqui, salvar } = useCofre();

  const [tipo, setTipo] = useState<TipoCredencial>('login');
  const [f, setF] = useState({ servico: '', usuario: '', senha: '', categoria: '', nota: '' });
  const [icone, setIcone] = useState<string | undefined>(undefined);
  const [campos, setCampos] = useState<CampoCredencial[]>([]);
  const [verSenha, setVerSenha] = useState(false);
  const [folhaIcone, setFolhaIcone] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregouEdicao, setCarregouEdicao] = useState(false);

  // Editando: carrega a chave existente
  const existente = idEdicao ? dispositivo?.credenciais.find((x) => x.id === idEdicao) ?? null : null;
  useEffect(() => {
    if (!existente || carregouEdicao) return;
    setTipo(tipoDe(existente));
    setF({ servico: existente.servico, usuario: existente.usuario, senha: existente.senha, categoria: existente.categoria ?? '', nota: existente.nota ?? '' });
    setIcone(existente.icone);
    setCampos(existente.campos ?? []);
    setCarregouEdicao(true);
  }, [existente, carregouEdicao]);

  const trocarTipo = (t: TipoCredencial) => {
    setTipo(t);
    // Só troca os campos se a pessoa ainda não preencheu nenhum
    if (campos.every((x) => !x.valor)) setCampos(camposDoTipo(t));
  };

  const mudarCampo = (id: string, patch: Partial<CampoCredencial>) => setCampos((lista) => lista.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const salvarChave = async () => {
    setErro(null);
    if (!f.servico.trim()) return setErro('Dê um nome para a chave (ex.: Netflix, Cartão Nubank, Casa).');
    if (tipo === 'login' && !f.senha) return setErro('Digite a senha ou toque em "Gerar senha forte".');
    const camposValidos = campos.filter((x) => x.rotulo.trim() || x.valor);
    if (tipo !== 'login' && !camposValidos.some((x) => x.valor)) return setErro('Preencha pelo menos um campo.');
    if (!dispositivo) return;
    setOcupado(true);
    try {
      const dados: Credencial = {
        id: existente?.id ?? crypto.randomUUID(),
        criadaEm: existente?.criadaEm ?? new Date().toISOString(),
        servico: f.servico.trim(),
        usuario: tipo === 'login' ? f.usuario.trim() : '',
        senha: tipo === 'login' ? f.senha : '',
        tipo,
        icone,
        categoria: f.categoria || undefined,
        nota: f.nota.trim() || undefined,
        campos: camposValidos.map((x) => ({ ...x, rotulo: x.rotulo.trim() || 'Campo' })),
      };
      const lista = existente ? dispositivo.credenciais.map((x) => (x.id === existente.id ? dados : x)) : [...dispositivo.credenciais, dados];
      await salvar(lista);
      navigate('/cofre/chaves', { replace: true });
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MobileShell voltar={true}>
      <MTitulo c={c} titulo={existente ? 'Editar chave' : 'Criar nova chave'} sub="Tudo o que você digitar aqui é cifrado no seu aparelho." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : !pronto ? (
        <CofreNaoPronto c={c} estado={conta?.status} aqui={aqui} />
      ) : (
        <div className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {(Object.keys(TIPOS) as TipoCredencial[]).map((t) => (
              <button key={t} type="button" onClick={() => trocarTipo(t)} className="shrink-0 px-3.5 h-9 rounded-full text-[13px] font-semibold" style={tipo === t ? { background: GRAD, color: '#fff' } : { border: `1.5px solid ${c.borda}`, color: c.texto }}>
                {TIPOS[t].rotulo}
              </button>
            ))}
          </div>

          <MCard c={c}>
            <MFaixa c={c} icone={<Lock className="w-5 h-5" />} titulo={TIPOS[tipo].rotulo} sub={TIPOS[tipo].desc} />

            {/* Nome + ícone */}
            <div className="flex items-end gap-3">
              <button type="button" onClick={() => setFolhaIcone(true)} className="relative shrink-0" aria-label="Escolher ícone">
                <IconeServico nome={f.servico} icone={icone} tipo={tipo} tamanho={48} />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: GRAD }}><Pencil className="w-3 h-3" /></span>
              </button>
              <div className="flex-1">
                <MCampo c={c} rotulo="Nome da chave *" placeholder={tipo === 'cartao' ? 'Ex.: Cartão Nubank' : tipo === 'endereco' ? 'Ex.: Casa, Trabalho' : 'Ex.: Netflix, Epic Games'} value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} />
              </div>
            </div>
            <p className="text-[11px] mt-1.5 mb-3" style={{ color: c.suave }}>O ícone aparece sozinho pelo nome. Toque nele para escolher outro.</p>

            <div className="space-y-3.5">
              {tipo === 'login' && (
                <>
                  <MCampo c={c} rotulo="E-mail, telefone ou usuário" placeholder="Ex.: user@gmail.com" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} autoComplete="off" />
                  <div>
                    <MCampo
                      c={c}
                      rotulo="Senha *"
                      type={verSenha ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={f.senha}
                      onChange={(e) => setF({ ...f, senha: e.target.value })}
                      direita={
                        <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Esconder' : 'Mostrar'} className="p-1" style={{ color: c.suave }}>
                          {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <button type="button" onClick={() => { setF({ ...f, senha: gerarSenhaForte() }); setVerSenha(true); }} className="mt-2 text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: c.roxo }}>
                      <Wand2 className="w-4 h-4" /> Gerar senha forte
                    </button>
                  </div>
                </>
              )}

              {/* Campos (do tipo + os que a pessoa adicionar) */}
              <AnimatePresence initial={false}>
                {campos.map((campo) => (
                  <motion.div key={campo.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-xl p-3" style={{ border: `1px dashed ${c.borda}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input value={campo.rotulo} onChange={(e) => mudarCampo(campo.id, { rotulo: e.target.value })} placeholder="Nome do campo" className="flex-1 min-w-0 bg-transparent text-[13px] font-medium outline-none" style={{ color: c.texto }} />
                      <button type="button" onClick={() => mudarCampo(campo.id, { secreto: !campo.secreto })} className="text-[10.5px] px-2 py-0.5 rounded-full flex items-center gap-1" style={campo.secreto ? { background: c.faixa, color: c.roxo } : { border: `1px solid ${c.borda}`, color: c.suave }} aria-pressed={!!campo.secreto}>
                        <EyeOff className="w-3 h-3" /> secreto
                      </button>
                      <button type="button" onClick={() => setCampos((l) => l.filter((x) => x.id !== campo.id))} aria-label="Remover campo" className="p-1" style={{ color: '#f87171' }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {tipo === 'nota' ? (
                      <textarea value={campo.valor} onChange={(e) => mudarCampo(campo.id, { valor: e.target.value })} rows={4} className="w-full rounded-lg p-2.5 text-[14px] outline-none resize-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }} />
                    ) : (
                      <input type={campo.secreto ? 'password' : 'text'} value={campo.valor} onChange={(e) => mudarCampo(campo.id, { valor: e.target.value })} autoComplete="off" className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <button type="button" onClick={() => setCampos((l) => [...l, novoCampo(`Campo ${l.length + 1}`)])} className="w-full h-11 rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2" style={{ border: `1.5px dashed ${c.roxo}`, color: c.roxo }}>
                <Plus className="w-4 h-4" /> Adicionar campo
              </button>

              <label className="block">
                <span className="block text-[13px] font-medium mb-1">Categoria</span>
                <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className="w-full h-11 px-3 rounded-lg text-[14px] outline-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }}>
                  <option value="">Sem categoria</option>
                  {CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </label>
              {tipo !== 'nota' && <MCampo c={c} rotulo="Informação adicional (opcional)" placeholder="Ex.: pergunta de segurança, observação" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} autoComplete="off" />}
            </div>

            <p className="text-[12px] mt-4 rounded-lg p-2.5 flex items-center gap-2" style={{ background: c.faixa }}>
              <Lightbulb className="w-4 h-4 shrink-0" style={{ color: c.roxo }} /> Marque como "secreto" os campos que não devem aparecer na tela.
            </p>
            {erro && <div className="mt-3"><MAviso tipo="erro">{erro}</MAviso></div>}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <MBotao variante="secundario" onClick={() => navigate(-1)}>Cancelar</MBotao>
              <MBotao carregando={ocupado} onClick={salvarChave}>{existente ? 'Salvar' : 'Salvar chave'}</MBotao>
            </div>
          </MCard>
        </div>
      )}
      <EscolherIcone c={c} aberta={folhaIcone} onFechar={() => setFolhaIcone(false)} nome={f.servico} tipo={tipo} valor={icone} onEscolher={setIcone} />
    </MobileShell>
  );
}
