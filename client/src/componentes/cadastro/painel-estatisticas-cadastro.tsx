import { EstatisticasEmpresa } from '../../tipos/boletos';

interface PropriedadesPainelEstatisticasCadastro {
  empresa: 'CEMAVI' | 'MB';
  estatisticas: EstatisticasEmpresa | null;
}

interface PropriedadesCartaoEstatistica {
  titulo: string;
  valor: number;
  total: number;
  cor: 'blue' | 'green' | 'yellow' | 'red';
}

export default function PainelEstatisticasCadastro({
  empresa,
  estatisticas,
}: PropriedadesPainelEstatisticasCadastro) {
  return (
    <div className="rounded-lg bg-white px-6 py-8 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Estatisticas {empresa}</h3>
      {estatisticas ? (
        <div className="space-y-4">
          <CartaoEstatistica titulo="Abertos" valor={estatisticas.abertos} total={estatisticas.abertos + estatisticas.pagos} cor="blue" />
          <CartaoEstatistica titulo="Pagos" valor={estatisticas.pagos} total={estatisticas.abertos + estatisticas.pagos} cor="green" />
          <CartaoEstatistica titulo="Vencendo" valor={estatisticas.vencendo} total={estatisticas.abertos || 1} cor="yellow" />
          <CartaoEstatistica titulo="Vencidos" valor={estatisticas.vencidos} total={estatisticas.abertos || 1} cor="red" />
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <svg className="h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}

function CartaoEstatistica({ titulo, valor, total, cor }: PropriedadesCartaoEstatistica) {
  const percentual = total > 0 ? (valor / total) * 100 : 0;
  const cores = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="text-sm font-medium text-gray-600">{titulo}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{valor}</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${cores[cor]} transition-all`} style={{ width: `${percentual}%` }} />
      </div>
      <div className="mt-1 text-xs text-gray-500">{percentual.toFixed(0)}%</div>
    </div>
  );
}
