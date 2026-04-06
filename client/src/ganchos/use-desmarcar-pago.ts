import { useMutation, useQueryClient } from '@tanstack/react-query';
import { montarUrlApi } from '../servicos/api';
import { Boleto } from '../tipos/boletos';

interface ParametrosDesmarcarPago {
  boleto: Boleto;
}

export function useDesmarcarPago() {
  const clienteQuery = useQueryClient();

  return useMutation({
    mutationFn: async ({ boleto }: ParametrosDesmarcarPago) => {
      const resposta = await fetch(montarUrlApi('/api/boletos/desmarcar-pago'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nossoNumero: boleto.nossoNumero,
          empresa: boleto.empresa,
        }),
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || erro.error || 'Erro ao desmarcar boleto como pago');
      }

      return resposta.json();
    },
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['boletos'] });
    },
  });
}
