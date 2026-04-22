import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CHAVE_TEMA = 'tema-escuro-boletos';

interface TemaContextoProps {
  temaEscuro: boolean;
  alternarTema: () => void;
}

const TemaContexto = createContext<TemaContextoProps | null>(null);

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = window.localStorage.getItem(CHAVE_TEMA);
    if (temaSalvo !== null) {
      return temaSalvo === 'true';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    window.localStorage.setItem(CHAVE_TEMA, String(temaEscuro));
    document.documentElement.classList.toggle('dark', temaEscuro);
  }, [temaEscuro]);

  const valor = useMemo(
    () => ({
      temaEscuro,
      alternarTema: () => setTemaEscuro(valorAtual => !valorAtual),
    }),
    [temaEscuro]
  );

  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContexto);
  if (!contexto) {
    throw new Error('useTema deve ser usado dentro de TemaProvider');
  }

  return contexto;
}

