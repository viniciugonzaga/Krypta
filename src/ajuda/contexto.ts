// src/ajuda/contexto.ts
// ============================================================
// CODY — o que o assistente sabe sobre QUEM está perguntando
//
// Junta o que o app já sabe (nada é enviado para fora do Krypta):
//   • conta: nome, plano (Free/Pro), status do cofre, herança, recursos
//   • este aparelho: tem o dispositivo? trava ligada? biometria?
//   • outros aparelhos: senha de acesso criada? (Pro)
//   • compras: dispositivo físico comprado / em transporte
//   • questionário de boas-vindas: para que a pessoa quer o Krypta
//   • onde ela está: página atual e modo (site, celular, app Windows)
// ============================================================
import { VaultAPI, DevicesAPI, OnboardingAPI, type ContaCofre, type DispositivoComprado, type RespostasOnboarding } from '../services/api';
import { Trava, VirtualDevice, type SituacaoTrava } from '../services/virtualDevice';
import { isProPlan } from '../utils/plan';
import { IS_DESKTOP } from '../config/desktop';

export type Situacao =
  | 'visitante'
  | 'sem-cofre' // conta criada, cofre ainda não pareado
  | 'sem-trava' // cofre pareado aqui, falta criar o PIN
  | 'trancado' // cofre aqui, trancado
  | 'pronto' // cofre aqui e aberto
  | 'outro-aparelho' // cofre ativo, mas o dispositivo está em outro aparelho
  | 'bloqueado' // Kill Switch
  | 'recuperacao';

export interface PerfilAjuda {
  logado: boolean;
  nome: string | null;
  pro: boolean;
  situacao: Situacao;
  estadoCofre: ContaCofre['status'] | null;
  trava: SituacaoTrava | null;
  biometria: boolean;
  totalChaves: number | null;
  heranca: boolean;
  acessoRemoto: boolean | null; // null = desconhecido (v1.5.0: todos os planos têm)
  dispositivoFisico: 'nenhum' | 'em-transporte' | 'disponivel' | 'pareado';
  hardwareReal: boolean;
  onboarding: RespostasOnboarding | null;
  pagina: string;
  plataforma: 'site' | 'celular' | 'windows';
}

export const PERFIL_VAZIO: PerfilAjuda = {
  logado: false,
  nome: null,
  pro: false,
  situacao: 'visitante',
  estadoCofre: null,
  trava: null,
  biometria: false,
  totalChaves: null,
  heranca: false,
  acessoRemoto: null,
  dispositivoFisico: 'nenhum',
  hardwareReal: false,
  onboarding: null,
  pagina: '/',
  plataforma: 'site',
};

export async function montarPerfil(params: {
  user: { id: string; name: string; plan?: string | null } | null;
  pagina: string;
  mobile: boolean;
}): Promise<PerfilAjuda> {
  const plataforma: PerfilAjuda['plataforma'] = IS_DESKTOP ? 'windows' : params.mobile ? 'celular' : 'site';
  if (!params.user) return { ...PERFIL_VAZIO, pagina: params.pagina, plataforma };

  const contaId = params.user.id;
  const pro = isProPlan(params.user.plan);
  const [conta, compras, onb] = await Promise.all([
    VaultAPI.account().catch(() => null),
    DevicesAPI.list().catch(() => [] as DispositivoComprado[]),
    OnboardingAPI.obter().catch(() => null),
  ]);
  const remoto = conta?.status === 'ATIVA' ? await VaultAPI.remotoEstado().catch(() => null) : null;

  const d = VirtualDevice.carregar(contaId);
  const aqui = !!d && !!conta && d.publicKey === conta.public_key;
  const trava = Trava.situacao(contaId);
  const estado = conta?.status ?? null;

  let situacao: Situacao = 'sem-cofre';
  if (estado === 'REVOGADA') situacao = 'bloqueado';
  else if (estado === 'RECUPERACAO_LOCAL' || estado === 'RECUPERACAO_HARDWARE') situacao = 'recuperacao';
  else if (estado === 'ATIVA') {
    if (!aqui) situacao = 'outro-aparelho';
    else if (trava === 'sem-trava') situacao = 'sem-trava';
    else if (trava === 'trancado') situacao = 'trancado';
    else situacao = 'pronto';
  }

  const fisico: PerfilAjuda['dispositivoFisico'] = compras.some((x) => x.emUsoNoCofre)
    ? 'pareado'
    : compras.some((x) => x.status === 'DISPONIVEL')
      ? 'disponivel'
      : compras.some((x) => x.status === 'EM_TRANSPORTE')
        ? 'em-transporte'
        : 'nenhum';

  return {
    logado: true,
    nome: params.user.name?.split(' ')[0] ?? null,
    pro: pro || conta?.plano === 'pro',
    situacao,
    estadoCofre: estado,
    trava: aqui ? trava : null,
    biometria: aqui ? Trava.info(contaId).biometria : false,
    totalChaves: aqui && d && !d.bloqueado ? d.credenciais.length : null,
    heranca: !!conta?.heranca_ativa,
    acessoRemoto: remoto ? remoto.configurado : null,
    dispositivoFisico: fisico,
    hardwareReal: compras.some((x) => x.emUsoNoCofre && x.hardwareReal),
    onboarding: onb?.respostas ?? null,
    pagina: params.pagina,
    plataforma,
  };
}
