import { useMutation, useQueryClient } from '@tanstack/react-query';
import { montarUrlApi } from '../servicos/api';
import { Boleto } from '../tipos/boletos';

interface ParametrosExcluirBoleto {
  boleto: Boleto;
}

export function useExcluirBoleto() {
  const clienteQuery = useQueryClient();

  return useMutation({
    mutationFn: async ({ boleto }: ParametrosExcluirBoleto) => {
      const resposta = await fetch(montarUrlApi('/api/boletos'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nossoNumero: boleto.nossoNumero,
          empresa: boleto.empresa,
          vencimento: boleto.vencimento,
        }),
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || erro.error || 'Erro ao excluir boleto');
      }

      return resposta.json();
    },
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['boletos'] });
      clienteQuery.invalidateQueries({ queryKey: ['meses'] });
      clienteQuery.invalidateQueries({ queryKey: ['resumo-geral'] });
    },
  });
}
