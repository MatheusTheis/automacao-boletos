import { useEffect } from 'react';
import { Boleto } from '../../tipos/boletos';
import { formatarDataIso, formatarMoeda } from '../../utilitarios/formatacao';
import { useExcluirBoleto } from '../../ganchos/use-excluir-boleto';

interface PropriedadesPopoverExcluirBoleto {
  boleto: Boleto;
  aoFechar: () => void;
  aoConcluir?: (mensagem: string, tipo?: 'sucesso' | 'erro') => void;
}

export default function PopoverExcluirBoleto({ boleto, aoFechar, aoConcluir }: PropriedadesPopoverExcluirBoleto) {
  const { mutate: excluirBoleto, isPending } = useExcluirBoleto();

  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, []);

  const aoConfirmar = () => {
    excluirBoleto(
      { boleto },
      {
        onSuccess: () => {
          aoConcluir?.('Boleto excluído com sucesso.', 'sucesso');
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Confirmar exclusão</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Essa ação remove o boleto da planilha e não pode ser desfeita automaticamente.
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

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-900 dark:text-red-200">{boleto.cliente}</p>
          <p className="mt-1 text-red-800 dark:text-red-300">Nosso Número: {boleto.nossoNumero}</p>
          <p className="mt-1 text-red-800 dark:text-red-300">Valor: {formatarMoeda(boleto.valor)}</p>
          <p className="mt-1 text-red-800 dark:text-red-300">Vencimento: {formatarDataIso(boleto.vencimento)}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={aoFechar}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? 'Excluindo...' : 'Excluir boleto'}
          </button>
        </div>
      </div>
    </div>
  );
}
