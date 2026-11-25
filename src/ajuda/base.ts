// src/ajuda/base.ts
// ============================================================
// KRYP — base de conhecimento (perguntas frequentes)
//
// Cada assunto tem:
//   • termos  → palavras/frases que indicam o assunto (com peso)
//   • resposta(perfil) → o texto muda conforme QUEM pergunta:
//       plano, situação do cofre, trava, aparelho, herança, compras,
//       respostas do questionário e onde a pessoa está.
//   • ações   → botões que levam direto para a tela certa
// ============================================================
import type { PerfilAjuda } from './contexto';

export interface Acao {
  rotulo: string;
  para: string;
}
export interface Resposta {
  texto: string;
  acoes?: Acao[];
  sugestoes?: string[];
}
export interface Assunto {
  id: string;
  titulo: string; // aparece como sugestão
  termos: [string, number][];
  /** páginas onde este assunto é mais provável (ganha um pouco de peso) */
  paginas?: string[];
  resposta: (p: PerfilAjuda) => Resposta;
}

const oi = (p: PerfilAjuda) => (p.nome ? `${p.nome}, ` : '');
const proNao = (recurso: string): Resposta => ({
  texto: `${recurso} é um recurso do **Krypta Pro** (R$ 25/mês ou R$ 225/ano). No Free você tem o cofre cifrado, o dispositivo de software, Login/Wi-Fi/Nota e 2 pontos de restauração.`,
  acoes: [{ rotulo: 'Ver o Krypta Pro', para: '/plans' }],
  sugestoes: ['Qual a diferença entre Free e Pro?'],
});

/** O que a pessoa deveria fazer agora, pela situação dela */
export function proximoPasso(p: PerfilAjuda): Resposta {
  if (!p.logado)
    return {
      texto: 'Para começar: **crie sua conta**, depois **pareie um dispositivo** (pode ser este aparelho) e anote a **chave de contingência**. Leva uns 3 minutos.',
      acoes: [
        { rotulo: 'Criar conta', para: '/register' },
        { rotulo: 'Como funciona', para: '/como-funciona' },
      ],
    };
  switch (p.situacao) {
    case 'sem-cofre':
      return {
        texto: `${oi(p)}seu próximo passo é **ativar o cofre**: em Meu Krypta você escolhe o dispositivo, gera a chave de contingência (anote em papel!) e cria o PIN do cofre.`,
        acoes: [{ rotulo: 'Ativar meu cofre', para: '/device' }],
        sugestoes: ['O que é a chave de contingência?', 'O que é parear?'],
      };
    case 'sem-trava':
      return {
        texto: `${oi(p)}falta **proteger o cofre neste aparelho** com um PIN (ou senha). Sem ele, qualquer pessoa com o aparelho veria suas senhas. Depois dá para ligar a biometria.`,
        acoes: [{ rotulo: 'Criar o PIN do cofre', para: '/device' }],
      };
    case 'trancado':
      return {
        texto: `Seu cofre está **trancado** neste aparelho. Digite o PIN${p.biometria ? ' ou use a biometria' : ''} para abrir. Ele tranca sozinho depois de 5 minutos sem uso.`,
        acoes: [{ rotulo: 'Abrir o cofre', para: '/cofre/chaves' }],
        sugestoes: ['Esqueci o PIN do cofre'],
      };
    case 'outro-aparelho':
      return p.pro
        ? {
            texto: p.acessoRemoto
              ? 'Seu cofre está em outro aparelho. Aqui você abre com a **senha de acesso (PIN)** e pode ver e editar tudo.'
              : 'Seu cofre está em outro aparelho e você ainda **não criou a senha de acesso**. Crie com a chave de contingência e abra o cofre aqui.',
            acoes: [{ rotulo: p.acessoRemoto ? 'Abrir com o PIN' : 'Criar a senha de acesso', para: '/cofre/acesso' }],
          }
        : {
            texto: 'Seu cofre está no aparelho onde você pareou. No Free ele abre só lá. Com o Pro, um PIN abre e edita o cofre em qualquer aparelho seu.',
            acoes: [{ rotulo: 'Ver o Krypta Pro', para: '/plans' }],
          };
    case 'bloqueado':
      return {
        texto: 'O **Kill Switch** foi acionado: o dispositivo antigo foi banido. Para voltar a usar, vincule um dispositivo novo com a chave de contingência.',
        acoes: [{ rotulo: 'Vincular dispositivo novo', para: '/device' }],
      };
    case 'recuperacao':
      return { texto: 'Há uma **recuperação em andamento**. Termine-a em Meu Krypta para voltar a usar o cofre.', acoes: [{ rotulo: 'Meu Krypta', para: '/device' }] };
    default: {
      const dicas: string[] = [];
      if ((p.totalChaves ?? 0) === 0) dicas.push('guardar sua **primeira chave**');
      if (!p.biometria) dicas.push('ligar a **biometria** para abrir mais rápido');
      if (p.pro && !p.heranca) dicas.push('ativar a **herança digital**');
      if (p.pro && p.acessoRemoto === false) dicas.push('criar a **senha de acesso** para os outros aparelhos');
      dicas.push('salvar um **ponto de restauração**');
      return {
        texto: `${oi(p)}seu cofre está pronto. Sugestões: ${dicas.slice(0, 3).join(', ')}.`,
        acoes: [
          { rotulo: 'Nova chave', para: '/cofre/nova-chave' },
          { rotulo: 'Minhas chaves', para: '/cofre/chaves' },
        ],
      };
    }
  }
}

export const ASSUNTOS: Assunto[] = [
  // ---------------- conversa ----------------
  {
    id: 'oi',
    titulo: 'Oi!',
    termos: [['oi', 3], ['ola', 3], ['bom dia', 3], ['boa tarde', 3], ['boa noite', 3], ['e ai', 3], ['hello', 2]],
    resposta: (p) => ({
      texto: `Oi${p.nome ? `, ${p.nome}` : ''}! Eu sou o **Kryp**, o robô do Krypta. Posso explicar qualquer tela, te dizer o próximo passo ou te levar até onde precisa.`,
      sugestoes: ['O que eu faço agora?', 'Como funciona o Krypta?'],
    }),
  },
  {
    id: 'obrigado',
    titulo: 'Obrigado',
    termos: [['obrigad', 3], ['valeu', 3], ['agradeco', 3], ['brigad', 3], ['show', 1], ['top', 1]],
    resposta: () => ({ texto: 'Por nada! Se precisar, é só me chamar aqui no canto da tela. 🤖' }),
  },
  {
    id: 'quem',
    titulo: 'Quem é você?',
    termos: [['quem e voce', 4], ['quem voce', 3], ['seu nome', 3], ['voce e uma ia', 3], ['robo', 2], ['bot', 2], ['kryp', 3]],
    resposta: () => ({
      texto: 'Sou o **Kryp**, o assistente do Krypta. Eu olho a situação da sua conta (plano, cofre, aparelho) para responder certo. **Nunca** vejo suas senhas: o cofre é cifrado e nem eu, nem o servidor, conseguimos abrir.',
      sugestoes: ['O que eu faço agora?', 'Vocês conseguem ver minhas senhas?'],
    }),
  },
  // ---------------- começo ----------------
  {
    id: 'proximo',
    titulo: 'O que eu faço agora?',
    termos: [['o que faco', 4], ['proximo passo', 4], ['como comecar', 4], ['comecar', 2], ['primeiro passo', 4], ['por onde', 3], ['perdido', 3], ['nao sei', 2], ['ajuda', 1], ['o que fazer', 4]],
    resposta: proximoPasso,
  },
  {
    id: 'krypta',
    titulo: 'Como funciona o Krypta?',
    termos: [['como funciona', 4], ['o que e o krypta', 5], ['krypta', 1], ['para que serve', 3], ['explica', 2]],
    paginas: ['/', '/como-funciona'],
    resposta: () => ({
      texto:
        'O Krypta é um **cofre de senhas** que cifra tudo **no seu aparelho**. O servidor guarda só um backup que ele mesmo não consegue abrir.\n\n1. Você cria a conta.\n2. **Pareia um dispositivo** (este aparelho ou o Krypta físico com cartão NFC).\n3. Anota a **chave de contingência** (para emergências).\n4. Cria o **PIN do cofre** e guarda suas chaves.',
      acoes: [{ rotulo: 'Como funciona (página)', para: '/como-funciona' }],
      sugestoes: ['O que é parear?', 'O que é a chave de contingência?'],
    }),
  },
  {
    id: 'parear',
    titulo: 'O que é parear?',
    termos: [['parear', 4], ['pareamento', 4], ['ativar cofre', 4], ['ativar o cofre', 4], ['criar cofre', 4], ['dispositivo de software', 3], ['vincular', 2]],
    paginas: ['/device'],
    resposta: (p) =>
      p.situacao === 'sem-cofre' || !p.logado
        ? {
            texto:
              '**Parear** é ligar um dispositivo ao seu cofre. Ele cria uma chave secreta que nunca sai dele e é ela que abre o cofre. Pode ser **este aparelho** (dispositivo de software, Free e Pro) ou o **Krypta físico** (Pro).\n\nNo pareamento você também gera a **chave de contingência** e cria o **PIN do cofre**.',
            acoes: [{ rotulo: 'Parear agora', para: p.logado ? '/device' : '/register' }],
          }
        : {
            texto: `Seu cofre já está pareado${p.situacao === 'outro-aparelho' ? ', mas em outro aparelho' : ' neste aparelho'}. Para trocar de dispositivo (perdeu o antigo), use o **Kill Switch** e vincule um novo com a chave de contingência.`,
            acoes: [{ rotulo: 'Meu Krypta', para: '/device' }],
            sugestoes: ['Perdi meu dispositivo'],
          },
  },
  // ---------------- chaves de emergência ----------------
  {
    id: 'ccp',
    titulo: 'O que é a chave de contingência?',
    termos: [['chave de contingencia', 5], ['contingencia', 4], ['ccp', 5], ['32 caracteres', 3], ['chave de emergencia', 4], ['onde guardo', 2]],
    resposta: () => ({
      texto:
        'A **chave de contingência** é o código de 32 caracteres (8 blocos) que aparece **uma vez** no pareamento. Ela recupera o cofre, troca o dispositivo, aciona o Kill Switch e abre a trava se você esquecer o PIN.\n\nGuarde **em papel**, longe do computador. O Krypta **não** consegue recuperá-la.',
      sugestoes: ['Perdi a chave de contingência', 'Esqueci o PIN do cofre'],
    }),
  },
  {
    id: 'perdi-ccp',
    titulo: 'Perdi a chave de contingência',
    termos: [['perdi a chave de contingencia', 8], ['esqueci a chave de contingencia', 8], ['perdi a chave', 5], ['perdi minha chave', 5], ['esqueci a chave de contingencia', 6], ['perdi a ccp', 6], ['perdi ccp', 5], ['sem a chave', 3]],
    resposta: (p) => ({
      texto:
        p.situacao === 'pronto' || p.situacao === 'trancado'
          ? 'Sem problema: como o dispositivo está com você, dá para **criar uma chave de contingência nova** usando o dispositivo + a senha da conta. A antiga deixa de valer.'
          : 'Se você ainda tem o dispositivo, crie uma **chave nova** com ele + a senha da conta. Se perdeu o dispositivo **e** a chave, a saída é **abandonar o cofre** (senha + código por e-mail) e começar um novo, vazio.',
      acoes: [{ rotulo: 'Perdi minha chave', para: '/perdi-ccp' }],
    }),
  },
  // ---------------- trava do cofre ----------------
  {
    id: 'pin',
    titulo: 'O que é o PIN do cofre?',
    termos: [['pin', 4], ['trava', 4], ['trancado', 4], ['senha do cofre', 5], ['bloqueio do cofre', 4], ['abrir o cofre', 3], ['proteger o cofre', 4]],
    resposta: (p) => ({
      texto:
        `O **PIN do cofre** (ou uma senha maior) tranca o cofre **mesmo no aparelho que pareou**: os dados ficam cifrados no aparelho e só abrem com ele${p.pro ? '. No Pro, o mesmo PIN abre o cofre nos seus outros aparelhos' : ''}.\n\nO cofre tranca sozinho depois de **5 minutos** sem uso, ao recarregar a página e ao sair da conta.` +
        (p.situacao === 'sem-trava' ? '\n\n⚠️ Você ainda **não criou** o PIN neste aparelho.' : ''),
      acoes: [{ rotulo: p.situacao === 'sem-trava' ? 'Criar o PIN' : 'Senha do cofre', para: p.situacao === 'sem-trava' ? '/device' : '/cofre/acesso' }],
      sugestoes: ['Como ligo a biometria?', 'Esqueci o PIN do cofre'],
    }),
  },
  {
    id: 'esqueci-pin',
    titulo: 'Esqueci o PIN do cofre',
    termos: [['esqueci o pin', 6], ['esqueci pin', 6], ['esqueci a senha do cofre', 6], ['pin errado', 4], ['nao lembro o pin', 6], ['muitas tentativas', 3]],
    resposta: () => ({
      texto: 'Na tela do cofre trancado, toque em **"Esqueci o PIN"** e digite a **chave de contingência**. O cofre abre e você cria um PIN novo.\n\nDepois de 5 erros seguidos, o app pede para esperar um pouco antes de tentar de novo.',
      acoes: [{ rotulo: 'Ir para o cofre', para: '/cofre/chaves' }],
    }),
  },
  {
    id: 'biometria',
    titulo: 'Como ligo a biometria?',
    termos: [['biometria', 5], ['digital', 4], ['impressao digital', 5], ['face id', 5], ['rosto', 3], ['windows hello', 5], ['touch id', 5]],
    resposta: (p) => ({
      texto:
        (p.biometria ? 'Sua biometria **já está ligada** neste aparelho. ' : '') +
        'Abra o cofre com o PIN, vá em **Senha do cofre → Ligar biometria** e confirme com a digital, o rosto ou o Windows Hello. Ela fica **neste aparelho**: em cada aparelho você liga de novo.\n\nAlguns navegadores ainda não permitem (o botão avisa). Nesses, use o PIN.',
      acoes: [{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }],
    }),
  },
  {
    id: 'remoto',
    titulo: 'Como abro o cofre em outro aparelho?',
    termos: [['outro aparelho', 5], ['outro dispositivo', 5], ['outro celular', 5], ['outro computador', 5], ['fora de casa', 4], ['senha de acesso', 5], ['acessar de outro', 5], ['trabalho', 2]],
    resposta: (p) =>
      !p.pro
        ? proNao('Abrir e editar o cofre em outros aparelhos')
        : {
            texto: p.acessoRemoto
              ? 'Sua **senha de acesso** já está criada. Em qualquer aparelho, entre na conta e abra **Senha do cofre**: digite o PIN e pronto, dá para ver e editar tudo.'
              : 'Crie a **senha de acesso** (de preferência o mesmo PIN do cofre) com a chave de contingência. Depois, em qualquer aparelho logado, o PIN abre e edita o cofre.',
            acoes: [{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }],
          },
  },
  // ---------------- chaves ----------------
  {
    id: 'nova-chave',
    titulo: 'Como guardo uma senha?',
    termos: [['guardar senha', 5], ['salvar senha', 5], ['adicionar senha', 5], ['nova chave', 5], ['nova senha', 4], ['criar chave', 5], ['cadastrar', 3], ['adicionar', 2], ['salv', 2], ['guard', 2], ['senha', 1.5]],
    paginas: ['/cofre/chaves'],
    resposta: (p) =>
      p.situacao === 'pronto' || (p.situacao === 'outro-aparelho' && p.pro)
        ? {
            texto: 'Toque em **Nova chave**, escolha o tipo (Login, Wi-Fi, Nota' + (p.pro ? ', Cartão, Endereço, Documento...' : '') + '), preencha e salve. O ícone da marca aparece sozinho pelo nome (ex.: "Netflix").',
            acoes: [{ rotulo: 'Nova chave', para: '/cofre/nova-chave' }],
          }
        : proximoPasso(p),
  },
  {
    id: 'editar-chave',
    titulo: 'Como edito ou apago uma chave?',
    termos: [['editar', 4], ['alterar senha', 3], ['mudar senha', 3], ['apagar', 4], ['excluir chave', 5], ['remover', 3], ['deletar', 4]],
    resposta: () => ({
      texto: 'Em **Minhas chaves**, toque na chave: ali tem **Editar** e **Excluir**. Apagou sem querer? Volte a um **ponto de restauração**.',
      acoes: [{ rotulo: 'Minhas chaves', para: '/cofre/chaves' }],
      sugestoes: ['O que é ponto de restauração?'],
    }),
  },
  {
    id: 'campos',
    titulo: 'Posso ter mais campos numa chave?',
    termos: [['mais campos', 5], ['campo extra', 5], ['cartao de credito', 4], ['endereco', 3], ['documento', 3], ['tipo de chave', 4], ['campos', 3]],
    resposta: (p) =>
      p.pro
        ? { texto: 'Sim! No Pro você usa todos os tipos (Cartão, Endereço, Documento, Personalizado) e **Adicionar campo** quantas vezes quiser. Cada campo pode ser secreto.', acoes: [{ rotulo: 'Nova chave', para: '/cofre/nova-chave' }] }
        : proNao('Cartão, Endereço, Documento e campos extras'),
  },
  {
    id: 'pontos',
    titulo: 'O que é ponto de restauração?',
    termos: [['ponto de restauracao', 6], ['restaurar', 4], ['backup', 3], ['voltar atras', 4], ['desfazer', 4], ['salvar estado', 5], ['recuperar chave apagada', 5]],
    resposta: (p) => ({
      texto: `É uma **cópia cifrada** do cofre num momento. Se algo der errado, você volta a ela. Salvar, restaurar e apagar pedem a **chave de contingência**. Seu plano guarda **${p.pro ? '20' : '2'}** pontos, e antes de restaurar o Krypta salva o estado atual (dá para desfazer).`,
      acoes: [{ rotulo: 'Pontos de restauração', para: '/cofre/pontos' }],
    }),
  },
  {
    id: 'conflito',
    titulo: 'O cofre foi alterado em outro aparelho',
    termos: [['alterado em outro aparelho', 6], ['conflito', 4], ['sincron', 4], ['nao atualizou', 4], ['nao aparece', 3]],
    resposta: () => ({ texto: 'Quando outro aparelho muda o cofre ao mesmo tempo, o Krypta **não sobrescreve** nada: ele atualiza a lista e pede para você salvar de novo. Confira e salve.' }),
  },
  // ---------------- emergência ----------------
  {
    id: 'kill',
    titulo: 'Perdi meu dispositivo',
    termos: [['perdi o dispositivo', 6], ['perdi meu celular', 5], ['roubaram', 5], ['roubado', 5], ['furtado', 5], ['kill switch', 6], ['bloquear dispositivo', 5], ['perdi o krypta', 5]],
    resposta: (p) =>
      p.pro
        ? {
            texto: 'Use o **Kill Switch** em Meu Krypta: com a chave de contingência, o dispositivo perdido é **banido para sempre**. Depois vincule um novo e o cofre volta do backup cifrado.\n\nMesmo sem o Kill Switch, o ladrão ainda precisaria do **PIN do cofre**.',
            acoes: [{ rotulo: 'Kill Switch', para: '/device#kill' }],
          }
        : { ...proNao('O Kill Switch'), texto: 'O **Kill Switch** (banir o dispositivo perdido) é do **Krypta Pro**. No Free, o cofre do aparelho perdido continua protegido pelo **PIN do cofre**. Se não tiver mais acesso, dá para **abandonar o cofre** e começar outro.' },
  },
  {
    id: 'heranca',
    titulo: 'Como funciona a herança digital?',
    termos: [['heranca', 5], ['herdeiro', 5], ['codigo de heranca', 6], ['kit de heranca', 6], ['falecimento', 4], ['morrer', 4], ['familia', 2]],
    resposta: (p) => {
      if (!p.pro) return proNao('A herança digital');
      if (p.situacao === 'sem-cofre') return { texto: 'A herança aparece **depois que o cofre é ativado**: primeiro pareie o dispositivo, depois gere o código de herança.', acoes: [{ rotulo: 'Ativar meu cofre', para: '/device' }] };
      return {
        texto: p.heranca
          ? 'Sua **herança está ativa**. O herdeiro usa o **código de herança** na página de resgate e recebe o cofre. Você é avisado por e-mail.'
          : 'Gere o **código de herança** em Meu Krypta e entregue ao herdeiro (em papel ou arquivo). Se algo acontecer, ele resgata o cofre sem precisar da sua senha.',
        acoes: [{ rotulo: p.heranca ? 'Ver herança' : 'Gerar código de herança', para: '/device#heranca' }],
        sugestoes: ['Recebi um código de herança'],
      };
    },
  },
  {
    id: 'resgatar',
    titulo: 'Recebi um código de herança',
    termos: [['recebi um codigo', 6], ['recebi o codigo', 6], ['resgatar', 5], ['resgate', 5], ['sou herdeiro', 6]],
    resposta: () => ({ texto: 'Abra a página de **resgate de herança** e cole o código (ou abra o link que veio junto). Não precisa ter conta antes.', acoes: [{ rotulo: 'Resgatar herança', para: '/heranca' }] }),
  },
  {
    id: 'abandonar',
    titulo: 'Quero começar um cofre novo',
    termos: [['abandonar', 5], ['cofre novo', 5], ['comecar de novo', 5], ['zerar', 4], ['apagar o cofre', 5]],
    resposta: () => ({ texto: '**Abandonar o cofre** apaga tudo dele (chaves, backup, pontos, senha de acesso) e libera a conta para um cofre novo, vazio. Pede a senha da conta + um código por e-mail. Não dá para desfazer.', acoes: [{ rotulo: 'Perdi minha chave / abandonar', para: '/perdi-ccp' }] }),
  },
  // ---------------- dispositivo físico ----------------
  {
    id: 'fisico',
    titulo: 'Como funciona o Krypta físico?',
    termos: [['dispositivo fisico', 6], ['hardware', 4], ['esp32', 5], ['nfc', 4], ['cartao nfc', 5], ['comprar dispositivo', 5], ['chaveiro', 3], ['krypta fisico', 6]],
    resposta: (p) => {
      if (!p.pro) return proNao('O dispositivo físico Krypta');
      const textos: Record<PerfilAjuda['dispositivoFisico'], string> = {
        nenhum: 'Você ainda não comprou. Ele custa R$ 599 em **Produtos**.',
        'em-transporte': 'Seu dispositivo está **a caminho**. Quando chegar, toque em **"Recebi"** em Minhas compras.',
        disponivel: 'Seu dispositivo chegou e está **pronto para parear**: em Meu Krypta, escolha o número de série dele.',
        pareado: 'Seu cofre já está **no dispositivo físico**. Aproxime o cartão NFC para entrar.',
      };
      const st = textos[p.dispositivoFisico];
      return {
        texto: `O Krypta físico guarda a chave do cofre num chip e só libera com o **cartão NFC** do dono. ${st}`,
        acoes: [{ rotulo: p.dispositivoFisico === 'nenhum' ? 'Produtos' : 'Minhas compras', para: p.dispositivoFisico === 'nenhum' ? '/products' : '/compras' }],
      };
    },
  },
  {
    id: 'compras',
    titulo: 'Onde vejo minhas compras?',
    termos: [['compras', 4], ['pedido', 4], ['rastreio', 4], ['entrega', 4], ['chegou', 3], ['recebi meu', 4]],
    resposta: () => ({ texto: 'Em **Minhas compras** você vê a assinatura e os dispositivos, acompanha a entrega e confirma **"Recebi"**.', acoes: [{ rotulo: 'Minhas compras', para: '/compras' }] }),
  },
  // ---------------- planos ----------------
  {
    id: 'planos',
    titulo: 'Qual a diferença entre Free e Pro?',
    termos: [['diferenca', 3], ['free', 3], ['gratis', 3], ['plano', 3], ['planos', 3], ['pro', 2], ['preco', 4], ['quanto custa', 5], ['vale a pena', 3]],
    paginas: ['/plans', '/services'],
    resposta: (p) => {
      const uso = p.onboarding?.usos ?? [];
      const quer = uso.includes('heranca') || uso.includes('familia') || p.onboarding?.nivel === 'maximo' || p.onboarding?.nivel === 'avancado' || (p.onboarding?.dispositivos ?? []).includes('multiplos');
      return {
        texto:
          '**Free:** cofre cifrado, dispositivo de software, Login/Wi-Fi/Nota, 2 pontos de restauração, 64 KB.\n**Pro (R$ 25/mês ou R$ 225/ano):** tudo do Free + cofre em qualquer aparelho com PIN, todos os tipos e campos extras, 20 pontos, Kill Switch, herança digital, alertas de acesso, dispositivo físico e 1 MB.' +
          (p.logado ? `\n\nVocê está no **${p.pro ? 'Pro' : 'Free'}**.` : '') +
          (!p.pro && quer ? ' Pelas suas respostas no questionário (herança, família ou vários aparelhos), o **Pro** combina mais com você.' : ''),
        acoes: p.pro ? [] : [{ rotulo: 'Ver planos', para: '/plans' }],
      };
    },
  },
  {
    id: 'cancelar',
    titulo: 'Como cancelo o Pro?',
    termos: [['cancelar', 5], ['cancelamento', 5], ['desassinar', 5], ['voltar para o free', 5]],
    resposta: (p) =>
      p.pro
        ? { texto: 'Em **Configurações → Plano → Cancelar assinatura** (pede a senha da conta). Você volta ao Free: os recursos Pro param, mas o cofre continua seu.', acoes: [{ rotulo: 'Configurações', para: '/settings' }] }
        : { texto: 'Você está no **Free**, não há assinatura para cancelar.' },
  },
  // ---------------- aplicativos ----------------
  {
    id: 'celular',
    titulo: 'Tem app para celular?',
    termos: [['app', 3], ['aplicativo', 4], ['celular', 3], ['android', 4], ['iphone', 4], ['instalar', 4], ['pwa', 4], ['tela inicial', 4]],
    resposta: (p) => ({
      texto:
        p.plataforma === 'celular'
          ? 'Você já está no modo celular! Para virar app: **Android** (Chrome) → menu ⋮ → **Instalar app**; **iPhone** (Safari) → **Compartilhar → Adicionar à Tela de Início**. Ele se atualiza sozinho.'
          : 'Sim: abra o site no celular e vá em **Aplicações → Instalar no celular** (iPhone: Compartilhar → Adicionar à Tela de Início). Ele se atualiza sozinho.',
      acoes: [{ rotulo: 'Aplicações', para: '/aplicacoes' }],
    }),
  },
  {
    id: 'windows',
    titulo: 'Tem app para Windows?',
    termos: [['windows', 5], ['computador', 3], ['pc', 3], ['exe', 5], ['desktop', 4], ['baixar', 3], ['download', 3]],
    resposta: (p) => ({
      texto: p.plataforma === 'windows' ? 'Você já está no **app do Windows**! Versões novas aparecem na página Aplicações: baixe e instale por cima.' : 'Sim: em **Aplicações → Baixar para Windows** sai o `Krypta-Setup.exe`. Instale e entre com a mesma conta.',
      acoes: [{ rotulo: 'Aplicações', para: '/aplicacoes' }],
    }),
  },
  {
    id: 'modo',
    titulo: 'Como troco o modo celular/site?',
    termos: [['modo mobile', 5], ['modo web', 5], ['versao do site', 4], ['trocar modo', 5], ['layout', 3]],
    resposta: () => ({ texto: 'Em **Configurações** tem a opção **Modo do aplicativo** (automático, celular ou site). A escolha vale só para este aparelho.', acoes: [{ rotulo: 'Configurações', para: '/settings' }] }),
  },
  // ---------------- conta ----------------
  {
    id: 'seguranca',
    titulo: 'Vocês conseguem ver minhas senhas?',
    termos: [['ver minhas senhas', 6], ['voces veem', 5], ['seguro', 3], ['seguranca', 3], ['zero knowledge', 5], ['criptografia', 4], ['vazamento', 4], ['hacker', 4], ['confiavel', 3]],
    resposta: () => ({
      texto: '**Não.** O cofre é cifrado (AES-256) **no seu aparelho** antes de sair. O servidor guarda só um backup que não consegue abrir, e as chaves (contingência, herança, PIN) **nunca** são enviadas. Nem quem invadir o servidor lê seu cofre.',
      sugestoes: ['O que é o PIN do cofre?'],
    }),
  },
  {
    id: 'senha-conta',
    titulo: 'Esqueci a senha da conta',
    termos: [['esqueci a senha', 5], ['esqueci minha senha', 5], ['recuperar senha', 5], ['senha da conta', 4], ['nao consigo entrar', 4], ['login', 2]],
    resposta: (p) =>
      p.logado
        ? { texto: 'Para **trocar** a senha da conta: **Configurações → Segurança → Trocar senha**. A senha da conta é diferente do PIN do cofre.', acoes: [{ rotulo: 'Configurações', para: '/settings' }] }
        : { texto: 'Na tela de entrar, toque em **Esqueci minha senha**: chega um código no seu e-mail. Seu cofre não muda (ele abre pelo dispositivo + PIN).', acoes: [{ rotulo: 'Recuperar senha', para: '/recover' }] },
  },
  {
    id: 'sessoes',
    titulo: 'Onde minha conta está aberta?',
    termos: [['sessoes', 5], ['sair de tudo', 5], ['outros lugares', 4], ['quem acessou', 5], ['acesso suspeito', 5], ['alerta', 3], ['notificacao', 3], ['notificacoes', 3]],
    resposta: (p) => ({
      texto: `Em **Configurações → Onde estou conectado** você vê cada aparelho (site, celular, app) e pode **sair de todos**. ${p.pro ? 'No Pro, os **alertas** mostram cada abertura e edição do cofre e chegam por e-mail.' : 'Os alertas de acesso por e-mail são do Pro.'}`,
      acoes: [
        { rotulo: 'Configurações', para: '/settings' },
        { rotulo: 'Perfil', para: '/profile' },
      ],
    }),
  },
  {
    id: 'foto',
    titulo: 'Como coloco foto no perfil?',
    termos: [['foto', 5], ['avatar', 5], ['imagem do perfil', 5], ['foto de perfil', 6]],
    resposta: () => ({ texto: 'No **Perfil**, toque na sua foto (ou no ícone) e escolha uma imagem. É opcional; ela aparece no menu e ajuda o herdeiro a reconhecer de quem é o cofre.', acoes: [{ rotulo: 'Perfil', para: '/profile' }] }),
  },
  {
    id: 'excluir',
    titulo: 'Como excluo minha conta?',
    termos: [['excluir conta', 6], ['apagar conta', 6], ['deletar conta', 6], ['encerrar conta', 6], ['inatividade', 4], ['365 dias', 4]],
    resposta: () => ({
      texto: 'Em **Configurações → Excluir conta** (pede a senha). Também: contas com cofre **sem uso por 365 dias** são excluídas, com avisos por e-mail 30 dias, 15 dias e 48 h antes.',
      acoes: [{ rotulo: 'Configurações', para: '/settings' }],
    }),
  },
  {
    id: 'email',
    titulo: 'O e-mail com o código não chegou',
    termos: [['nao chegou', 5], ['email', 3], ['e-mail', 3], ['codigo', 2], ['spam', 4]],
    resposta: () => ({ texto: 'Confira o **spam/lixo eletrônico** e espere 2 minutos. Ainda nada? Peça o código de novo. Se continuar, fale com o suporte pelo Contato.', acoes: [{ rotulo: 'Contato', para: '/contact' }] }),
  },
  {
    id: 'espaco',
    titulo: 'Quanto cabe no meu cofre?',
    termos: [['espaco', 4], ['limite', 4], ['cabe', 4], ['armazenamento', 4], ['cheio', 4]],
    resposta: (p) => ({ texto: `Seu plano guarda até **${p.pro ? '1 MB' : '64 KB'}** de cofre cifrado — ${p.pro ? 'milhares' : 'centenas'} de chaves. A barra em Meu Krypta mostra o uso.`, acoes: [{ rotulo: 'Meu Krypta', para: '/device' }] }),
  },
  {
    id: 'contato',
    titulo: 'Falar com uma pessoa',
    termos: [['suporte', 5], ['atendente', 5], ['humano', 5], ['pessoa', 3], ['contato', 4], ['reclamar', 3], ['bug', 4], ['erro', 2]],
    resposta: () => ({ texto: 'Fale com a equipe pelo **Contato**: a mensagem chega por e-mail e a resposta vem para o seu. Conte o que aconteceu e em qual tela.', acoes: [{ rotulo: 'Contato', para: '/contact' }] }),
  },
];

/** Perguntas que fazem sentido em cada página (chips iniciais) */
export function sugestoesDaPagina(p: PerfilAjuda): string[] {
  const pg = p.pagina;
  if (pg.startsWith('/device')) return p.situacao === 'sem-cofre' ? ['O que é parear?', 'O que é a chave de contingência?', 'O que é o PIN do cofre?'] : ['O que eu faço agora?', 'Perdi meu dispositivo', 'Como funciona a herança digital?'];
  if (pg.startsWith('/cofre/chaves') || pg.startsWith('/cofre/nova-chave')) return ['Como guardo uma senha?', 'Posso ter mais campos numa chave?', 'Esqueci o PIN do cofre'];
  if (pg.startsWith('/cofre/acesso')) return ['Como ligo a biometria?', 'Como abro o cofre em outro aparelho?', 'Esqueci o PIN do cofre'];
  if (pg.startsWith('/cofre/pontos')) return ['O que é ponto de restauração?', 'O que é a chave de contingência?'];
  if (pg.startsWith('/plans') || pg.startsWith('/services') || pg.startsWith('/checkout')) return ['Qual a diferença entre Free e Pro?', 'Como cancelo o Pro?', 'Como funciona o Krypta físico?'];
  if (pg.startsWith('/aplicacoes')) return ['Tem app para celular?', 'Tem app para Windows?'];
  if (pg.startsWith('/profile') || pg.startsWith('/settings')) return ['Como coloco foto no perfil?', 'Onde minha conta está aberta?', 'Como excluo minha conta?'];
  if (pg.startsWith('/heranca')) return ['Recebi um código de herança', 'Como funciona a herança digital?'];
  if (!p.logado) return ['Como funciona o Krypta?', 'Vocês conseguem ver minhas senhas?', 'Qual a diferença entre Free e Pro?'];
  return ['O que eu faço agora?', 'Como guardo uma senha?', 'Vocês conseguem ver minhas senhas?'];
}
