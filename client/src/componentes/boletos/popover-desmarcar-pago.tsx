import { Boleto } from '../../tipos/boletos';
import { formatarDataIso, formatarMoeda } from '../../utilitarios/formatacao';
import { useDesmarcarPago } from '../../ganchos/use-desmarcar-pago';

interface PropriedadesPopoverDesmarcarPago {
  boleto: Boleto;
  aoFechar: () => void;
  aoConcluir?: (mensagem: string, tipo?: 'sucesso' | 'erro') => void;
}

export default function PopoverDesmarcarPago({
  boleto,
  aoFechar,
  aoConcluir,
}: PropriedadesPopoverDesmarcarPago) {
  const { mutate: desmarcarPago, isPending } = useDesmarcarPago();

  const aoConfirmar = () => {
    desmarcarPago(
      { boleto },
      {
        onSuccess: () => {
          aoConcluir?.('Pagamento desmarcado com sucesso.', 'erro');
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Desmarcar como Pago</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Essa acao remove a marcacao de pagamento e recalcula o status do boleto.
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

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">{boleto.cliente}</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">Nosso Numero: {boleto.nossoNumero}</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">Valor: {formatarMoeda(boleto.valor)}</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">Vencimento: {formatarDataIso(boleto.vencimento)}</p>
          {boleto.situacao && (
            <p className="mt-1 text-amber-800 dark:text-amber-300">Situacao atual: {boleto.situacao}</p>
          )}
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
            className="flex-1 rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? 'Salvando...' : 'Desmarcar pagamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
