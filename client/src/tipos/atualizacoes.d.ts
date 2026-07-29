export type StatusAtualizacao =
  | 'atualizacao:verificando'
  | 'atualizacao:disponivel'
  | 'atualizacao:indisponivel'
  | 'atualizacao:progresso'
  | 'atualizacao:baixada'
  | 'atualizacao:erro';

export interface EventoStatusAtualizacao {
  tipo: StatusAtualizacao;
  dados?: {
    versao?: string;
    percentual?: number;
    mensagem?: string;
  };
}

export interface ApiAtualizacoes {
  verificar: () => Promise<{ ignorado: boolean; erro?: string }>;
  instalarEReiniciar: () => Promise<void>;
  obterVersaoAtual: () => Promise<string>;
  aoMudarStatus: (callback: (evento: EventoStatusAtualizacao) => void) => () => void;
}

declare global {
  interface Window {
    atualizacoes?: ApiAtualizacoes;
  }
}
