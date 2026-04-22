import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BotaoAlternarTema from '../componentes/compartilhado/botao-alternar-tema';
import { montarUrlApi } from '../servicos/api';

export const CHAVE_ONBOARDING = 'onboarding-concluido-boletos-v1';

type ModoInicial = 'criar' | 'existente';

export default function PaginaBoasVindas() {
  const navigate = useNavigate();
  const [modoInicial, setModoInicial] = useState<ModoInicial>('criar');
  const [nomeEmpresaInicial, setNomeEmpresaInicial] = useState('');
  const [anoInicial, setAnoInicial] = useState(() => String(new Date().getFullYear()));
  const [processando, setProcessando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

  const concluirOnboarding = () => {
    window.localStorage.setItem(CHAVE_ONBOARDING, 'true');
    navigate('/', { replace: true });
  };

  const configurarComPeriodoInicial = async () => {
    const nome = nomeEmpresaInicial.trim();
    if (!nome) {
      setMensagemErro('Informe o nome da empresa para criar o primeiro periodo.');
      return;
    }

    const ano = Number.parseInt(anoInicial, 10);
    if (Number.isNaN(ano) || ano < 2000 || ano > 2100) {
      setMensagemErro('Informe um ano valido para o primeiro periodo.');
      return;
    }

    try {
      setProcessando(true);
      setMensagemErro('');

      const respostaEmpresa = await fetch(montarUrlApi('/api/empresas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const resultadoEmpresa = await respostaEmpresa.json();
      if (!respostaEmpresa.ok) {
        setMensagemErro(resultadoEmpresa.erro || 'Nao foi possivel cadastrar a empresa inicial.');
        return;
      }

      const respostaPeriodo = await fetch(montarUrlApi('/api/excel/periodo-em-branco'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: resultadoEmpresa.empresa.id,
          ano,
        }),
      });
      const resultadoPeriodo = await respostaPeriodo.json();
      if (!respostaPeriodo.ok) {
        setMensagemErro(resultadoPeriodo.erro || 'Nao foi possivel criar o periodo inicial.');
        return;
      }

      concluirOnboarding();
    } catch (erro) {
      console.error('Erro ao preparar ambiente inicial:', erro);
      setMensagemErro('Erro ao preparar ambiente inicial.');
    } finally {
      setProcessando(false);
    }
  };

  const aoContinuar = async () => {
    if (modoInicial === 'existente') {
      concluirOnboarding();
      return;
    }

    await configurarComPeriodoInicial();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 px-4 py-8 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-5xl justify-end">
        <BotaoAlternarTema />
      </div>

      <main className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/85">
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
          Bem-vindo
        </span>

        <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">Gestao de Boletos</h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300">
          Esta configuracao inicial ajuda a preparar o ambiente antes do primeiro uso do sistema.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <CardDestaque
            titulo="Controle de Boletos"
            descricao="Acompanhe status de pagamento, vencimentos e atrasos em uma visao unica."
          />
          <CardDestaque
            titulo="Cadastro Rapido"
            descricao="Registre novos boletos de forma assistida para diferentes empresas."
          />
          <CardDestaque
            titulo="Importacao de Remessa"
            descricao="Importe arquivos de remessa e atualize os dados sem retrabalho manual."
          />
        </div>

        <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Configuracao inicial dos arquivos</h2>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="modo-inicial"
                checked={modoInicial === 'criar'}
                onChange={() => setModoInicial('criar')}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Criar primeiro periodo agora (padrao)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cria um arquivo anual em branco para comecar os lancamentos.</p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="modo-inicial"
                checked={modoInicial === 'existente'}
                onChange={() => setModoInicial('existente')}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Ja possuo planilhas e nao preciso criar agora</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Segue para o sistema sem criar periodo inicial.</p>
              </div>
            </label>
          </div>

          {modoInicial === 'criar' && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome da empresa</label>
                <input
                  value={nomeEmpresaInicial}
                  onChange={evento => setNomeEmpresaInicial(evento.target.value)}
                  placeholder="Ex.: Empresa Exemplo"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Ano inicial</label>
                <input
                  type="number"
                  value={anoInicial}
                  onChange={evento => setAnoInicial(evento.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </section>

        {mensagemErro && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {mensagemErro}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={aoContinuar}
            disabled={processando}
            className="inline-flex items-center rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {processando ? 'Preparando...' : 'Continuar'}
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Esta introducao aparece apenas na primeira abertura apos a instalacao.
          </p>
        </div>
      </main>
    </div>
  );
}

function CardDestaque({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{descricao}</p>
    </article>
  );
}

