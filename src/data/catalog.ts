// src/data/catalog.ts
// Catálogo de produtos físicos do Krypta (usado em Produtos e no Checkout).
import Krypta0 from '../assets/Produtos/Krypta0.png';

export interface Product {
  id: string;
  name: string;
  shortName: string;
  description: string;
  price: number; // em reais
  maxInstallments: number; // parcelas sem juros
  maxQuantity: number;
  image: string;
}

export const KRYPTA_DEVICE: Product = {
  id: 'krypta-device-v1',
  name: 'Krypta — Dispositivo de Gerenciamento de Senhas e Autenticação Multifatorial',
  shortName: 'Dispositivo Krypta',
  description:
    'Hardware de autenticação com leitor de digital, NFC, conexão USB e criptografia AES-256-GCM.',
  price: 599,
  maxInstallments: 10,
  maxQuantity: 5,
  image: Krypta0,
};