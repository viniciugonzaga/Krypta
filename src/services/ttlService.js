const ttlRepository = require('../repositories/ttlRepository');
const notificacaoService = require('./notificacaoService');

const DIAS_PRAZO = 365;      // RN11
const DIAS_JANELA_AVISO = 30;

// Em ordem crescente de urgência invertida: o primeiro que casa é o mais urgente.
const NIVEIS = [
  { nivel: 'H48', diasRestantes: 2 },
  { nivel: 'D15', diasRestantes: 15 },
  { nivel: 'D30', diasRestantes: 30 },
];

// notificador injetável: o teste usa um falso, produção usa o notificacaoService.
const executarVarredura = async ({ notificador = notificacaoService } = {}) => {
  const resumo = { avisosEnviados: 0, avisosPendentes: 0, excluidas: 0 };

  const candidatas = await ttlRepository.listarCandidatas({
    diasPrazo: DIAS_PRAZO,
    diasAviso: DIAS_JANELA_AVISO,
  });

  for (const conta of candidatas) {
    const restantes = DIAS_PRAZO - conta.dias_inativos;

    // Só o nível mais urgente já vencido. Se já foi enviado, nada a fazer.
    const devido = NIVEIS.find((n) => restantes <= n.diasRestantes);
    if (!devido || conta.niveis_enviados.includes(devido.nivel)) continue;

    let enviado = false;
    try {
      enviado = await notificador.enviarAvisoInatividade({
        contaId: conta.id,
        email: conta.email,
        nivel: devido.nivel,
        diasRestantes: Math.max(restantes, 0),
      });
    } catch (erro) {
      console.error(`TTL: falha ao enviar aviso ${devido.nivel} (conta ${conta.id}):`, erro.message);
    }

    // Aviso só conta como enviado se o notificador confirmou.
    if (!enviado) {
      resumo.avisosPendentes++;
      continue;
    }
    await ttlRepository.registrarAviso({
      contaId: conta.id,
      nivel: devido.nivel,
      sincronismoRef: conta.sincronismo_ref,
    });
    resumo.avisosEnviados++;
  }

  const excluidas = await ttlRepository.excluirExpiradas({ diasPrazo: DIAS_PRAZO });
  resumo.excluidas = excluidas.length;
  for (const id of excluidas) {
    console.log(`TTL: conta ${id} excluída por inatividade (RN11).`);
  }
  return resumo;
};

module.exports = { executarVarredura };
