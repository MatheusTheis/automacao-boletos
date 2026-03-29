import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CardsResumo from '../componentes/boletos/cards-resumo';
import PainelFiltros from '../componentes/boletos/painel-filtros';
import TabelaBoletos from '../componentes/boletos/tabela-boletos';
import { montarUrlApi } from '../servicos/api';
import { Empresa, RespostaBoletos } from '../tipos/boletos';

export default function PaginaBoletos() {
  const navigate = useNavigate();
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa>('CEMAVI');
  const [mes, setMes] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'vencimento', direcao: 'asc' as 'asc' | 'desc' });
  const [pagina, setPagina] = useState(1);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const pageSize = 50;

  const { data: meses = [] } = useQuery<string[]>({
    queryKey: ['meses', empresaSelecionada],
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi(`/api/meses?empresa=${empresaSelecionada}`));
      if (!resposta.ok) throw new Error('Erro ao buscar meses');
      return resposta.json();
    },
  });

  const { data, isLoading, error, refetch } = useQuery<RespostaBoletos>({
    queryKey: ['boletos', empresaSelecionada, mes, status, busca, ordenacao.campo, ordenacao.direcao, pagina],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('empresa', empresaSelecionada);
      if (mes) params.append('mes', mes);
      if (status) params.append('status', status);
      if (busca) params.append('q', busca);
      params.append('sort', ordenacao.campo);
      params.append('dir', ordenacao.direcao);
      params.append('page', pagina.toString());
      params.append('pageSize', pageSize.toString());

      const resposta = await fetch(montarUrlApi(`/api/boletos?${params}`));
      if (!resposta.ok) throw new Error('Erro ao buscar boletos');
      return resposta.json();
    },
  });

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
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestao de Boletos</h1>
              <p className="mt-2 text-sm text-gray-600">Visualize e gerencie todos os boletos cadastrados.</p>
            </div>

            <div className="flex gap-2">
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

          <div className="border-b border-gray-200">
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
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                MB
              </button>
            </nav>
          </div>
        </div>

        {data?.resumo && <CardsResumo resumo={data.resumo} />}

        <PainelFiltros
          meses={meses}
          mesAtual={mes}
          statusAtual={status}
          buscaAtual={busca}
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

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar boletos</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
            </div>
            <div className="mt-4">
              <button onClick={() => refetch()} className="text-sm font-medium text-red-800 hover:text-red-600">
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

        {data && <div className="mt-4 text-center text-sm text-gray-500">{data.pagination.total} boleto(s) encontrado(s)</div>}
      </div>
    </div>
  );
}
