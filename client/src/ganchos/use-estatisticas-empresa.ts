import { useEffect, useState } from 'react';
import { Empresa, EstatisticasEmpresa } from '../tipos/boletos';
import { montarUrlApi } from '../servicos/api';

export function useEstatisticasEmpresa(empresa: Empresa, ano?: string) {
  const [estatisticas, setEstatisticas] = useState<EstatisticasEmpresa | null>(null);

  useEffect(() => {
    if (!empresa) {
      setEstatisticas(null);
      return;
    }

    let ativo = true;

    async function carregar() {
      try {
        const params = new URLSearchParams();
        if (ano) {
          params.append('ano', ano);
        }

        const sufixo = params.toString() ? `?${params.toString()}` : '';
        const resposta = await fetch(montarUrlApi(`/api/estatisticas/${empresa}${sufixo}`));
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
  }, [empresa, ano]);

  return estatisticas;
}
