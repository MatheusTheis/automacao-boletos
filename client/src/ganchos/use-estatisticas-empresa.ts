import { useEffect, useState } from 'react';
import { Empresa, EstatisticasEmpresa } from '../tipos/boletos';
import { montarUrlApi } from '../servicos/api';

export function useEstatisticasEmpresa(empresa: Empresa) {
  const [estatisticas, setEstatisticas] = useState<EstatisticasEmpresa | null>(null);

  useEffect(() => {
    if (!empresa) {
      setEstatisticas(null);
      return;
    }

    let ativo = true;

    async function carregar() {
      try {
        const resposta = await fetch(montarUrlApi(`/api/estatisticas/${empresa}`));
        if (!resposta.ok) {
          return;
        }

        const dados = await resposta.json();
        if (ativo) {
          setEstatisticas(dados);
        }
      } catch (erro) {
        console.error('Erro ao carregar estatisticas:', erro);
      }
    }

    carregar();
    const intervalo = setInterval(carregar, 30000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [empresa]);

  return estatisticas;
}
