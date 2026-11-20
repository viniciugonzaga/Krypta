// src/routes/destino.ts
// Para onde voltar depois do login. O PrivateRoute guarda a página protegida
// (com o state, ex.: o carrinho do checkout) e o login/cadastro devolve o usuário para ela.
export interface DestinoLogin {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
}
