export type StatusBoleto = 'pago' | 'atrasado' | 'vence_hoje' | 'em_aberto';
export type Empresa = string;
export type ModoResumoBusca = 'geral' | 'pesquisa';

export interface EmpresaSistema {
  id: string;
  nome: string;
  camposPadrao?: string[];
  tabelas?: string[];
}

export interface Boleto {
  empresa: Empresa;
  ano: number;
  cliente: string;
  nossoNumero: string;
  valor: number;
  emissao: string;
  vencimento: string;
  situacao: string | null;
  dataPagamento?: string;
  mesAba: string;
  status: StatusBoleto;
}

export interface ResumoTotais {
  linhas: number;
  pagos: number;
  emAberto: number;
  atrasados: number;
  vencemHoje: number;
}

export interface ResumoValores {
  total: number;
  pago: number;
  emAberto: number;
  atrasado: number;
}

export interface ResumoPorMes {
  mesAba: string;
  linhas: number;
  pagos: number;
  emAberto: number;
  atrasados: number;
  vencemHoje: number;
  valorTotal: number;
}

export interface ResumoBoletos {
  totais: ResumoTotais;
  valores: ResumoValores;
  porMes: ResumoPorMes[];
}

export interface RespostaBoletos {
  boletos: Boleto[];
  resumo: ResumoBoletos;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface EstatisticasEmpresa {
  abertos: number;
  pagos: number;
  vencendo: number;
  vencidos: number;
}

export interface DadosFormularioBoleto {
  empresa: Empresa;
  cliente: string;
  nosso: string;
  valor: string;
  emiss: string;
  venc: string;
}
