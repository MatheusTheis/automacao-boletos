import { useState } from 'react';
import { Boleto } from '../../tipos/boletos';
import { formatarDataIso, formatarMoeda } from '../../utilitarios/formatacao';
import PopoverMarcarPago from './popover-marcar-pago';
import PopoverDesmarcarPago from './popover-desmarcar-pago';

interface PropriedadesTabelaBoletos {
  boletos: Boleto[];
  ordenacao: { campo: string; direcao: 'asc' | 'desc' };
  aoOrdenar: (campo: string) => void;
  paginaAtual: number;
  totalPaginas: number;
  aoMudarPagina: (pagina: number) => void;
}

export default function TabelaBoletos({
  boletos,
  ordenacao,
  aoOrdenar,
  paginaAtual,
  totalPaginas,
  aoMudarPagina,
}: PropriedadesTabelaBoletos) {
  const [boletoParaMarcarPago, setBoletoParaMarcarPago] = useState<Boleto | null>(null);
  const [boletoParaDesmarcarPago, setBoletoParaDesmarcarPago] = useState<Boleto | null>(null);

  const renderizarIconeOrdenacao = (campo: string) => {
    if (ordenacao.campo !== campo) {
      return <span className="text-gray-400 dark:text-slate-500">+/-</span>;
    }

    return ordenacao.direcao === 'asc' ? 'ASC' : 'DESC';
  };

  const obterClasseLinha = (status: string) => {
    if (status === 'atrasado') return 'bg-red-50 dark:bg-red-950/30';
    if (status === 'vence_hoje') return 'bg-yellow-50 dark:bg-yellow-950/30';
    if (status === 'pago') return 'bg-green-50 dark:bg-green-950/30';
    return '';
  };

  const renderizarStatus = (boleto: Boleto) => {
    const estilos = {
      pago: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      atrasado: 'bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/70',
      vence_hoje: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
      em_aberto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    };

    const rotulos = {
      pago: 'Pago',
      atrasado: 'Atrasado',
      vence_hoje: 'Vence Hoje',
      em_aberto: 'Em Aberto',
    };

    const classe = estilos[boleto.status] || 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200';
    const rotulo = rotulos[boleto.status] || boleto.status;

    if (boleto.status === 'atrasado') {
      return (
        <button
          onClick={() => setBoletoParaMarcarPago(boleto)}
          className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${classe}`}
          title="Clique para marcar como pago"
        >
          {rotulo}
        </button>
      );
    }

    if (boleto.status === 'pago') {
      return (
        <button
          onClick={() => setBoletoParaDesmarcarPago(boleto)}
          className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${classe}`}
          title="Clique para desmarcar como pago"
        >
          {rotulo}
        </button>
      );
    }

    return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${classe}`}>{rotulo}</span>;
  };

  const CabecalhoOrdenavel = ({ campo, children }: { campo: string; children: React.ReactNode }) => (
    <th
      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
      onClick={() => aoOrdenar(campo)}
    >
      <div className="flex items-center gap-2">
        {children}
        <span>{renderizarIconeOrdenacao(campo)}</span>
      </div>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow transition-colors dark:bg-slate-900 dark:shadow-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-950/70">
            <tr>
              <CabecalhoOrdenavel campo="cliente">Cliente</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="nossoNumero">Nosso Numero</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="valor">Valor</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="emissao">Emissao</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="vencimento">Vencimento</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="situacao">Situacao</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="status">Status</CabecalhoOrdenavel>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {boletos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                  Nenhum boleto encontrado
                </td>
              </tr>
            ) : (
              boletos.map((boleto, indice) => (
                <tr key={`${boleto.nossoNumero}-${indice}`} className={obterClasseLinha(boleto.status)}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">{boleto.cliente}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-slate-100">{boleto.nossoNumero}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-slate-100">{formatarMoeda(boleto.valor)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{formatarDataIso(boleto.emissao)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{formatarDataIso(boleto.vencimento)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{boleto.situacao || '-'}</td>
                  <td className="px-4 py-3">{renderizarStatus(boleto)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {boletoParaMarcarPago && (
        <PopoverMarcarPago boleto={boletoParaMarcarPago} aoFechar={() => setBoletoParaMarcarPago(null)} />
      )}

      {boletoParaDesmarcarPago && (
        <PopoverDesmarcarPago
          boleto={boletoParaDesmarcarPago}
          aoFechar={() => setBoletoParaDesmarcarPago(null)}
        />
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex-1 justify-between sm:hidden">
            <button
              onClick={() => aoMudarPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Anterior
            </button>
            <button
              onClick={() => aoMudarPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Proxima
            </button>
          </div>

          <div className="hidden flex-1 items-center justify-between sm:flex">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              Pagina <span className="font-medium">{paginaAtual}</span> de <span className="font-medium">{totalPaginas}</span>
            </p>
            <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
              <button
                onClick={() => aoMudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map(pagina => (
                <button
                  key={pagina}
                  onClick={() => aoMudarPagina(pagina)}
                  className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                    pagina === paginaAtual
                      ? 'z-10 border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {pagina}
                </button>
              ))}
              <button
                onClick={() => aoMudarPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Proxima
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
