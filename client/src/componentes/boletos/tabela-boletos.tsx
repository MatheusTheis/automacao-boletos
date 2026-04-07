import { useEffect, useState } from 'react';
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
  const [aviso, setAviso] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  useEffect(() => {
    if (!aviso) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAviso(null);
    }, 5000);

    const fecharAoClicarNaTela = () => {
      setAviso(null);
    };

    window.addEventListener('pointerdown', fecharAoClicarNaTela);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', fecharAoClicarNaTela);
    };
  }, [aviso]);

  const exibirAviso = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setAviso({ mensagem, tipo });
  };

  const renderizarIconeOrdenacao = (campo: string) => {
    if (ordenacao.campo !== campo) {
      return <span className="text-gray-400 dark:text-slate-500">+/-</span>;
    }

    return ordenacao.direcao === 'asc' ? 'ASC' : 'DESC';
  };

  const obterClasseLinha = (status: string) => {
    if (status === 'atrasado') {
      return 'bg-red-100/90 hover:bg-red-100 dark:bg-red-950/55 dark:hover:bg-red-950/70';
    }

    if (status === 'vence_hoje') {
      return 'bg-amber-100/90 hover:bg-amber-100 dark:bg-amber-950/55 dark:hover:bg-amber-950/70';
    }

    if (status === 'pago') {
      return 'bg-emerald-100/90 hover:bg-emerald-100 dark:bg-emerald-950/55 dark:hover:bg-emerald-950/70';
    }

    return 'bg-blue-100/80 hover:bg-blue-100 dark:bg-blue-950/45 dark:hover:bg-blue-950/60';
  };

  const renderizarStatus = (boleto: Boleto) => {
    const estilos = {
      pago:
        'border border-emerald-300 bg-emerald-200 text-emerald-900 shadow-sm dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-100',
      atrasado:
        'cursor-pointer border border-red-300 bg-red-200 text-red-900 shadow-sm hover:bg-red-300 dark:border-red-700 dark:bg-red-900/70 dark:text-red-100 dark:hover:bg-red-900',
      vence_hoje:
        'border border-amber-300 bg-amber-200 text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-900/70 dark:text-amber-100',
      em_aberto:
        'cursor-pointer border border-blue-300 bg-blue-200 text-blue-900 shadow-sm hover:bg-blue-300 dark:border-blue-700 dark:bg-blue-900/70 dark:text-blue-100 dark:hover:bg-blue-900',
    };

    const rotulos = {
      pago: 'Pago',
      atrasado: 'Atrasado',
      vence_hoje: 'Vence Hoje',
      em_aberto: 'Em Aberto',
    };

    const classe = estilos[boleto.status] || 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200';
    const rotulo = rotulos[boleto.status] || boleto.status;

    if (boleto.status === 'atrasado' || boleto.status === 'em_aberto') {
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
    <div className="relative overflow-hidden rounded-lg bg-white shadow transition-colors dark:bg-slate-900 dark:shadow-black/20">
      {aviso && (
        <div
          className={`pointer-events-none fixed right-4 top-4 z-[70] max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            aviso.tipo === 'erro'
              ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-200'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-200'
          }`}
        >
          {aviso.mensagem}
        </div>
      )}

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
                <tr key={`${boleto.nossoNumero}-${indice}`} className={`transition-colors ${obterClasseLinha(boleto.status)}`}>
                  <td className="px-4 py-3 text-sm text-gray-950 dark:text-slate-50">{boleto.cliente}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-950 dark:text-slate-50">{boleto.nossoNumero}</td>
                  <td className="px-4 py-3 text-sm text-gray-950 dark:text-slate-50">{formatarMoeda(boleto.valor)}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-slate-200">{formatarDataIso(boleto.emissao)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">{formatarDataIso(boleto.vencimento)}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-slate-200">{boleto.situacao || '-'}</td>
                  <td className="px-4 py-3">{renderizarStatus(boleto)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {boletoParaMarcarPago && (
        <PopoverMarcarPago
          boleto={boletoParaMarcarPago}
          aoFechar={() => setBoletoParaMarcarPago(null)}
          aoConcluir={exibirAviso}
        />
      )}

      {boletoParaDesmarcarPago && (
        <PopoverDesmarcarPago
          boleto={boletoParaDesmarcarPago}
          aoFechar={() => setBoletoParaDesmarcarPago(null)}
          aoConcluir={exibirAviso}
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
