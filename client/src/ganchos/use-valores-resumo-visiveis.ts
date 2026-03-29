import { useEffect, useState } from 'react';

const CHAVE_LOCAL_STORAGE = 'resumo-boletos-visivel';

export function useValoresResumoVisiveis() {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const valorSalvo = localStorage.getItem(CHAVE_LOCAL_STORAGE);
    if (valorSalvo !== null) {
      setVisivel(valorSalvo === 'true');
    }
  }, []);

  const alternarVisibilidade = () => {
    setVisivel(estadoAtual => {
      const proximoEstado = !estadoAtual;
      localStorage.setItem(CHAVE_LOCAL_STORAGE, String(proximoEstado));
      return proximoEstado;
    });
  };

  return {
    valoresVisiveis: visivel,
    alternarVisibilidade,
  };
}
