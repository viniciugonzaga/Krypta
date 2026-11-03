// Ponto de integração com envio de email real (ex.: nodemailer + SMTP). Ainda NÃO existe.
// Retorna true somente se o email saiu. Enquanto retornar false, nenhum aviso é registrado
// e, portanto, nenhuma conta é excluída (a exclusão exige o aviso H48 registrado).
const enviarAvisoInatividade = async () => false;

module.exports = { enviarAvisoInatividade }
