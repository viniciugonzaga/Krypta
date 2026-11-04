const ttlService = require('../services/ttlService');

const INTERVALO_MS = 6 * 60 * 60 * 1000;
let rodando = false;

const rodar = async () => {
  if (rodando) return; // sem execuções sobrepostas
  rodando = true;
  try {
    const r = await ttlService.executarVarredura();
    console.log(
      `TTL: ${r.avisosEnviados} aviso(s) enviado(s), ${r.avisosPendentes} pendente(s), ${r.excluidas} conta(s) excluída(s).`
    );
  } catch (erro) {
    console.error('TTL: falha na varredura:', erro);
  } finally {
    rodando = false;
  }
};

// Instância única de API: setInterval basta, e a varredura é idempotente.
const iniciar = () => {
  setTimeout(rodar, 30 * 1000).unref();
  setInterval(rodar, INTERVALO_MS).unref();
};

module.exports = { iniciar, rodar };
