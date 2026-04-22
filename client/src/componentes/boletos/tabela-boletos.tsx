import { useEffect, useState } from 'react';
import { Boleto } from '../../tipos/boletos';
import { formatarDataIso, formatarMoeda } from '../../utilitarios/formatacao';
import PopoverMarcarPago from './popover-marcar-pago';
import PopoverDesmarcarPago from './popover-desmarcar-pago';
import PopoverExcluirBoleto from './popover-excluir-boleto';

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
  const [boletoParaExcluir, setBoletoParaExcluir] = useState<Boleto | null>(null);
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
      return '+/-';
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
          className={`inline-flex min-w-[84px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold transition-colors ${classe}`}
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
          className={`inline-flex min-w-[84px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold transition-colors ${classe}`}
          title="Clique para desmarcar como pago"
        >
          {rotulo}
        </button>
      );
    }

    return <span className={`inline-flex min-w-[84px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${classe}`}>{rotulo}</span>;
  };

  const renderizarBotaoExcluir = (boleto: Boleto) => {
    return (
      <button
        type="button"
        onClick={() => setBoletoParaExcluir(boleto)}
        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white/85 text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-950/45 dark:hover:text-red-300"
        title="Excluir boleto"
        aria-label={`Excluir boleto ${boleto.nossoNumero}`}
      >
        <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <g className="origin-right transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9 6h6" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M10 4h4a1 1 0 011 1v1H9V5a1 1 0 011-1Z" />
          </g>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M5 6h14" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M7.5 8.5v8A2.5 2.5 0 0010 19h4a2.5 2.5 0 002.5-2.5v-8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M10 11v5m4-5v5" />
        </svg>
      </button>
    );
  };

  const CabecalhoOrdenavel = ({
    campo,
    children,
    alinhamento = 'left',
  }: {
    campo: string;
    children: React.ReactNode;
    alinhamento?: 'left' | 'center';
  }) => (
    <th
      className={`cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 ${
        alinhamento === 'center' ? 'text-center' : 'text-left'
      }`}
      onClick={() => aoOrdenar(campo)}
    >
      <div className={`flex items-center gap-2 ${alinhamento === 'center' ? 'justify-center' : ''}`}>
        <span className="whitespace-nowrap">{children}</span>
        <span className="inline-flex min-w-[32px] items-center justify-center text-[11px] font-semibold text-gray-400 dark:text-slate-500">
          {renderizarIconeOrdenacao(campo)}
        </span>
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
              <CabecalhoOrdenavel campo="nossoNumero">Nosso Número</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="valor">Valor</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="emissao">Emissão</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="vencimento">Vencimento</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="situacao" alinhamento="center">Situação</CabecalhoOrdenavel>
              <CabecalhoOrdenavel campo="status" alinhamento="center">Status</CabecalhoOrdenavel>
              <th className="w-16 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Excluir
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {boletos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
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
                  <td className="px-4 py-3 text-center text-sm text-gray-800 dark:text-slate-200">{boleto.situacao || '-'}</td>
                  <td className="px-4 py-3 text-center">{renderizarStatus(boleto)}</td>
                  <td className="px-4 py-3 text-right">{renderizarBotaoExcluir(boleto)}</td>
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

      {boletoParaExcluir && (
        <PopoverExcluirBoleto
          boleto={boletoParaExcluir}
          aoFechar={() => setBoletoParaExcluir(null)}
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
              Próxima
            </button>
          </div>

          <div className="hidden flex-1 items-center justify-between sm:flex">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              Página <span className="font-medium">{paginaAtual}</span> de <span className="font-medium">{totalPaginas}</span>
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
                Próxima
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
