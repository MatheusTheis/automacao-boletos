import { useMutation, useQueryClient } from '@tanstack/react-query';
import { montarUrlApi } from '../servicos/api';
import { Boleto } from '../tipos/boletos';

interface ParametrosMarcarPago {
  boleto: Boleto;
  dataPagamento: string;
  valorPago?: number;
}

export function useMarcarPago() {
  const clienteQuery = useQueryClient();

  return useMutation({
    mutationFn: async ({ boleto, dataPagamento, valorPago }: ParametrosMarcarPago) => {
      const resposta = await fetch(montarUrlApi('/api/boletos/marcar-pago'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nossoNumero: boleto.nossoNumero,
          empresa: boleto.empresa,
          vencimento: boleto.vencimento,
          dataPagamento,
          valorPago,
        }),
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || erro.error || 'Erro ao marcar boleto como pago');
      }

      return resposta.json();
    },
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['boletos'] });
    },
  });
}
