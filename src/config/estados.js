// Matriz de estados da conta: ÚNICA fonte das regras "estado X pode fazer Y" (Guia, 6.2).
// Serviços e repositórios importam daqui. Mudar uma regra é mudar este arquivo.
const lista = (...estados) => Object.freeze(estados);

module.exports = {
  ESTADOS_LOGIN_HARDWARE: lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'),
  ESTADOS_ESCRITA: lista('ATIVA', 'RECUPERACAO_LOCAL'), // PUT /backup
  ESTADOS_DOWNLOAD: lista('RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'), // GET /backup (RN04: nunca em ATIVA)
  ESTADOS_METADADOS: lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'), // GET /backup/metadata
  ESTADOS_KILL_SWITCH: lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'),
  ESTADOS_RECUPERACAO: lista('RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'),
  ESTADOS_RESGATE: lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE', 'REVOGADA'), // POST /inheritance/claim
};
