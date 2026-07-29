import { useEffect, useState } from 'react';

type Estado =
  | { fase: 'ocioso' }
  | { fase: 'verificando' }
  | { fase: 'baixando'; percentual: number }
  | { fase: 'pronta'; versao?: string }
  | { fase: 'atualizado' }
  | { fase: 'erro'; mensagem: string };

export default function BotaoVerificarAtualizacoes() {
  const [estado, setEstado] = useState<Estado>({ fase: 'ocioso' });
  const disponivel = typeof window !== 'undefined' && Boolean(window.atualizacoes);

  useEffect(() => {
    if (!disponivel) return undefined;

    const remover = window.atualizacoes!.aoMudarStatus(evento => {
      switch (evento.tipo) {
        case 'atualizacao:verificando':
          setEstado({ fase: 'verificando' });
          break;
        case 'atualizacao:disponivel':
          setEstado({ fase: 'baixando', percentual: 0 });
          break;
        case 'atualizacao:progresso':
          setEstado({ fase: 'baixando', percentual: Math.round(evento.dados?.percentual ?? 0) });
          break;
        case 'atualizacao:baixada':
          setEstado({ fase: 'pronta', versao: evento.dados?.versao });
          break;
        case 'atualizacao:indisponivel':
          setEstado({ fase: 'atualizado' });
          break;
        case 'atualizacao:erro':
          setEstado({ fase: 'erro', mensagem: evento.dados?.mensagem ?? 'Falha ao verificar atualizacoes.' });
          break;
        default:
          break;
      }
    });

    return remover;
  }, [disponivel]);

  if (!disponivel) {
    return null;
  }

  const verificando = estado.fase === 'verificando';
  const baixando = estado.fase === 'baixando';
  const pronta = estado.fase === 'pronta';

  function verificarAtualizacoes() {
    setEstado({ fase: 'verificando' });
    window.atualizacoes!.verificar();
  }

  function instalarAtualizacao() {
    window.atualizacoes!.instalarEReiniciar();
  }

  function rotulo() {
    if (verificando) return 'Verificando...';
    if (baixando) return `Baixando... ${estado.percentual}%`;
    if (pronta) return 'Reiniciar e instalar';
    if (estado.fase === 'atualizado') return 'Sistema atualizado';
    if (estado.fase === 'erro') return 'Tentar novamente';
    return 'Buscar atualizacoes';
  }

  return (
    <button
      type="button"
      onClick={pronta ? instalarAtualizacao : verificarAtualizacoes}
      disabled={verificando || baixando}
      title={estado.fase === 'erro' ? estado.mensagem : undefined}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.5 12a7.5 7.5 0 0 1 13-5.14M19.5 12a7.5 7.5 0 0 1-13 5.14M15 4.5v3.5h-3.5M9 19.5V16h3.5"
        />
      </svg>
      {rotulo()}
    </button>
  );
}
