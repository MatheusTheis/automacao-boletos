interface PropriedadesPainelFiltros {
  meses: string[];
  mesAtual: string;
  statusAtual: string;
  buscaAtual: string;
  aoMudarMes: (mes: string) => void;
  aoMudarStatus: (status: string) => void;
  aoMudarBusca: (busca: string) => void;
}

export default function PainelFiltros({
  meses,
  mesAtual,
  statusAtual,
  buscaAtual,
  aoMudarMes,
  aoMudarStatus,
  aoMudarBusca,
}: PropriedadesPainelFiltros) {
  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow transition-colors dark:bg-slate-900 dark:shadow-black/20">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Mes</label>
          <select
            value={mesAtual}
            onChange={evento => aoMudarMes(evento.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
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
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
          >
            <option value="">Todos</option>
            <option value="pago">Pagos</option>
            <option value="atrasado">Atrasados</option>
            <option value="vence_hoje">Vence Hoje</option>
            <option value="em_aberto">Em Aberto</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Buscar cliente ou nosso numero</label>
          <input
            type="text"
            value={buscaAtual}
            onChange={evento => aoMudarBusca(evento.target.value)}
            placeholder="Digite para buscar..."
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  );
}
