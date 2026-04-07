import { useState } from 'react';
import { Boleto } from '../../tipos/boletos';
import { formatarMoeda } from '../../utilitarios/formatacao';
import { useMarcarPago } from '../../ganchos/use-marcar-pago';

interface PropriedadesPopoverMarcarPago {
  boleto: Boleto;
  aoFechar: () => void;
  aoConcluir?: (mensagem: string, tipo?: 'sucesso' | 'erro') => void;
}

export default function PopoverMarcarPago({ boleto, aoFechar, aoConcluir }: PropriedadesPopoverMarcarPago) {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [valorPago, setValorPago] = useState(boleto.valor.toString());
  const { mutate: marcarPago, isPending } = useMarcarPago();

  const aoEnviar = (evento: React.FormEvent) => {
    evento.preventDefault();

    const valorNumerico = parseFloat(valorPago);
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      aoConcluir?.('Valor invalido. Informe um valor maior que zero.', 'erro');
      return;
    }

    marcarPago(
      { boleto, dataPagamento, valorPago: valorNumerico },
      {
        onSuccess: () => {
          aoConcluir?.('Boleto marcado como pago com sucesso.', 'sucesso');
          aoFechar();
        },
        onError: erro => {
          aoConcluir?.(`Erro: ${erro.message}`, 'erro');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Marcar como Pago</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Cliente: <span className="font-medium">{boleto.cliente}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Nosso Numero: <span className="font-mono font-medium">{boleto.nossoNumero}</span>
            </p>
          </div>
          <button
            onClick={aoFechar}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            disabled={isPending}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={aoEnviar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Data do Pagamento</label>
            <input
              type="date"
              value={dataPagamento}
              onChange={evento => setDataPagamento(evento.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Valor Pago (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorPago}
              onChange={evento => setValorPago(evento.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              required
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Valor original: {formatarMoeda(boleto.valor)}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? 'Salvando...' : 'Marcar como Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
