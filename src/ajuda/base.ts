// src/ajuda/base.ts
// ============================================================
// CODY — o que ele sabe responder
//
// Cada assunto tem termos (com peso) e uma resposta que muda conforme
// QUEM pergunta (plano, cofre, trava, aparelho, herança, compras,
// questionário, página) e conforme a conversa (repetiu? está irritado?).
// Respostas podem ter vários balões, botões que levam à tela certa e
// OPÇÕES: o Cody faz uma pergunta e entende a resposta seguinte
// ("sim", "não", "o celular", "a chave"...).
// ============================================================
import type { PerfilAjuda } from './contexto';
import type { Assunto, Ctx, Opcao, Resposta } from './tipos';

// ------------------------------------------------------------
// ajudantes
// ------------------------------------------------------------
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Vinícius, frase" ou "Frase" */
export const com = (ctx: Ctx, frase: string) => (ctx.nome ? `${ctx.nome}, ${frase}` : maiuscula(frase));
const pronto = (p: PerfilAjuda) => p.situacao === 'pronto';
/** v1.5.0: biometria só no Pro e só no celular */
const bioPode = (p: PerfilAjuda) => p.pro && p.plataforma === 'celular';
const segredoNome = (p: PerfilAjuda) => (p.pro ? 'PIN ou senha' : 'senha');
const temCofre = (p: PerfilAjuda) => !!p.estadoCofre && p.estadoCofre !== 'PENDENTE_PAREAMENTO';

const SIM = ['sim', 's', 'quero', 'pode', 'claro', 'ok', 'bora', 'vamos', 'isso', 'aham', 'uhum', 'positivo', 'manda', 'por favor', 'yes'];
const NAO = ['nao', 'n', 'agora nao', 'depois', 'deixa', 'nao precisa', 'negativo', 'nem', 'no'];
export const simNao = (sim: Omit<Opcao, 'rotulo' | 'termos'>, nao?: Omit<Opcao, 'rotulo' | 'termos'>, rotulos: [string, string] = ['Sim', 'Agora não']): Opcao[] => [
  { rotulo: rotulos[0], termos: SIM, ...sim },
  { rotulo: rotulos[1], termos: NAO, ...(nao ?? { resposta: (_p, c) => ({ texto: c.um(['Tranquilo! Se mudar de ideia, é só chamar. 😉', 'Sem problema. Estou por aqui.', 'Combinado. Qualquer coisa, me chama.']), humor: 'ok' }) }) },
];

const proNao = (recurso: string, ctx: Ctx): Resposta => ({
  texto: [
    `${recurso} é do **Krypta Pro** (R$ 25/mês ou R$ 225/ano).`,
    ctx.um(['No Free você já tem o cofre cifrado, a trava com senha, o cofre nos seus outros aparelhos (com senha), Login/Wi-Fi/Nota e 2 pontos de restauração.', 'O Free continua protegendo suas senhas com cifragem e senha; o Pro adiciona PIN, digital no celular e os recursos de emergência.']),
  ],
  acoes: [{ rotulo: 'Ver o Krypta Pro', para: '/plans' }],
  opcoes: simNao({ resposta: escolherPlano }, undefined, ['Me ajuda a decidir', 'Agora não']),
  humor: 'pensando',
});

// ------------------------------------------------------------
// próximo passo (o "GPS" do Cody)
// ------------------------------------------------------------
export function proximoPasso(p: PerfilAjuda, ctx: Ctx): Resposta {
  if (!p.logado)
    return {
      texto: ['Para começar são 3 passos, uns 3 minutos no total:', '1. **Crie sua conta**.\n2. **Ative o cofre** neste aparelho e anote a **chave de contingência**.\n3. Crie o **PIN do cofre** e guarde sua primeira senha.'],
      acoes: [
        { rotulo: 'Criar conta', para: '/register' },
        { rotulo: 'Como funciona', para: '/como-funciona' },
      ],
      humor: 'oi',
    };
  switch (p.situacao) {
    case 'sem-cofre':
      return {
        texto: [com(ctx, 'seu próximo passo é **ativar o cofre**. 🔐'), 'Você escolhe o dispositivo (pode ser este aparelho), anota a **chave de contingência** em papel e cria o **PIN**. Quer que eu te leve lá?'],
        opcoes: [
          { rotulo: 'Sim, vamos!', termos: SIM, para: '/device' },
          { rotulo: 'O que é a chave de contingência?', termos: ['chave', 'contingencia'], resposta: (pp, cc) => porId('ccp').resposta(pp, cc) },
        ],
        humor: 'oi',
      };
    case 'sem-trava':
      return {
        texto: [com(ctx, `falta uma coisa importante: **proteger o cofre neste aparelho** com ${p.pro ? 'um PIN ou uma senha' : 'uma senha'}.`), 'Sem ele, quem pegar o aparelho veria suas senhas. Leva 30 segundos (você vai precisar da chave de contingência).'],
        opcoes: simNao({ para: '/device' }, undefined, ['Proteger agora', 'Depois']),
        humor: 'alerta',
      };
    case 'trancado':
      return {
        texto: `Seu cofre está **trancado** neste aparelho (ele tranca sozinho depois de 5 minutos). Digite o PIN${p.biometria ? ' ou use a biometria' : ''} para abrir.`,
        acoes: [{ rotulo: 'Abrir o cofre', para: '/cofre/chaves' }],
        sugestoes: ['Esqueci o PIN do cofre'],
        humor: 'ok',
      };
    case 'outro-aparelho':
      return {
        texto: p.acessoRemoto
          ? [`Seu cofre está pareado em outro aparelho, mas você abre e edita aqui com a sua **${segredoNome(p)} de acesso**. 🔓`, bioPode(p) ? 'Depois de abrir, dá para ligar a **digital** neste celular.' : !p.pro ? 'No Pro também dá para usar um PIN de 6 dígitos e, no celular, a digital.' : '']
          : ['Seu cofre está pareado em outro aparelho e você ainda **não criou a senha de acesso**.', `Ela vale em **todos os planos**: crie uma vez (com a chave de contingência) e abra o cofre aqui sempre que quiser.${p.pro ? ' No Pro pode ser um PIN de 6 dígitos.' : ''}`],
        acoes: [{ rotulo: p.acessoRemoto ? 'Abrir o cofre aqui' : 'Criar a senha de acesso', para: '/cofre/acesso' }],
        humor: 'ok',
      };
    case 'bloqueado':
      return { texto: ['O **Kill Switch** foi acionado: o dispositivo antigo foi banido.', 'Para voltar a usar, vincule um dispositivo novo com a chave de contingência.'], acoes: [{ rotulo: 'Vincular dispositivo novo', para: '/device' }], humor: 'alerta' };
    case 'recuperacao':
      return { texto: 'Há uma **recuperação em andamento**. Termine-a em Meu Krypta para voltar a usar o cofre.', acoes: [{ rotulo: 'Meu Krypta', para: '/device' }], humor: 'alerta' };
    default: {
      const dicas: string[] = [];
      if ((p.totalChaves ?? 0) === 0) dicas.push('guardar sua **primeira senha**');
      if (!p.biometria && bioPode(p)) dicas.push('ligar a **biometria** para abrir mais rápido');
      if (p.pro && !p.heranca) dicas.push('ativar a **herança digital**');
      if (p.acessoRemoto === false) dicas.push('criar a **senha de acesso** para os outros aparelhos');
      dicas.push('salvar um **ponto de restauração**');
      return {
        texto: [com(ctx, ctx.um(['seu cofre está pronto! ✅', 'tudo certo com o seu cofre. ✅', 'cofre aberto e funcionando. ✅'])), `Se quiser deixar ainda melhor: ${dicas.slice(0, 3).join(', ')}.`],
        acoes: [
          { rotulo: 'Nova chave', para: '/cofre/nova-chave' },
          { rotulo: 'Minhas chaves', para: '/cofre/chaves' },
        ],
        sugestoes: ['Minha conta está segura?', 'Me dá uma dica de segurança'],
        humor: 'feliz',
      };
    }
  }
}

// ------------------------------------------------------------
// check-up da conta
// ------------------------------------------------------------
export function checkup(p: PerfilAjuda, ctx: Ctx): Resposta {
  if (!p.logado) return { texto: 'Entre na sua conta que eu faço um check-up completo da sua segurança. 🩺', acoes: [{ rotulo: 'Entrar', para: '/login' }], humor: 'oi' };
  const itens: [boolean, string][] = [
    [temCofre(p), 'Cofre ativado'],
  ];
  if (['pronto', 'trancado', 'sem-trava'].includes(p.situacao)) itens.push([p.situacao !== 'sem-trava', 'Trava do cofre (senha ou PIN) neste aparelho']);
  if (bioPode(p)) itens.push([p.biometria, 'Biometria ligada']);
  if (p.acessoRemoto !== null) itens.push([!!p.acessoRemoto, 'Senha de acesso para outros aparelhos']);
  if (p.pro) itens.push([p.heranca, 'Herança digital']);
  const ok = itens.filter((i) => i[0]).length;
  const nota = Math.round((ok / itens.length) * 10);
  const lista = itens.map(([v, t]) => `${v ? '✅' : '⬜'} ${t}`).join('\n');
  const veredito = nota >= 9 ? 'Excelente, sua conta está muito bem protegida! 🏆' : nota >= 6 ? 'Está boa, mas dá para melhorar.' : 'Tem coisa importante faltando. Vamos resolver?';
  return {
    texto: [com(ctx, `fiz o check-up da sua conta. Nota **${nota}/10**.`), lista, veredito, 'E uma pergunta: você guardou a **chave de contingência** em papel, longe do computador?'],
    opcoes: [
      { rotulo: 'Guardei sim', termos: SIM.concat(['guardei', 'anotei', 'tenho']), resposta: (pp, cc) => ({ texto: cc.um(['Perfeito! Essa é a parte mais importante. 👏', 'Ótimo! Com ela guardada, você recupera tudo numa emergência. 👏']), sugestoes: nota < 10 ? ['O que eu faço agora?'] : [], humor: 'feliz', ...(nota < 10 ? { acoes: proximoPasso(pp, cc).acoes } : {}) }) },
      { rotulo: 'Não lembro / perdi', termos: NAO.concat(['perdi', 'nao lembro', 'nao sei', 'esqueci']), resposta: (pp, cc) => porId('perdi-ccp').resposta(pp, cc) },
    ],
    humor: nota >= 9 ? 'feliz' : nota >= 6 ? 'ok' : 'alerta',
  };
}

// ------------------------------------------------------------
// fluxos guiados
// ------------------------------------------------------------
export function escolherPlano(_p: PerfilAjuda, ctx: Ctx): Resposta {
  const p2 = (vários: boolean): Resposta => ({
    texto: 'Segunda: se algo acontecer com você, quer que alguém de confiança receba o cofre (**herança digital**)?',
    opcoes: [
      { rotulo: 'Sim, é importante', termos: SIM, resposta: (_pp, c) => p3(vários, true, c) },
      { rotulo: 'Não precisa', termos: NAO, resposta: (_pp, c) => p3(vários, false, c) },
    ],
    humor: 'pensando',
  });
  const p3 = (vários: boolean, heranca: boolean, _c: Ctx): Resposta => ({
    texto: 'Última: se você perder o celular, quer poder **banir o aparelho** na hora (Kill Switch)?',
    opcoes: [
      { rotulo: 'Quero', termos: SIM, resposta: (_pp, c) => veredito(vários, heranca, true, c) },
      { rotulo: 'Tanto faz', termos: NAO.concat(['tanto faz', 'indiferente']), resposta: (_pp, c) => veredito(vários, heranca, false, c) },
    ],
    humor: 'pensando',
  });
  const veredito = (vários: boolean, heranca: boolean, kill: boolean, c: Ctx): Resposta => {
    const motivos = [vários && 'abrir o cofre com PIN ou digital', heranca && 'a herança digital', kill && 'o Kill Switch'].filter(Boolean) as string[];
    return motivos.length
      ? {
          texto: [`Pelo que você me contou, o **Pro** é o seu plano. 💜`, `Você quer ${motivos.join(', ').replace(/, ([^,]*)$/, ' e $1')}, e isso só existe no Pro. Custa R$ 25/mês ou R$ 225/ano (sai R$ 18,75/mês).`],
          acoes: [{ rotulo: 'Assinar o Pro', para: '/plans' }],
          humor: 'feliz',
        }
      : { texto: [c.um(['O **Free** dá conta do recado para você! 🙌', 'Pode ficar no **Free** tranquilo. 🙌']), 'Ele já cifra tudo, tranca com senha e abre o cofre nos seus outros aparelhos. Se um dia quiser herança, Kill Switch ou PIN/digital, é só mudar.'], humor: 'feliz' };
  };
  return {
    texto: [ctx.um(['Bora descobrir! São 3 perguntas rápidas.', 'Te ajudo a escolher, são só 3 perguntas.']), 'Primeira: no dia a dia, você prefere abrir o cofre com um **PIN de 6 números ou a digital** (em vez de digitar uma senha)?'],
    opcoes: [
      { rotulo: 'Sim, PIN ou digital', termos: SIM.concat(['pin', 'digital', 'biometria']), resposta: () => p2(true) },
      { rotulo: 'Senha está ótimo', termos: NAO.concat(['senha', 'tanto faz']), resposta: () => p2(false) },
    ],
    humor: 'pensando',
  };
}

function naoAbre(_p: PerfilAjuda, ctx: Ctx): Resposta {
  return {
    texto: [ctx.frustrado ? 'Calma, a gente resolve isso juntos. 🤝' : 'Vamos descobrir o que está acontecendo.', 'O que aparece na tela quando você tenta abrir o cofre?'],
    opcoes: [
      { rotulo: 'Pede o PIN e não aceita', termos: ['pin', 'nao aceita', 'errado', 'incorreto'], resposta: (pp, c) => porId('esqueci-pin').resposta(pp, c) },
      {
        rotulo: 'Diz que está em outro aparelho',
        termos: ['outro aparelho', 'outro dispositivo'],
        resposta: (pp, c) => (pp.pro ? porId('remoto').resposta(pp, c) : { texto: ['Isso acontece quando o cofre foi pareado em outro aparelho (ou o navegador foi limpo).', 'No Free o cofre abre só no aparelho pareado. Se você perdeu o acesso a ele, dá para recuperar com a **chave de contingência**.'], acoes: [{ rotulo: 'Meu Krypta', para: '/device' }], humor: 'pensando' }),
      },
      { rotulo: 'Fica carregando', termos: ['carregando', 'demora', 'lento', 'travado', 'nao carrega'], resposta: (pp, c) => porId('lento').resposta(pp, c) },
      { rotulo: 'Pede para ativar o cofre', termos: ['ativar', 'parear', 'pareamento'], resposta: (pp, c) => (temCofre(pp) ? { texto: ['Se você já tinha cofre e agora pede para ativar de novo, provavelmente os dados do navegador foram apagados.', 'Use **"Perdi minha chave / dispositivo"** com a chave de contingência para trazer o cofre de volta do backup cifrado.'], acoes: [{ rotulo: 'Recuperar', para: '/perdi-ccp' }], humor: 'pensando' } : proximoPasso(pp, c)) },
    ],
    humor: ctx.frustrado ? 'triste' : 'duvida',
  };
}

function perdiAlgo(_p: PerfilAjuda, ctx: Ctx): Resposta {
  return {
    texto: [ctx.um(['Ih, vamos ver isso. 🫡', 'Calma, quase tudo tem volta no Krypta.']), 'O que você perdeu?'],
    opcoes: [
      { rotulo: 'O celular / dispositivo', termos: ['celular', 'dispositivo', 'aparelho', 'telefone', 'notebook', 'krypta fisico'], resposta: (pp, c) => porId('kill').resposta(pp, c) },
      { rotulo: 'A chave de contingência', termos: ['chave', 'contingencia', 'ccp', 'papel'], resposta: (pp, c) => porId('perdi-ccp').resposta(pp, c) },
      { rotulo: 'O PIN do cofre', termos: ['pin', 'trava'], resposta: (pp, c) => porId('esqueci-pin').resposta(pp, c) },
      { rotulo: 'A senha da conta', termos: ['senha', 'login', 'conta'], resposta: (pp, c) => porId('senha-conta').resposta(pp, c) },
    ],
    humor: 'pensando',
  };
}

const DICAS = [
  'Use uma senha **diferente em cada site**. Se um vazar, os outros continuam seguros (o gerador do Krypta faz isso por você).',
  'Ligue a **verificação em duas etapas** no e-mail e no banco. O e-mail é a chave de todas as outras contas.',
  'Desconfie de mensagens com **pressa** ("sua conta será bloqueada hoje!"). Golpes vivem de urgência.',
  'Guarde a **chave de contingência em papel**, num lugar físico seguro. Foto no celular não vale: se perder o celular, perde as duas.',
  'Salve um **ponto de restauração** antes de mexer em muitas senhas de uma vez.',
  'Senha boa é **longa**: 14+ caracteres ganham de qualquer combinação curta cheia de símbolos.',
  'No Pro, ative a **herança digital**: sua família não fica sem acesso a contas importantes.',
  'Não salve senhas importantes em **bloco de notas** ou no WhatsApp "para você mesmo".',
];

function gerarSenha(tam = 18): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_';
  const r = new Uint32Array(tam);
  crypto.getRandomValues(r);
  return Array.from(r, (n) => chars[n % chars.length]).join('');
}

// ------------------------------------------------------------
// ASSUNTOS
// ------------------------------------------------------------
export const ASSUNTOS: Assunto[] = [
  // ======= conversa =======
  {
    id: 'oi',
    titulo: 'Oi!',
    termos: [['oi', 3], ['ola', 3], ['oie', 3], ['bom dia', 3], ['boa tarde', 3], ['boa noite', 3], ['e ai', 3], ['eae', 3], ['salve', 2], ['hello', 2], ['hey', 2], ['opa', 2]],
    resposta: (p, ctx) => {
      const periodo = ctx.hora < 5 ? 'Boa madrugada' : ctx.hora < 12 ? 'Bom dia' : ctx.hora < 18 ? 'Boa tarde' : 'Boa noite';
      return {
        texto: [`${periodo}${p.nome ? `, ${p.nome}` : ''}! 👋 ${ctx.um(['Em que posso ajudar?', 'Como posso te ajudar hoje?', 'O que você precisa?'])}`],
        sugestoes: ['O que eu faço agora?', 'Minha conta está segura?', 'Como funciona o Krypta?'],
        humor: 'oi',
      };
    },
  },
  {
    id: 'como-vai',
    titulo: 'Tudo bem?',
    termos: [['tudo bem', 4], ['tudo bom', 4], ['como vai', 4], ['como voce esta', 5], ['beleza', 2], ['suave', 2], ['tranquilo', 1]],
    resposta: (_p, ctx) => ({
      texto: ctx.um(['Tudo ótimo por aqui, com os circuitos em dia! 🤖 E você, precisa de alguma coisa?', 'Tudo certo! Acabei de checar meus cadeados. 🔒 E aí, como posso ajudar?', 'Melhor agora que você apareceu! Em que posso ajudar?']),
      sugestoes: ['O que eu faço agora?', 'Me dá uma dica de segurança'],
      humor: 'feliz',
    }),
  },
  {
    id: 'obrigado',
    titulo: 'Obrigado',
    termos: [['obrigad', 4], ['valeu', 4], ['agradeco', 4], ['brigad', 4], ['vlw', 4], ['thanks', 3], ['ajudou', 3], ['resolveu', 3]],
    resposta: (_p, ctx) => ({ texto: ctx.um(['Por nada! Fico feliz em ajudar. 💜', 'Disponha! Qualquer coisa, estou aqui no cantinho.', 'Imagina! Foi um prazer. 🤖']), humor: 'feliz' }),
  },
  {
    id: 'tchau',
    titulo: 'Tchau',
    termos: [['tchau', 4], ['ate mais', 4], ['ate logo', 4], ['falou', 3], ['flw', 3], ['bye', 3], ['fui', 2]],
    resposta: (p, ctx) => ({ texto: ctx.um([`Até mais${p.nome ? `, ${p.nome}` : ''}! Seu cofre fica de olho por aqui. 🔒`, 'Tchau! Volte sempre. 👋', 'Até logo! Qualquer dúvida, me chama.']), humor: 'oi' }),
  },
  {
    id: 'quem',
    titulo: 'Quem é você?',
    termos: [['quem e voce', 5], ['quem voce', 3], ['seu nome', 4], ['qual seu nome', 5], ['cody', 3], ['robo', 2], ['bot', 2]],
    resposta: () => ({
      texto: ['Eu sou o **Cody**, o robô do Krypta! 🤖', 'Eu olho a situação da sua conta (plano, cofre, aparelho) para responder certinho e te levar à tela certa. E fica tranquilo: **eu nunca vejo suas senhas**. O cofre é cifrado e nem eu, nem o servidor, conseguimos abrir.'],
      sugestoes: ['O que você sabe fazer?', 'Vocês conseguem ver minhas senhas?'],
      humor: 'oi',
    }),
  },
  {
    id: 'esconder',
    titulo: 'Como escondo o Cody do canto?',
    termos: [['esconder o cody', 7], ['tirar o cody', 7], ['tiro o cody', 7], ['tira o cody', 7], ['esconde o cody', 7], ['cody do canto', 7], ['desligar o cody', 7], ['some o cody', 6], ['sumir com o cody', 7], ['esconder o robo', 6], ['tirar o robo', 6], ['botao flutuante', 6], ['cody flutuante', 6], ['atrapalhando', 4]],
    resposta: (p) => ({
      texto: [
        'Sem problema, não fico chateado! 😅',
        p.plataforma === 'celular'
          ? 'Em **Ajustes → Mostrar o Cody flutuante**, desligue. Eu continuo no Início, no Perfil e no **balão de conversa** da barra de baixo.'
          : 'Em **Configurações → Cody flutuante**, toque para esconder. Eu continuo no Início e no Perfil.',
      ],
      acoes: [{ rotulo: p.plataforma === 'celular' ? 'Ajustes' : 'Configurações', para: '/settings' }],
      humor: 'triste',
    }),
  },
  {
    id: 'ia',
    titulo: 'Você é uma IA?',
    termos: [['voce e uma ia', 6], ['inteligencia artificial', 5], ['voce e humano', 6], ['e uma pessoa', 4], ['chatgpt', 5], ['robo de verdade', 4], ['voce pensa', 4]],
    resposta: () => ({
      texto: ['Sou um assistente feito pela equipe do Krypta, que roda **dentro do seu aparelho**. 🤖', 'Não mando suas perguntas para nenhuma IA de fora: entendo o que você escreve, olho sua conta e respondo. Se eu não souber, te passo para uma pessoa de verdade.'],
      sugestoes: ['Falar com uma pessoa'],
      humor: 'pensando',
    }),
  },
  {
    id: 'sabe-fazer',
    titulo: 'O que você sabe fazer?',
    termos: [['o que voce sabe', 5], ['o que voce faz', 5], ['como voce ajuda', 5], ['suas funcoes', 4], ['ajuda', 1], ['menu', 3], ['opcoes', 2]],
    resposta: (p) => ({
      texto: [
        'Algumas coisas que eu faço:',
        `• Digo o **próximo passo** pela situação da sua conta\n• Faço um **check-up** de segurança${p.logado ? '' : ' (depois de entrar)'}\n• Resolvo problemas: **cofre não abre**, **perdi algo**, **esqueci o PIN**\n• Te ajudo a **escolher o plano**\n• **Gero senhas fortes** na hora\n• Explico qualquer tela e te levo até ela`,
      ],
      sugestoes: ['Minha conta está segura?', 'Gera uma senha forte', 'Me ajuda a escolher o plano'],
      humor: 'feliz',
    }),
  },
  {
    id: 'piada',
    titulo: 'Conta uma piada',
    termos: [['piada', 5], ['me faz rir', 5], ['algo engracado', 4], ['charada', 4]],
    resposta: (_p, ctx) => ({
      texto: ctx.um([
        'Por que a senha "123456" foi ao psicólogo? Porque todo mundo descobria tudo sobre ela. 😅',
        'O que o cadeado disse para a chave? "Sem você eu não me abro." 🔐',
        'Minha senha favorita? Uma que nem eu sei. É assim que tem que ser! 🤫',
        'Sabe por que robô não tem medo de hacker? Porque a gente tem **firewall** emocional. 🤖',
      ]),
      sugestoes: ['Outra!', 'Me dá uma dica de segurança'],
      humor: 'feliz',
    }),
  },
  {
    id: 'elogio',
    titulo: 'Você é legal',
    termos: [['voce e legal', 5], ['gostei de voce', 5], ['fofo', 4], ['inteligente', 3], ['muito bom', 3], ['amei', 3], ['adorei', 3], ['top demais', 3], ['perfeito', 2]],
    resposta: (_p, ctx) => ({ texto: ctx.um(['Assim eu fico sem graça! 😊 Obrigado!', 'Awn, você também! 💜', 'Meus circuitos esquentaram aqui. Obrigado! 🤖']), humor: 'feliz' }),
  },
  {
    id: 'grosseria',
    titulo: 'Você é inútil',
    termos: [['inutil', 5], ['burro', 5], ['idiota', 5], ['lixo', 4], ['nao serve', 4], ['horrivel', 3], ['pessimo', 3], ['odeio', 4]],
    resposta: (_p, ctx) => ({
      texto: [ctx.um(['Poxa, desculpa não ter ajudado. 😕', 'Entendo a frustração, e sinto muito.']), 'Me conta com outras palavras o que você precisa, ou fale com a nossa equipe que uma pessoa te responde.'],
      acoes: [{ rotulo: 'Falar com a equipe', para: '/contact' }],
      humor: 'triste',
    }),
  },
  {
    id: 'hora',
    titulo: 'Que horas são?',
    termos: [['que horas', 5], ['que dia e hoje', 5], ['data de hoje', 4], ['hora agora', 4]],
    resposta: () => {
      const d = new Date();
      return { texto: `Agora são **${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}** de ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}. ⏰`, humor: 'ok' };
    },
  },
  {
    id: 'entendi',
    titulo: 'Entendi',
    termos: [['entendi', 4], ['certo', 2], ['blz', 3], ['ok', 2], ['esta bom', 3], ['beleza', 1], ['show', 2], ['kkk', 3], ['haha', 3], ['rs', 2]],
    resposta: (_p, ctx) => ({ texto: ctx.um(['👍 Algo mais em que eu possa ajudar?', 'Fechou! Quer ver mais alguma coisa?', 'Boa! Se precisar, é só falar.']), sugestoes: ['O que eu faço agora?', 'Me dá uma dica de segurança'], humor: 'ok' }),
  },

  // ======= sua conta =======
  {
    id: 'proximo',
    titulo: 'O que eu faço agora?',
    termos: [['o que faco', 5], ['proximo passo', 5], ['como comecar', 5], ['comecar', 2], ['primeiro passo', 5], ['por onde', 4], ['perdido', 4], ['to perdido', 5], ['o que fazer', 5], ['e agora', 4]],
    resposta: proximoPasso,
  },
  {
    id: 'checkup',
    titulo: 'Minha conta está segura?',
    termos: [['minha conta esta segura', 7], ['conta segura', 5], ['estou seguro', 5], ['check up', 5], ['checkup', 5], ['analisa minha conta', 6], ['status', 3], ['resumo da conta', 5], ['como esta minha conta', 6], ['nota', 2]],
    resposta: checkup,
  },
  {
    id: 'meu-plano',
    titulo: 'Qual é o meu plano?',
    termos: [['qual meu plano', 6], ['qual e o meu plano', 6], ['meu plano', 4], ['sou pro', 4], ['sou free', 4], ['minha assinatura', 4]],
    resposta: (p, ctx) =>
      !p.logado
        ? { texto: 'Você ainda não entrou na conta. Quando entrar, eu te digo o plano e o que ele inclui.', acoes: [{ rotulo: 'Entrar', para: '/login' }] }
        : p.pro
          ? { texto: [com(ctx, 'você é **Krypta Pro**. 💜'), 'Tem tudo liberado: vários aparelhos com PIN, herança, Kill Switch, todos os tipos de chave, 20 pontos de restauração e 1 MB de cofre.'], acoes: [{ rotulo: 'Gerenciar plano', para: '/settings' }], humor: 'feliz' }
          : { texto: [com(ctx, 'você está no **Krypta Free**.'), 'Ele cobre o essencial. Quer que eu te diga se o Pro vale a pena para você?'], opcoes: simNao({ resposta: escolherPlano }), humor: 'ok' },
  },
  {
    id: 'quantas',
    titulo: 'Quantas senhas eu tenho?',
    termos: [['quantas senhas', 6], ['quantas chaves', 6], ['quantos logins', 5], ['total de senhas', 5], ['minhas senhas', 3]],
    resposta: (p, ctx) =>
      p.totalChaves === null
        ? { texto: p.situacao === 'trancado' ? 'Seu cofre está trancado, então não consigo contar. Abra com o PIN e me pergunte de novo. 🔒' : 'Só consigo contar quando o cofre está aberto neste aparelho.', acoes: [{ rotulo: 'Minhas chaves', para: '/cofre/chaves' }], humor: 'duvida' }
        : p.totalChaves === 0
          ? { texto: [com(ctx, 'seu cofre ainda está vazio.'), 'Que tal guardar a primeira? Comece pelo e-mail: ele é a chave de todas as outras contas.'], acoes: [{ rotulo: 'Nova chave', para: '/cofre/nova-chave' }], humor: 'oi' }
          : { texto: `Você tem **${p.totalChaves}** chave${p.totalChaves === 1 ? '' : 's'} guardada${p.totalChaves === 1 ? '' : 's'} no cofre. ${p.totalChaves > 15 ? 'Que organização! 👏' : '📂'}`, acoes: [{ rotulo: 'Ver minhas chaves', para: '/cofre/chaves' }], humor: 'ok' },
  },
  {
    id: 'novidades',
    titulo: 'O que tem de novo?',
    termos: [['novidade', 5], ['o que tem de novo', 6], ['atualizacao', 4], ['versao nova', 5], ['mudou', 3], ['nova versao', 5]],
    resposta: () => ({
      texto: [
        'As novidades mais recentes do Krypta:',
        '• **Cofre em outros aparelhos com senha** em todos os planos (PIN e digital no Pro)\n• **Eu!** O Cody, agora também na barra do app\n• **Foto de perfil** com 12 avatares do Cody, a cor que você quiser ou sua foto ajustada\n• **Notificações** de segurança no Windows, no navegador e no app\n• Telas mais rápidas no celular',
      ],
      sugestoes: ['Como abro o cofre em outro aparelho?', 'Como coloco foto no perfil?'],
      humor: 'feliz',
    }),
  },

  // ======= começo =======
  {
    id: 'krypta',
    titulo: 'Como funciona o Krypta?',
    termos: [['como funciona', 4], ['o que e o krypta', 6], ['krypta', 1], ['para que serve', 4], ['explica', 2]],
    paginas: ['/', '/como-funciona'],
    resposta: () => ({
      texto: [
        'O Krypta é um **cofre de senhas** que cifra tudo **no seu aparelho**, antes de sair. O servidor só guarda um backup que nem ele consegue abrir. 🔐',
        '1. Você cria a conta.\n2. **Ativa o cofre** num dispositivo (este aparelho ou o Krypta físico com cartão NFC).\n3. Anota a **chave de contingência** (para emergências).\n4. Cria o **PIN** e guarda suas senhas.',
      ],
      acoes: [{ rotulo: 'Como funciona (página)', para: '/como-funciona' }],
      sugestoes: ['O que é parear?', 'Vocês conseguem ver minhas senhas?'],
      humor: 'oi',
    }),
  },
  {
    id: 'parear',
    titulo: 'O que é parear?',
    termos: [['parear', 5], ['pareamento', 5], ['ativar cofre', 5], ['ativar o cofre', 5], ['criar cofre', 5], ['dispositivo de software', 4], ['vincular', 2]],
    paginas: ['/device'],
    resposta: (p, ctx) =>
      p.situacao === 'sem-cofre' || !p.logado
        ? {
            texto: [
              '**Parear** é ligar um dispositivo ao seu cofre. Ele cria uma chave secreta que **nunca sai dele**, e é ela que abre o cofre.',
              'Pode ser **este aparelho** (Free e Pro) ou o **Krypta físico** com cartão NFC (Pro). No pareamento você também gera a chave de contingência e cria o PIN.',
            ],
            opcoes: p.logado ? simNao({ para: '/device' }, undefined, ['Parear agora', 'Depois']) : undefined,
            acoes: p.logado ? undefined : [{ rotulo: 'Criar conta', para: '/register' }],
            humor: 'oi',
          }
        : {
            texto: [com(ctx, `seu cofre já está pareado${p.situacao === 'outro-aparelho' ? ', mas em outro aparelho' : ' neste aparelho'}. ✅`), 'Se perdeu o dispositivo antigo, use o **Kill Switch** e vincule um novo com a chave de contingência.'],
            acoes: [{ rotulo: 'Meu Krypta', para: '/device' }],
            sugestoes: ['Perdi meu dispositivo'],
            humor: 'ok',
          },
  },

  // ======= emergências =======
  {
    id: 'ccp',
    titulo: 'O que é a chave de contingência?',
    termos: [['chave de contingencia', 6], ['contingencia', 5], ['ccp', 5], ['32 caracteres', 3], ['chave de emergencia', 5], ['onde guardo', 2]],
    resposta: () => ({
      texto: [
        'A **chave de contingência** é o código de 32 caracteres (8 blocos) que aparece **uma vez só**, quando você ativa o cofre.',
        'Ela é o seu "plano B": recupera o cofre, troca o dispositivo, aciona o Kill Switch e abre a trava se você esquecer o PIN.',
        '📝 Guarde **em papel**, longe do computador. O Krypta **não consegue** recuperá-la por você.',
      ],
      sugestoes: ['Perdi a chave de contingência', 'Esqueci o PIN do cofre'],
      humor: 'alerta',
    }),
  },
  {
    id: 'perdi-ccp',
    titulo: 'Perdi a chave de contingência',
    termos: [['perdi a chave de contingencia', 8], ['esqueci a chave de contingencia', 8], ['perdi a chave', 5], ['perdi minha chave', 5], ['perdi a ccp', 6], ['perdi ccp', 5], ['sem a chave', 3]],
    resposta: (p, ctx) => ({
      texto:
        p.situacao === 'pronto' || p.situacao === 'trancado'
          ? [ctx.um(['Respira, tem solução! 😮‍💨', 'Fica tranquilo, isso tem jeito.']), 'Como o dispositivo está com você, dá para **criar uma chave nova** usando o dispositivo + a senha da conta. A antiga deixa de valer na hora.']
          : ['Se você ainda tem o dispositivo, crie uma **chave nova** com ele + a senha da conta.', 'Se perdeu o dispositivo **e** a chave, a saída é **abandonar o cofre** (senha + código por e-mail) e começar um novo, vazio. É chato, mas é o que garante que ninguém mais abre o seu cofre.'],
      acoes: [{ rotulo: 'Criar chave nova', para: '/perdi-ccp' }],
      humor: 'pensando',
    }),
  },
  {
    id: 'perdi',
    titulo: 'Perdi uma coisa',
    termos: [['perdi', 3], ['sumiu', 3], ['nao acho', 3], ['esqueci', 2], ['roubaram', 3]],
    resposta: perdiAlgo,
  },
  {
    id: 'nao-abre',
    titulo: 'Não consigo abrir o cofre',
    termos: [['nao consigo abrir', 7], ['nao abre', 6], ['cofre nao abre', 7], ['nao consigo acessar', 6], ['nao funciona', 4], ['deu erro', 4], ['bugou', 4], ['travou', 4], ['problema', 2]],
    resposta: naoAbre,
  },

  // ======= trava =======
  {
    id: 'pin',
    titulo: 'O que é o PIN do cofre?',
    termos: [['pin', 4], ['trava', 4], ['trancado', 4], ['senha do cofre', 5], ['bloqueio do cofre', 4], ['abrir o cofre', 3], ['proteger o cofre', 4], ['tranca sozinho', 5]],
    resposta: (p) => ({
      texto: [
        p.pro
          ? 'A **trava do cofre** (PIN de 6 números ou senha) tranca o cofre **até no aparelho que pareou**: os dados ficam cifrados e só abrem com ela. O mesmo PIN pode abrir o cofre nos seus outros aparelhos.'
          : 'A **trava do cofre** é uma **senha** (8+ caracteres) que tranca o cofre **até no aparelho que pareou**, e a mesma senha pode abrir o cofre nos seus outros aparelhos. PIN de 6 dígitos e biometria são do Pro.',
        'Ele tranca sozinho depois de **5 minutos** sem uso, ao recarregar a página e ao sair da conta.' + (p.situacao === 'sem-trava' ? '\n\n⚠️ Você ainda **não criou** o seu PIN neste aparelho.' : ''),
      ],
      opcoes: p.situacao === 'sem-trava' ? simNao({ para: '/device' }, undefined, ['Criar agora', 'Depois']) : undefined,
      acoes: p.situacao === 'sem-trava' ? undefined : [{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }],
      sugestoes: bioPode(p) ? ['Como ligo a biometria?', 'Esqueci o PIN do cofre'] : ['Como abro o cofre em outro aparelho?', 'Esqueci o PIN do cofre'],
      humor: p.situacao === 'sem-trava' ? 'alerta' : 'ok',
    }),
  },
  {
    id: 'esqueci-pin',
    titulo: 'Esqueci o PIN do cofre',
    termos: [['esqueci o pin', 7], ['esqueci pin', 7], ['esqueci a senha do cofre', 7], ['pin errado', 5], ['nao lembro o pin', 7], ['muitas tentativas', 4], ['pin nao aceita', 6]],
    resposta: (_p, ctx) => ({
      texto: [
        ctx.frustrado ? 'Acontece com todo mundo, sem estresse! 🫂' : ctx.um(['Acontece! Tem jeito fácil.', 'Sem problema, dá para resolver.']),
        'Na tela do cofre trancado, toque em **"Esqueci o PIN"** e digite a **chave de contingência**. O cofre abre e você cria um PIN novo.',
        'Dica: depois de 5 erros seguidos o app pede para esperar um pouco antes de tentar de novo. É proteção contra quem tenta adivinhar.',
      ],
      acoes: [{ rotulo: 'Ir para o cofre', para: '/cofre/chaves' }],
      sugestoes: ['Perdi a chave de contingência'],
      humor: 'ok',
    }),
  },
  {
    id: 'biometria',
    titulo: 'Como ligo a biometria?',
    termos: [['biometria', 5], ['digital', 4], ['impressao digital', 5], ['face id', 5], ['rosto', 3], ['windows hello', 5], ['touch id', 5]],
    resposta: (p, ctx) =>
      !p.pro
        ? proNao('Abrir o cofre com a digital ou o rosto', ctx)
        : p.plataforma !== 'celular'
          ? { texto: ['A biometria do Krypta funciona **no celular** (digital ou rosto). 📱', 'No computador, o cofre abre com o PIN ou a senha. Abra o Krypta no celular para ligar.'], acoes: [{ rotulo: 'Instalar no celular', para: '/aplicacoes' }], humor: 'ok' }
          : {
              texto: p.biometria
                ? ['Sua biometria **já está ligada** neste celular. ✅', 'Ela vale só neste aparelho. Em cada celular você liga de novo.']
                : ['No aparelho pareado: abra o cofre e vá em **Senha do cofre → Ligar biometria**. 👆', 'Num celular que abre o cofre com a senha de acesso: depois de abrir, toque em **"Ligar digital ou rosto"**.'],
              acoes: [{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }],
              humor: p.biometria ? 'ok' : 'oi',
            },
  },
  {
    id: 'trancar',
    titulo: 'Como tranco o cofre agora?',
    termos: [['trancar agora', 6], ['fechar o cofre', 6], ['trancar o cofre', 6], ['bloquear agora', 5], ['sair do cofre', 5]],
    resposta: () => ({ texto: 'Em **Senha do cofre** tem o botão **"Trancar agora"**. Ele também tranca sozinho em 5 minutos sem uso ou quando você sai da conta. 🔒', acoes: [{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }], humor: 'ok' }),
  },
  {
    id: 'remoto',
    titulo: 'Como abro o cofre em outro aparelho?',
    termos: [['outro aparelho', 5], ['outro dispositivo', 5], ['outro celular', 5], ['outro computador', 5], ['fora de casa', 4], ['senha de acesso', 5], ['acessar de outro', 5], ['no trabalho', 3], ['no computador', 3]],
    resposta: (p) => ({
      texto: p.acessoRemoto
        ? [`Sua **senha de acesso** já está criada. ✅ Em qualquer aparelho, entre na conta e abra **Senha do cofre**: digite a ${segredoNome(p)} e pronto, dá para ver e editar tudo.`, bioPode(p) ? 'No celular, depois de abrir, você pode ligar a digital.' : '']
        : [`Em **todos os planos** você cria uma **senha de acesso** (de preferência a mesma da trava do cofre) usando a chave de contingência uma vez.`, `Depois, em qualquer aparelho logado, ela abre e edita o cofre.${p.pro ? ' No Pro pode ser um PIN de 6 dígitos e, no celular, a digital.' : ' No Pro dá para usar PIN de 6 dígitos e digital.'}`],
      acoes: [{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }],
      humor: 'ok',
    }),
  },

  // ======= chaves =======
  {
    id: 'nova-chave',
    titulo: 'Como guardo uma senha?',
    termos: [['guardar senha', 5], ['salvar senha', 5], ['adicionar senha', 5], ['nova chave', 5], ['nova senha', 4], ['criar chave', 5], ['cadastrar', 3], ['adicionar', 2], ['salv', 2], ['guard', 2], ['senha', 1.5]],
    paginas: ['/cofre/chaves'],
    resposta: (p, ctx) =>
      pronto(p) || (p.situacao === 'outro-aparelho' && p.pro)
        ? {
            texto: [`Toque em **Nova chave** (o **+** no celular), escolha o tipo (Login, Wi-Fi, Nota${p.pro ? ', Cartão, Endereço, Documento...' : ''}), preencha e salve.`, 'O ícone da marca aparece sozinho pelo nome (ex.: "Netflix"). E use o **gerador** para criar uma senha forte. 💪'],
            acoes: [{ rotulo: 'Nova chave', para: '/cofre/nova-chave' }],
            sugestoes: ['Gera uma senha forte'],
            humor: 'oi',
          }
        : proximoPasso(p, ctx),
  },
  {
    id: 'editar-chave',
    titulo: 'Como edito ou apago uma chave?',
    termos: [['editar', 4], ['alterar senha', 3], ['mudar senha', 3], ['apagar', 4], ['excluir chave', 5], ['remover', 3], ['deletar', 4]],
    resposta: () => ({
      texto: 'Em **Minhas chaves**, toque na chave: ali tem **Editar** e **Excluir**. Apagou sem querer? Volte a um **ponto de restauração**. 😉',
      acoes: [{ rotulo: 'Minhas chaves', para: '/cofre/chaves' }],
      sugestoes: ['O que é ponto de restauração?'],
      humor: 'ok',
    }),
  },
  {
    id: 'campos',
    titulo: 'Posso ter mais campos numa chave?',
    termos: [['mais campos', 5], ['campo extra', 5], ['cartao de credito', 4], ['endereco', 3], ['documento', 3], ['tipo de chave', 4], ['campos', 3]],
    resposta: (p, ctx) =>
      p.pro
        ? { texto: 'Sim! No Pro você usa todos os tipos (Cartão, Endereço, Documento, Personalizado) e **Adicionar campo** quantas vezes quiser. Cada campo pode ser secreto. 🗂️', acoes: [{ rotulo: 'Nova chave', para: '/cofre/nova-chave' }], humor: 'ok' }
        : proNao('Cartão, Endereço, Documento e campos extras', ctx),
  },
  {
    id: 'gerar',
    titulo: 'Gera uma senha forte',
    termos: [['gera uma senha', 7], ['gerar senha', 6], ['senha forte', 5], ['sugere uma senha', 6], ['cria uma senha', 6], ['senha segura', 4], ['outra senha', 4]],
    resposta: (_p, ctx) => ({
      texto: [ctx.um(['Saindo do forno! 🔥', 'Aqui está, novinha:', 'Fresquinha para você:']), `\`${gerarSenha(18)}\``, '18 caracteres, misturando letras, números e símbolos. Ela **não fica guardada** nesta conversa: copie e salve no cofre.'],
      acoes: [{ rotulo: 'Guardar numa chave nova', para: '/cofre/nova-chave' }],
      sugestoes: ['Outra senha', 'Me dá uma dica de segurança'],
      humor: 'feliz',
      efemera: true,
    }),
  },
  {
    id: 'dica',
    titulo: 'Me dá uma dica de segurança',
    termos: [['dica', 5], ['dicas', 5], ['conselho', 4], ['como me proteger', 5], ['golpe', 4], ['phishing', 5], ['seguranca digital', 4]],
    resposta: (_p, ctx) => ({ texto: ['💡 ' + ctx.um(DICAS)], sugestoes: ['Outra dica', 'Minha conta está segura?'], humor: 'pensando' }),
  },
  {
    id: 'importar',
    titulo: 'Dá para importar senhas?',
    termos: [['importar', 6], ['exportar', 5], ['trazer do chrome', 6], ['do google', 3], ['lastpass', 5], ['bitwarden', 5], ['planilha', 3], ['csv', 5]],
    resposta: () => ({ texto: ['Ainda **não** existe importação automática (de navegador, planilha ou outro gerenciador). 😕', 'Por enquanto você cadastra em **Nova chave**: comece pelas mais importantes (e-mail, banco, redes sociais). É uma boa hora para trocar senhas repetidas!'], acoes: [{ rotulo: 'Nova chave', para: '/cofre/nova-chave' }], humor: 'pensando' }),
  },
  {
    id: 'pontos',
    titulo: 'O que é ponto de restauração?',
    termos: [['ponto de restauracao', 6], ['restaurar', 4], ['backup', 3], ['voltar atras', 4], ['desfazer', 4], ['salvar estado', 5], ['recuperar chave apagada', 5]],
    resposta: (p) => ({
      texto: [`É uma **cópia cifrada** do cofre num momento, tipo "salvar jogo". 💾`, `Se algo der errado, você volta a ela. Salvar, restaurar e apagar pedem a **chave de contingência**. Seu plano guarda **${p.pro ? '20' : '2'}** pontos, e antes de restaurar o Krypta salva o estado atual (dá para desfazer).`],
      acoes: [{ rotulo: 'Pontos de restauração', para: '/cofre/pontos' }],
      humor: 'ok',
    }),
  },
  {
    id: 'conflito',
    titulo: 'O cofre foi alterado em outro aparelho',
    termos: [['alterado em outro aparelho', 6], ['conflito', 4], ['sincron', 4], ['nao atualizou', 4], ['nao aparece', 3]],
    resposta: () => ({ texto: 'Quando outro aparelho muda o cofre ao mesmo tempo, o Krypta **não sobrescreve** nada: ele atualiza a lista e pede para você salvar de novo. Confira e salve. 🔄', humor: 'ok' }),
  },

  // ======= emergência e herança =======
  {
    id: 'kill',
    titulo: 'Perdi meu dispositivo',
    termos: [['perdi o dispositivo', 6], ['perdi meu celular', 6], ['perdi o celular', 6], ['roubaram meu', 6], ['roubado', 5], ['furtado', 5], ['kill switch', 6], ['bloquear dispositivo', 5], ['perdi o krypta', 5]],
    resposta: (p, ctx) =>
      p.pro
        ? {
            texto: [ctx.frustrado ? 'Que situação chata, sinto muito. Vamos proteger seu cofre agora. 🛡️' : 'Vamos proteger seu cofre. 🛡️', 'Use o **Kill Switch** em Meu Krypta: com a chave de contingência, o dispositivo perdido é **banido para sempre**. Depois vincule um novo e o cofre volta do backup cifrado.', 'E respira: mesmo antes disso, quem pegou ainda precisaria do **PIN do cofre**.'],
            acoes: [{ rotulo: 'Acionar Kill Switch', para: '/device#kill' }],
            humor: 'alerta',
          }
        : {
            texto: ['O **Kill Switch** (banir o aparelho perdido) é do Pro, mas calma:', 'no Free o cofre do aparelho perdido continua trancado pelo **PIN do cofre**. Se você não tiver mais acesso, dá para **abandonar o cofre** e começar outro com segurança.'],
            acoes: [{ rotulo: 'Ver opções', para: '/perdi-ccp' }],
            humor: 'alerta',
          },
  },
  {
    id: 'heranca',
    titulo: 'Como funciona a herança digital?',
    termos: [['heranca', 5], ['herdeiro', 5], ['codigo de heranca', 6], ['kit de heranca', 6], ['falecimento', 4], ['morrer', 4], ['se eu morrer', 6], ['familia', 2]],
    resposta: (p, ctx) => {
      if (!p.pro) return proNao('A herança digital', ctx);
      if (!temCofre(p)) return { texto: 'A herança aparece **depois que o cofre é ativado**: primeiro pareie o dispositivo, depois gere o código de herança.', acoes: [{ rotulo: 'Ativar meu cofre', para: '/device' }], humor: 'ok' };
      return {
        texto: p.heranca
          ? ['Sua **herança está ativa**. ✅', 'Se algo acontecer, o herdeiro usa o **código de herança** na página de resgate e recebe o cofre. Você é avisado por e-mail quando isso acontece.']
          : ['Você gera um **código de herança** em Meu Krypta e entrega para uma pessoa de confiança (em papel ou arquivo). 🤝', 'Se algo acontecer com você, ela resgata o cofre sem precisar da sua senha. Quer gerar agora?'],
        opcoes: p.heranca ? undefined : simNao({ para: '/device#heranca' }, undefined, ['Gerar código', 'Depois']),
        acoes: p.heranca ? [{ rotulo: 'Ver herança', para: '/device#heranca' }] : undefined,
        sugestoes: ['Recebi um código de herança'],
        humor: 'ok',
      };
    },
  },
  {
    id: 'resgatar',
    titulo: 'Recebi um código de herança',
    termos: [['recebi um codigo', 6], ['recebi o codigo', 6], ['resgatar', 5], ['resgate', 5], ['sou herdeiro', 6]],
    resposta: () => ({ texto: ['Sinto muito se for por um momento difícil. 💜', 'Abra a página de **resgate de herança** e cole o código (ou abra o link que veio junto). Não precisa ter conta antes.'], acoes: [{ rotulo: 'Resgatar herança', para: '/heranca' }], humor: 'triste' }),
  },
  {
    id: 'abandonar',
    titulo: 'Quero começar um cofre novo',
    termos: [['abandonar', 5], ['cofre novo', 5], ['comecar de novo', 5], ['zerar', 4], ['apagar o cofre', 5]],
    resposta: () => ({ texto: ['**Abandonar o cofre** apaga tudo dele (chaves, backup, pontos, senha de acesso) e libera a conta para um cofre novo, vazio.', '⚠️ Pede a senha da conta + um código por e-mail e **não dá para desfazer**. Se ainda tem o dispositivo, talvez criar uma chave de contingência nova resolva.'], acoes: [{ rotulo: 'Ver opções', para: '/perdi-ccp' }], humor: 'alerta' }),
  },

  // ======= dispositivo físico =======
  {
    id: 'fisico',
    titulo: 'Como funciona o Krypta físico?',
    termos: [['dispositivo fisico', 6], ['hardware', 4], ['esp32', 5], ['nfc', 4], ['cartao nfc', 5], ['comprar dispositivo', 5], ['chaveiro', 3], ['krypta fisico', 6]],
    resposta: (p, ctx) => {
      if (!p.pro) return proNao('O dispositivo físico Krypta', ctx);
      const textos: Record<PerfilAjuda['dispositivoFisico'], string> = {
        nenhum: 'Você ainda não tem um. Ele custa R$ 599 em **Produtos**.',
        'em-transporte': 'O seu está **a caminho**! 📦 Quando chegar, toque em **"Recebi"** em Minhas compras.',
        disponivel: 'O seu chegou e está **pronto para parear**: em Meu Krypta, escolha o número de série dele.',
        pareado: 'Seu cofre já está **no dispositivo físico**. Aproxime o cartão NFC para entrar. 💳',
      };
      return {
        texto: ['O Krypta físico guarda a chave do cofre num chip e só libera com o **cartão NFC** do dono.', textos[p.dispositivoFisico]],
        acoes: [{ rotulo: p.dispositivoFisico === 'nenhum' ? 'Produtos' : 'Minhas compras', para: p.dispositivoFisico === 'nenhum' ? '/products' : '/compras' }],
        humor: 'ok',
      };
    },
  },
  {
    id: 'compras',
    titulo: 'Onde vejo minhas compras?',
    termos: [['compras', 4], ['pedido', 4], ['rastreio', 4], ['entrega', 4], ['chegou', 3], ['recebi meu', 4]],
    resposta: () => ({ texto: 'Em **Minhas compras** você vê a assinatura e os dispositivos, acompanha a entrega e confirma **"Recebi"**. 📦', acoes: [{ rotulo: 'Minhas compras', para: '/compras' }], humor: 'ok' }),
  },

  // ======= planos =======
  {
    id: 'planos',
    titulo: 'Qual a diferença entre Free e Pro?',
    termos: [['diferenca', 3], ['free', 3], ['gratis', 3], ['plano', 3], ['planos', 3], ['pro', 2], ['preco', 4], ['quanto custa', 5], ['vale a pena', 3]],
    paginas: ['/plans', '/services'],
    resposta: (p) => {
      const uso = p.onboarding?.usos ?? [];
      const quer = uso.includes('heranca') || uso.includes('familia') || p.onboarding?.nivel === 'maximo' || p.onboarding?.nivel === 'avancado' || (p.onboarding?.dispositivos ?? []).includes('multiplos');
      return {
        texto: [
          '**Free:** cofre cifrado com senha, cofre em outros aparelhos com senha, dispositivo de software, Login/Wi-Fi/Nota, 2 pontos de restauração.\n**Pro (R$ 25/mês ou R$ 225/ano):** tudo do Free + PIN de 6 dígitos e digital no celular, todos os tipos e campos, 20 pontos, Kill Switch, herança digital, alertas de acesso e o dispositivo físico.',
          p.logado ? (p.pro ? 'Você já está no **Pro**. 💜' : !p.pro && quer ? 'Pelas suas respostas no questionário (herança, família ou vários aparelhos), o **Pro** combina com você. Quer conferir comigo?' : 'Quer que eu te ajude a decidir?') : 'Quer que eu te ajude a decidir?',
        ],
        opcoes: p.pro ? undefined : simNao({ resposta: escolherPlano }, undefined, ['Me ajuda a decidir', 'Não precisa']),
        acoes: p.pro ? [] : [{ rotulo: 'Ver planos', para: '/plans' }],
        humor: 'pensando',
      };
    },
  },
  {
    id: 'escolher',
    titulo: 'Me ajuda a escolher o plano',
    termos: [['me ajuda a escolher', 7], ['qual plano', 5], ['qual plano escolher', 7], ['qual devo', 4], ['qual e melhor', 4], ['recomenda', 4]],
    resposta: escolherPlano,
  },
  {
    id: 'cancelar',
    titulo: 'Como cancelo o Pro?',
    termos: [['cancelar', 5], ['cancelamento', 5], ['desassinar', 5], ['voltar para o free', 5]],
    resposta: (p) =>
      p.pro
        ? { texto: ['Em **Configurações → Plano → Cancelar assinatura** (pede a senha da conta).', 'Você volta ao Free: os recursos Pro param, mas o cofre e as chaves continuam seus.'], acoes: [{ rotulo: 'Configurações', para: '/settings' }], humor: 'triste' }
        : { texto: 'Você está no **Free**, então não há assinatura para cancelar. 🙂', humor: 'ok' },
  },

  // ======= aplicativos =======
  {
    id: 'celular',
    titulo: 'Tem app para celular?',
    termos: [['app', 3], ['aplicativo', 4], ['celular', 3], ['android', 4], ['iphone', 4], ['instalar', 4], ['pwa', 4], ['tela inicial', 4]],
    resposta: (p) => ({
      texto:
        p.plataforma === 'celular'
          ? ['Você já está no modo celular! 📱', 'Para virar app: **Android** (Chrome) → menu ⋮ → **Instalar app**. **iPhone** (Safari) → **Compartilhar → Adicionar à Tela de Início**. Ele se atualiza sozinho.']
          : 'Tem sim! Abra o site no celular e vá em **Aplicações → Instalar no celular** (no iPhone: Compartilhar → Adicionar à Tela de Início). Ele se atualiza sozinho. 📱',
      acoes: [{ rotulo: 'Aplicações', para: '/aplicacoes' }],
      humor: 'oi',
    }),
  },
  {
    id: 'windows',
    titulo: 'Tem app para Windows?',
    termos: [['windows', 5], ['computador', 3], ['pc', 3], ['exe', 5], ['desktop', 4], ['baixar', 3], ['download', 3]],
    resposta: (p) => ({
      texto: p.plataforma === 'windows' ? 'Você já está no **app do Windows**! 💻 Versões novas aparecem em Aplicações: baixe e instale por cima.' : 'Tem! Em **Aplicações → Baixar para Windows** sai o `Krypta-Setup.exe`. Instale e entre com a mesma conta. 💻',
      acoes: [{ rotulo: 'Aplicações', para: '/aplicacoes' }],
      humor: 'oi',
    }),
  },
  {
    id: 'modo',
    titulo: 'Como troco o modo celular/site?',
    termos: [['modo mobile', 5], ['modo web', 5], ['versao do site', 4], ['trocar modo', 5], ['layout', 3]],
    resposta: () => ({ texto: 'Em **Configurações** tem **Modo do aplicativo** (automático, celular ou site). Vale só para este aparelho.', acoes: [{ rotulo: 'Configurações', para: '/settings' }], humor: 'ok' }),
  },
  {
    id: 'lento',
    titulo: 'Está lento ou não carrega',
    termos: [['lento', 5], ['demorando', 5], ['demora', 4], ['nao carrega', 6], ['carregando', 4], ['fora do ar', 6], ['servidor', 3], ['offline', 4], ['sem internet', 5]],
    resposta: (_p, ctx) => ({
      texto: [ctx.frustrado ? 'Poxa, desculpa a demora! 😕' : 'Entendi.', 'Se o Krypta ficou um tempo sem uso, o servidor "acorda" no primeiro acesso e pode levar **até 1 minuto**. Depois fica rápido.', 'Se continuar: confira a internet, recarregue a página e, se não resolver, me conta qual tela trava.'],
      sugestoes: ['Falar com uma pessoa'],
      humor: 'triste',
    }),
  },

  // ======= conta =======
  {
    id: 'seguranca',
    titulo: 'Vocês conseguem ver minhas senhas?',
    termos: [['ver minhas senhas', 6], ['voces veem', 5], ['voces conseguem ver', 6], ['seguro', 3], ['seguranca', 3], ['zero knowledge', 5], ['criptografia', 4], ['vazamento', 4], ['hacker', 4], ['confiavel', 3], ['confiar', 3]],
    resposta: () => ({
      texto: ['**Não**, e isso é de propósito. 🔐', 'O cofre é cifrado (AES-256) **no seu aparelho** antes de sair. O servidor guarda só um backup que não consegue abrir, e as chaves (contingência, herança, PIN) **nunca** são enviadas. Nem quem invadir o servidor lê seu cofre.'],
      sugestoes: ['Minha conta está segura?', 'O que é o PIN do cofre?'],
      humor: 'ok',
    }),
  },
  {
    id: 'senha-conta',
    titulo: 'Esqueci a senha da conta',
    termos: [['esqueci a senha', 5], ['esqueci minha senha', 5], ['recuperar senha', 5], ['senha da conta', 4], ['nao consigo entrar', 5], ['trocar senha', 4], ['login', 2]],
    resposta: (p) =>
      p.logado
        ? { texto: 'Para **trocar** a senha da conta: **Configurações → Segurança → Trocar senha**. Lembrando: a senha da conta é diferente do PIN do cofre. 😉', acoes: [{ rotulo: 'Configurações', para: '/settings' }], humor: 'ok' }
        : { texto: ['Na tela de entrar, toque em **Esqueci minha senha**: chega um código no seu e-mail.', 'Seu cofre não muda com isso (ele abre pelo dispositivo + PIN).'], acoes: [{ rotulo: 'Recuperar senha', para: '/recover' }], humor: 'ok' },
  },
  {
    id: 'sessoes',
    titulo: 'Onde minha conta está aberta?',
    termos: [['sessoes', 5], ['sair de tudo', 5], ['outros lugares', 4], ['quem acessou', 5], ['acesso suspeito', 5], ['alguem entrou', 5]],
    resposta: (p) => ({
      texto: [`Em **Configurações → Onde estou conectado** você vê cada aparelho (site, celular, app) e pode **sair de todos** de uma vez.`, p.pro ? 'No Pro, os **alertas** mostram cada abertura e edição do cofre e chegam por e-mail.' : 'Os alertas de acesso por e-mail são do Pro.'],
      acoes: [
        { rotulo: 'Configurações', para: '/settings' },
        { rotulo: 'Perfil', para: '/profile' },
      ],
      humor: 'alerta',
    }),
  },
  {
    id: 'notificacoes',
    titulo: 'Como ligo as notificações?',
    termos: [['notificacao', 5], ['notificacoes', 5], ['alerta', 3], ['avisos', 4], ['nao recebo aviso', 6], ['sino', 3]],
    resposta: (p) => ({
      texto: [
        `As notificações avisam de novos acessos, cofre aberto em outro aparelho, herança e Kill Switch${p.plataforma === 'windows' ? ', e aparecem no canto do Windows' : ''}. 🔔`,
        p.plataforma === 'celular' ? 'Ligue em **Ajustes → Notificações neste aparelho** e permita quando o celular perguntar.' : 'Ligue em **Configurações → Notificações** e permita quando o navegador perguntar. Se bloqueou sem querer, libere nas permissões do site (cadeado ao lado do endereço).',
      ],
      acoes: [{ rotulo: p.plataforma === 'celular' ? 'Ajustes' : 'Configurações', para: '/settings' }],
      humor: 'ok',
    }),
  },
  {
    id: 'foto',
    titulo: 'Como coloco foto no perfil?',
    termos: [['foto', 5], ['avatar', 5], ['imagem do perfil', 5], ['foto de perfil', 6], ['mudar cor', 3]],
    resposta: () => ({
      texto: ['No **Perfil**, toque na sua foto. 📸', 'Você escolhe um dos **12 Codys** (eu em várias versões! 😄) e a **cor do fundo**, ou envia uma foto sua. Também dá para voltar ao perfil anônimo.'],
      acoes: [{ rotulo: 'Ir para o Perfil', para: '/profile' }],
      humor: 'feliz',
    }),
  },
  {
    id: 'excluir',
    titulo: 'Como excluo minha conta?',
    termos: [['excluir conta', 6], ['apagar conta', 6], ['deletar conta', 6], ['encerrar conta', 6], ['inatividade', 4], ['365 dias', 4]],
    resposta: () => ({
      texto: ['Em **Configurações → Excluir conta** (pede a senha). Poxa, espero que não seja por algo que eu possa ajudar! 😢', 'Também: contas com cofre **sem uso por 365 dias** são excluídas, com avisos por e-mail 30 dias, 15 dias e 48 h antes.'],
      acoes: [{ rotulo: 'Configurações', para: '/settings' }],
      humor: 'triste',
    }),
  },
  {
    id: 'email',
    titulo: 'O e-mail com o código não chegou',
    termos: [['nao chegou', 5], ['email', 3], ['e-mail', 3], ['codigo', 2], ['spam', 4]],
    resposta: () => ({ texto: ['Confira o **spam/lixo eletrônico** e espere uns 2 minutos. 📬', 'Ainda nada? Peça o código de novo. Se continuar, fale com a equipe pelo Contato.'], acoes: [{ rotulo: 'Contato', para: '/contact' }], humor: 'pensando' }),
  },
  {
    id: 'espaco',
    titulo: 'Quanto cabe no meu cofre?',
    termos: [['espaco', 4], ['limite', 4], ['cabe', 4], ['armazenamento', 4], ['cheio', 4]],
    resposta: (p) => ({ texto: `Seu plano guarda até **${p.pro ? '1 MB' : '64 KB'}** de cofre cifrado, ou seja, ${p.pro ? 'milhares' : 'centenas'} de chaves. A barra em Meu Krypta mostra o uso.`, acoes: [{ rotulo: 'Meu Krypta', para: '/device' }], humor: 'ok' }),
  },
  {
    id: 'contato',
    titulo: 'Falar com uma pessoa',
    termos: [['suporte', 5], ['atendente', 5], ['humano', 5], ['falar com uma pessoa', 7], ['pessoa', 3], ['contato', 4], ['reclamar', 3], ['bug', 4]],
    resposta: () => ({ texto: ['Claro! Pelo **Contato** a mensagem chega na equipe e a resposta vem no seu e-mail. ✉️', 'Conta o que aconteceu e em qual tela, que ajuda a resolver mais rápido.'], acoes: [{ rotulo: 'Falar com a equipe', para: '/contact' }], humor: 'oi' }),
  },
];

export function porId(id: string): Assunto {
  return ASSUNTOS.find((a) => a.id === id)!;
}

/** Perguntas que fazem sentido em cada página (botões iniciais) */
export function sugestoesDaPagina(p: PerfilAjuda): string[] {
  const pg = p.pagina;
  if (pg.startsWith('/device')) return p.situacao === 'sem-cofre' ? ['O que é parear?', 'O que é a chave de contingência?', 'O que é o PIN do cofre?'] : ['Minha conta está segura?', 'Perdi meu dispositivo', 'Como funciona a herança digital?'];
  if (pg.startsWith('/cofre/chaves') || pg.startsWith('/cofre/nova-chave')) return ['Gera uma senha forte', 'Como guardo uma senha?', 'Esqueci o PIN do cofre'];
  if (pg.startsWith('/cofre/acesso')) return ['Como ligo a biometria?', 'Como abro o cofre em outro aparelho?', 'Esqueci o PIN do cofre'];
  if (pg.startsWith('/cofre/pontos')) return ['O que é ponto de restauração?', 'O que é a chave de contingência?'];
  if (pg.startsWith('/plans') || pg.startsWith('/services') || pg.startsWith('/checkout')) return ['Me ajuda a escolher o plano', 'Qual a diferença entre Free e Pro?', 'Como cancelo o Pro?'];
  if (pg.startsWith('/aplicacoes')) return ['Tem app para celular?', 'Tem app para Windows?'];
  if (pg.startsWith('/profile') || pg.startsWith('/settings')) return ['Como coloco foto no perfil?', 'Como ligo as notificações?', 'Onde minha conta está aberta?'];
  if (pg.startsWith('/heranca')) return ['Recebi um código de herança', 'Como funciona a herança digital?'];
  if (!p.logado) return ['Como funciona o Krypta?', 'Vocês conseguem ver minhas senhas?', 'Me ajuda a escolher o plano'];
  return ['O que eu faço agora?', 'Minha conta está segura?', 'O que tem de novo?'];
}
