import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import CardsResumo from '../componentes/boletos/cards-resumo';
import PainelFiltros from '../componentes/boletos/painel-filtros';
import TabelaBoletos from '../componentes/boletos/tabela-boletos';
import { montarUrlApi } from '../servicos/api';
import { Empresa, ModoResumoBusca, RespostaBoletos } from '../tipos/boletos';

const CHAVE_TEMA = 'tema-escuro-boletos';

export default function PaginaBoletos() {
  const navigate = useNavigate();
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa>('CEMAVI');
  const [mes, setMes] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [modoResumoBusca, setModoResumoBusca] = useState<ModoResumoBusca>('geral');
  const [ordenacao, setOrdenacao] = useState({ campo: 'vencimento', direcao: 'asc' as 'asc' | 'desc' });
  const [pagina, setPagina] = useState(1);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = window.localStorage.getItem(CHAVE_TEMA);
    if (temaSalvo !== null) {
      return temaSalvo === 'true';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const pageSize = 50;

  useEffect(() => {
    window.localStorage.setItem(CHAVE_TEMA, String(temaEscuro));
  }, [temaEscuro]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBuscaDebounced(busca);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [busca]);

  const { data: meses = [] } = useQuery<string[]>({
    queryKey: ['meses', empresaSelecionada],
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi(`/api/meses?empresa=${empresaSelecionada}`));
      if (!resposta.ok) throw new Error('Erro ao buscar meses');
      return resposta.json();
    },
  });

  const montarParametrosBoletos = ({
    incluirBusca,
    paginaConsulta = pagina,
    tamanhoPagina = pageSize,
  }: {
    incluirBusca: boolean;
    paginaConsulta?: number;
    tamanhoPagina?: number;
  }) => {
    const params = new URLSearchParams();
    params.append('empresa', empresaSelecionada);
    if (mes) params.append('mes', mes);
    if (status) params.append('status', status);
    if (incluirBusca && buscaDebounced) params.append('q', buscaDebounced);
    params.append('sort', ordenacao.campo);
    params.append('dir', ordenacao.direcao);
    params.append('page', paginaConsulta.toString());
    params.append('pageSize', tamanhoPagina.toString());
    return params;
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery<RespostaBoletos>({
    queryKey: ['boletos', empresaSelecionada, mes, status, buscaDebounced, ordenacao.campo, ordenacao.direcao, pagina],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = montarParametrosBoletos({ incluirBusca: true });
      const resposta = await fetch(montarUrlApi(`/api/boletos?${params}`));
      if (!resposta.ok) throw new Error('Erro ao buscar boletos');
      return resposta.json();
    },
  });

  const { data: dadosResumoGeral } = useQuery<RespostaBoletos>({
    queryKey: ['resumo-geral', empresaSelecionada, mes, status, ordenacao.campo, ordenacao.direcao],
    enabled: modoResumoBusca === 'geral' && buscaDebounced.trim().length > 0,
    queryFn: async () => {
      const params = montarParametrosBoletos({ incluirBusca: false, paginaConsulta: 1, tamanhoPagina: 1 });
      const resposta = await fetch(montarUrlApi(`/api/boletos?${params}`));
      if (!resposta.ok) throw new Error('Erro ao buscar resumo geral');
      return resposta.json();
    },
  });

  const resumoCards = modoResumoBusca === 'pesquisa' ? data?.resumo : dadosResumoGeral?.resumo ?? data?.resumo;

  const exportarPdfAtrasos = async () => {
    setBaixandoPdf(true);
    try {
      const resposta = await fetch(montarUrlApi('/api/boletos/atrasos.pdf'));
      if (!resposta.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await resposta.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boletos_atrasados_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (erro) {
      console.error('Erro ao exportar PDF:', erro);
      alert('Erro ao gerar PDF de boletos em atraso. Tente novamente.');
    } finally {
      setBaixandoPdf(false);
    }
  };

  return (
    <div className={temaEscuro ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Gestao de Boletos</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Visualize e gerencie todos os boletos cadastrados.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemaEscuro(valorAtual => !valorAtual)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-pressed={temaEscuro}
                title={temaEscuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {temaEscuro ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15.114 6.364-1.591-1.591M7.477 7.477 5.886 5.886m12.228 0-1.591 1.591M7.477 16.523l-1.591 1.591M15 12a3 3 0 11-6 0 3 3 0 016 0Z"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79Z"
                    />
                  </svg>
                )}
                {temaEscuro ? 'Modo claro' : 'Modo escuro'}
              </button>

              <button
                onClick={() => navigate('/cemavi')}
                className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Boleto (CEMAVI)
              </button>
              <button
                onClick={() => navigate('/mb')}
                className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Boleto (MB)
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200 dark:border-slate-800">
            <nav className="-mb-px flex space-x-8" aria-label="Empresas">
              <button
                onClick={() => {
                  setEmpresaSelecionada('CEMAVI');
                  setPagina(1);
                  setMes('');
                  setStatus('');
                  setBusca('');
                }}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  empresaSelecionada === 'CEMAVI'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                }`}
              >
                CEMAVI
              </button>
              <button
                onClick={() => {
                  setEmpresaSelecionada('MB');
                  setPagina(1);
                  setMes('');
                  setStatus('');
                  setBusca('');
                }}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  empresaSelecionada === 'MB'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                }`}
              >
                MB
              </button>
            </nav>
          </div>
        </div>

        {resumoCards && <CardsResumo resumo={resumoCards} />}

        <PainelFiltros
          meses={meses}
          mesAtual={mes}
          statusAtual={status}
          buscaAtual={busca}
          modoResumoBusca={modoResumoBusca}
          buscando={isFetching && !!data}
          aoMudarMes={novoMes => {
            setMes(novoMes);
            setPagina(1);
          }}
          aoMudarStatus={novoStatus => {
            setStatus(novoStatus);
            setPagina(1);
          }}
          aoMudarBusca={novaBusca => {
            setBusca(novaBusca);
            setPagina(1);
          }}
          aoMudarModoResumoBusca={setModoResumoBusca}
        />

        <div className="mb-4 flex justify-end gap-2">
          <button
            disabled
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            title="Importacao de CSV sera implementada na proxima etapa"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar Arquivo CSV
          </button>

          <button
            onClick={exportarPdfAtrasos}
            disabled={baixandoPdf}
            className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {baixandoPdf ? 'Gerando...' : 'Exportar PDF (Atrasos)'}
          </button>
        </div>

        {!data && isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Erro ao carregar boletos</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetch()}
                className="text-sm font-medium text-red-800 hover:text-red-600 dark:text-red-200 dark:hover:text-red-100"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <TabelaBoletos
            boletos={data.boletos}
            ordenacao={ordenacao}
            aoOrdenar={campo => {
              setOrdenacao(atual => ({
                campo,
                direcao: atual.campo === campo && atual.direcao === 'asc' ? 'desc' : 'asc',
              }));
              setPagina(1);
            }}
            paginaAtual={data.pagination.page}
            totalPaginas={data.pagination.totalPages}
            aoMudarPagina={setPagina}
          />
        )}

        {data && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
            {data.pagination.total} boleto(s) encontrado(s)
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
