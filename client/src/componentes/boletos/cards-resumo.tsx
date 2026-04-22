import { ReactNode } from 'react';
import { useValoresResumoVisiveis } from '../../ganchos/use-valores-resumo-visiveis';
import { ResumoBoletos } from '../../tipos/boletos';
import { formatarMoeda, mascararMoeda, mascararNumero } from '../../utilitarios/formatacao';

interface PropriedadesCardsResumo {
  resumo: ResumoBoletos;
}

interface CardResumo {
  titulo: string;
  quantidade: number;
  valor: string;
  valorOculto: string;
  cor: string;
  icone: ReactNode;
}

function IconeTotal() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20V10m5 10V4m5 16v-6" />
    </svg>
  );
}

function IconePago() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 13 4 4L19 7" />
    </svg>
  );
}

function IconeEmAberto() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function IconeAlerta() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      />
    </svg>
  );
}

export default function CardsResumo({ resumo }: PropriedadesCardsResumo) {
  const { totais, valores } = resumo;
  const { valoresVisiveis, alternarVisibilidade } = useValoresResumoVisiveis();

  const cards: CardResumo[] = [
    {
      titulo: 'Total de Boletos',
      quantidade: totais.linhas,
      valor: formatarMoeda(valores.total),
      valorOculto: mascararMoeda(),
      cor: 'bg-blue-100 text-blue-800',
      icone: <IconeTotal />,
    },
    {
      titulo: 'Pagos',
      quantidade: totais.pagos,
      valor: formatarMoeda(valores.pago),
      valorOculto: mascararMoeda(),
      cor: 'bg-green-100 text-green-800',
      icone: <IconePago />,
    },
    {
      titulo: 'Em Aberto',
      quantidade: totais.emAberto,
      valor: formatarMoeda(valores.emAberto),
      valorOculto: mascararMoeda(),
      cor: 'bg-yellow-100 text-yellow-800',
      icone: <IconeEmAberto />,
    },
    {
      titulo: 'Atrasados',
      quantidade: totais.atrasados,
      valor: formatarMoeda(valores.atrasado),
      valorOculto: mascararMoeda(),
      cor: 'bg-red-100 text-red-800',
      icone: <IconeAlerta />,
    },
    {
      titulo: 'Vencem Hoje',
      quantidade: totais.vencemHoje,
      valor: 'Atencao',
      valorOculto: '*******',
      cor: 'bg-orange-100 text-orange-800',
      icone: <IconeAlerta />,
    },
  ];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Resumo Geral</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Controle visual rapido dos principais indicadores.</p>
        </div>

        <button
          type="button"
          onClick={alternarVisibilidade}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-pressed={!valoresVisiveis}
        >
          {valoresVisiveis ? (
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          ) : (
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.477 10.487A3 3 0 0012 15a3 3 0 002.121-.879" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.88 5.09A9.771 9.771 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.75 9.75 0 01-4.076 5.135M6.228 6.228A9.776 9.776 0 002.458 12c1.274 4.057 5.064 7 9.542 7a9.77 9.77 0 005.087-1.424"
              />
            </svg>
          )}
          {valoresVisiveis ? 'Ocultar valores' : 'Mostrar valores'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map(card => (
          <div key={card.titulo} className={`rounded-lg p-4 shadow ring-1 ring-inset ring-white/40 dark:ring-slate-800 ${card.cor}`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{card.titulo}</p>
              <span>{card.icone}</span>
            </div>
            <p className="text-3xl font-bold">
              {valoresVisiveis ? card.quantidade : mascararNumero(card.quantidade)}
            </p>
            <p className="mt-1 text-xs opacity-75">{valoresVisiveis ? card.valor : card.valorOculto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
