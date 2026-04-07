import { useEffect, useRef, useState } from 'react';
import { ModoResumoBusca } from '../../tipos/boletos';

const CLASSE_SELECT_FILTRO =
  'w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400';

interface PropriedadesPainelFiltros {
  meses: string[];
  mesAtual: string;
  statusAtual: string;
  buscaAtual: string;
  modoResumoBusca: ModoResumoBusca;
  buscando?: boolean;
  aoMudarMes: (mes: string) => void;
  aoMudarStatus: (status: string) => void;
  aoMudarBusca: (busca: string) => void;
  aoMudarModoResumoBusca: (modo: ModoResumoBusca) => void;
}

export default function PainelFiltros({
  meses,
  mesAtual,
  statusAtual,
  buscaAtual,
  modoResumoBusca,
  buscando = false,
  aoMudarMes,
  aoMudarStatus,
  aoMudarBusca,
  aoMudarModoResumoBusca,
}: PropriedadesPainelFiltros) {
  const [menuResumoAberto, setMenuResumoAberto] = useState(false);
  const containerMenuResumoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuResumoAberto) {
      return;
    }

    const aoClicarFora = (evento: MouseEvent) => {
      if (!containerMenuResumoRef.current?.contains(evento.target as Node)) {
        setMenuResumoAberto(false);
      }
    };

    window.addEventListener('mousedown', aoClicarFora);

    return () => {
      window.removeEventListener('mousedown', aoClicarFora);
    };
  }, [menuResumoAberto]);

  const rotuloModoResumo =
    modoResumoBusca === 'geral' ? 'Resumo Geral' : 'Resumo por pesquisa';

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow transition-colors dark:bg-slate-900 dark:shadow-black/20">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Mes</label>
          <select
            value={mesAtual}
            onChange={evento => aoMudarMes(evento.target.value)}
            className={CLASSE_SELECT_FILTRO}
          >
            <option value="">Todos os meses</option>
            {meses.map(mes => (
              <option key={mes} value={mes}>
                {mes}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Status</label>
          <select
            value={statusAtual}
            onChange={evento => aoMudarStatus(evento.target.value)}
            className={CLASSE_SELECT_FILTRO}
          >
            <option value="">Todos</option>
            <option value="pago">Pagos</option>
            <option value="atrasado">Atrasados</option>
            <option value="vence_hoje">Vence Hoje</option>
            <option value="em_aberto">Em Aberto</option>
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Buscar cliente ou nosso numero</label>
            {buscando && <span className="text-xs text-blue-600 dark:text-blue-400">Atualizando...</span>}
          </div>
          <div className="relative flex" ref={containerMenuResumoRef}>
            <input
              type="text"
              value={buscaAtual}
              onChange={evento => aoMudarBusca(evento.target.value)}
              placeholder="Digite para buscar..."
              className="min-w-0 flex-1 rounded-l-md rounded-r-none border border-r-0 border-gray-300 bg-white p-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            />

            <button
              type="button"
              onClick={() => setMenuResumoAberto(aberto => !aberto)}
              className="inline-flex w-12 items-center justify-center rounded-r-md rounded-l-none border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              title={rotuloModoResumo}
              aria-label={rotuloModoResumo}
              aria-haspopup="menu"
              aria-expanded={menuResumoAberto}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {menuResumoAberto && (
              <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    aoMudarModoResumoBusca('geral');
                    setMenuResumoAberto(false);
                  }}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                    modoResumoBusca === 'geral' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-gray-700 dark:text-slate-200'
                  }`}
                >
                  <span>Resumo Geral</span>
                  {modoResumoBusca === 'geral' && <span className="text-xs font-semibold">Ativo</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    aoMudarModoResumoBusca('pesquisa');
                    setMenuResumoAberto(false);
                  }}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-slate-800 ${
                    modoResumoBusca === 'pesquisa'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'text-gray-700 dark:text-slate-200'
                  }`}
                >
                  <span>Resumo por pesquisa</span>
                  {modoResumoBusca === 'pesquisa' && <span className="text-xs font-semibold">Ativo</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
