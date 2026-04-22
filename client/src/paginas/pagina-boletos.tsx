import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import CardsResumo from '../componentes/boletos/cards-resumo';
import PainelFiltros from '../componentes/boletos/painel-filtros';
import TabelaBoletos from '../componentes/boletos/tabela-boletos';
import BotaoAlternarTema from '../componentes/compartilhado/botao-alternar-tema';
import { montarUrlApi } from '../servicos/api';
import { parsearArquivoRemessa } from '../servicos/parser-remessa';
import { EmpresaSistema, ModoResumoBusca, RespostaBoletos } from '../tipos/boletos';

const CHAVE_ANO_POR_EMPRESA = 'filtro-ano-empresa-boletos-v1';
const CAMPOS_PADRAO_EMPRESA = ['CLIENTE', 'NOSSO NUMERO', 'VALOR', 'EMISSAO', 'VENCIMENTO', 'SITUACAO'];

function carregarFiltroAnoMemoria(): Record<string, string> {
  try {
    const salvo = window.localStorage.getItem(CHAVE_ANO_POR_EMPRESA);
    if (!salvo) return {};
    const json = JSON.parse(salvo) as Record<string, string>;
    return typeof json === 'object' && json !== null ? json : {};
  } catch {
    return {};
  }
}

function salvarFiltroAnoMemoria(mapa: Record<string, string>) {
  window.localStorage.setItem(CHAVE_ANO_POR_EMPRESA, JSON.stringify(mapa));
}

export default function PaginaBoletos() {
  const navigate = useNavigate();
  const inputArquivoRemessaRef = useRef<HTMLInputElement | null>(null);
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [filtroAnoMemoria, setFiltroAnoMemoria] = useState<Record<string, string>>(() => carregarFiltroAnoMemoria());
  const [empresaGerenciamento, setEmpresaGerenciamento] = useState('');
  const [mes, setMes] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [modoResumoBusca, setModoResumoBusca] = useState<ModoResumoBusca>('geral');
  const [ordenacao, setOrdenacao] = useState({ campo: 'vencimento', direcao: 'asc' as 'asc' | 'desc' });
  const [pagina, setPagina] = useState(1);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [importandoRemessa, setImportandoRemessa] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [modalEmpresaAberto, setModalEmpresaAberto] = useState(false);
  const [nomeNovaEmpresa, setNomeNovaEmpresa] = useState('');
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>(CAMPOS_PADRAO_EMPRESA);
  const [novaTabela, setNovaTabela] = useState('');
  const [tabelasExtras, setTabelasExtras] = useState<string[]>([]);
  const [cadastrandoEmpresa, setCadastrandoEmpresa] = useState(false);
  const [novoAnoEmBranco, setNovoAnoEmBranco] = useState(() => String(new Date().getFullYear()));
  const [gerenciandoPeriodo, setGerenciandoPeriodo] = useState(false);
  const [modoDownloadExcel, setModoDownloadExcel] = useState<'ano' | 'todos'>('ano');
  const [anoDownload, setAnoDownload] = useState('');
  const [baixandoExcel, setBaixandoExcel] = useState(false);
  const pageSize = 50;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBuscaDebounced(busca);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [busca]);

  const {
    data: empresas = [],
    isLoading: carregandoEmpresas,
    refetch: refetchEmpresas,
  } = useQuery<EmpresaSistema[]>({
    queryKey: ['empresas'],
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi('/api/empresas'));
      if (!resposta.ok) throw new Error('Erro ao buscar empresas');
      return resposta.json();
    },
  });

  useEffect(() => {
    if (empresas.length === 0) {
      setEmpresaSelecionada('');
      setEmpresaGerenciamento('');
      return;
    }

    if (!empresaSelecionada || !empresas.some(item => item.id === empresaSelecionada)) {
      setEmpresaSelecionada(empresas[0].id);
    }

    if (!empresaGerenciamento || !empresas.some(item => item.id === empresaGerenciamento)) {
      setEmpresaGerenciamento(empresas[0].id);
    }
  }, [empresas, empresaSelecionada, empresaGerenciamento]);

  const nomeEmpresaAtual = useMemo(
    () => empresas.find(item => item.id === empresaSelecionada)?.nome || empresaSelecionada,
    [empresas, empresaSelecionada]
  );

  const { data: dadosPeriodosEmpresa, refetch: refetchPeriodosEmpresa } = useQuery<{ empresa: string; periodos: number[] }>({
    queryKey: ['excel-periodos-empresa', empresaSelecionada],
    enabled: !!empresaSelecionada,
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi(`/api/excel/periodos?empresa=${empresaSelecionada}`));
      if (!resposta.ok) throw new Error('Erro ao buscar periodos da empresa');
      return resposta.json();
    },
  });

  useEffect(() => {
    const periodos = dadosPeriodosEmpresa?.periodos || [];
    if (!empresaSelecionada) {
      return;
    }

    const anoSalvo = filtroAnoMemoria[empresaSelecionada] || '';
    if (!anoSalvo) {
      setAnoSelecionado('');
      return;
    }

    if (periodos.includes(Number(anoSalvo))) {
      setAnoSelecionado(anoSalvo);
      return;
    }

    setAnoSelecionado('');
  }, [dadosPeriodosEmpresa, empresaSelecionada, filtroAnoMemoria]);

  const { data: meses = [], refetch: refetchMeses } = useQuery<string[]>({
    queryKey: ['meses', empresaSelecionada, anoSelecionado],
    enabled: !!empresaSelecionada,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('empresa', empresaSelecionada);
      if (anoSelecionado) {
        params.append('ano', anoSelecionado);
      }
      const resposta = await fetch(montarUrlApi(`/api/meses?${params.toString()}`));
      if (!resposta.ok) throw new Error('Erro ao buscar meses');
      return resposta.json();
    },
  });

  const montarParametrosBoletos = ({
    incluirBusca,
    paginaConsulta = pagina,
    tamanhoPagina = pageSize,
  }: {
    incluirBusca: boolean;
    paginaConsulta?: number;
    tamanhoPagina?: number;
  }) => {
    const params = new URLSearchParams();
    params.append('empresa', empresaSelecionada);
    if (anoSelecionado) params.append('ano', anoSelecionado);
    if (mes) params.append('mes', mes);
    if (status) params.append('status', status);
    if (incluirBusca && buscaDebounced) params.append('q', buscaDebounced);
    params.append('sort', ordenacao.campo);
    params.append('dir', ordenacao.direcao);
    params.append('page', paginaConsulta.toString());
    params.append('pageSize', tamanhoPagina.toString());
    return params;
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery<RespostaBoletos>({
    queryKey: ['boletos', empresaSelecionada, anoSelecionado, mes, status, buscaDebounced, ordenacao.campo, ordenacao.direcao, pagina],
    enabled: !!empresaSelecionada,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = montarParametrosBoletos({ incluirBusca: true });
      const resposta = await fetch(montarUrlApi(`/api/boletos?${params}`));
      if (!resposta.ok) throw new Error('Erro ao buscar boletos');
      return resposta.json();
    },
  });

  const { data: dadosResumoGeral } = useQuery<RespostaBoletos>({
    queryKey: ['resumo-geral', empresaSelecionada, anoSelecionado, mes, status, ordenacao.campo, ordenacao.direcao],
    enabled: !!empresaSelecionada && modoResumoBusca === 'geral' && buscaDebounced.trim().length > 0,
    queryFn: async () => {
      const params = montarParametrosBoletos({ incluirBusca: false, paginaConsulta: 1, tamanhoPagina: 1 });
      const resposta = await fetch(montarUrlApi(`/api/boletos?${params}`));
      if (!resposta.ok) throw new Error('Erro ao buscar resumo geral');
      return resposta.json();
    },
  });

  const {
    data: dadosPeriodosGerenciamento,
    refetch: refetchPeriodosGerenciamento,
  } = useQuery<{ empresa: string; periodos: number[] }>({
    queryKey: ['excel-periodos', empresaGerenciamento],
    enabled: !!empresaGerenciamento,
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi(`/api/excel/periodos?empresa=${empresaGerenciamento}`));
      if (!resposta.ok) throw new Error('Erro ao buscar periodos');
      return resposta.json();
    },
  });

  useEffect(() => {
    const periodos = dadosPeriodosGerenciamento?.periodos || [];
    if (periodos.length === 0) {
      setAnoDownload('');
      return;
    }

    const maiorPeriodo = String(Math.max(...periodos));
    if (!anoDownload || !periodos.includes(Number(anoDownload))) {
      setAnoDownload(maiorPeriodo);
    }
  }, [dadosPeriodosGerenciamento, anoDownload]);

  const resumoCards = modoResumoBusca === 'pesquisa' ? data?.resumo : dadosResumoGeral?.resumo ?? data?.resumo;

  const aoSelecionarEmpresa = (empresaId: string) => {
    setEmpresaSelecionada(empresaId);
    setAnoSelecionado(filtroAnoMemoria[empresaId] || '');
    setMes('');
    setStatus('');
    setBusca('');
    setPagina(1);
  };

  const aoSelecionarAno = (valor: string) => {
    setAnoSelecionado(valor);
    setMes('');
    setPagina(1);

    if (!empresaSelecionada) {
      return;
    }

    const atualizado = {
      ...filtroAnoMemoria,
      [empresaSelecionada]: valor,
    };
    setFiltroAnoMemoria(atualizado);
    salvarFiltroAnoMemoria(atualizado);
  };

  const cadastrarNovaEmpresa = async () => {
    const nome = nomeNovaEmpresa.trim();
    if (!nome) {
      alert('Informe o nome da empresa.');
      return;
    }

    try {
      setCadastrandoEmpresa(true);
      const resposta = await fetch(montarUrlApi('/api/empresas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          camposPadrao: camposSelecionados,
          tabelas: tabelasExtras,
        }),
      });

      const resultado = await resposta.json();
      if (!resposta.ok) {
        alert(resultado.erro || 'Nao foi possivel cadastrar a empresa.');
        return;
      }

      setNomeNovaEmpresa('');
      setCamposSelecionados(CAMPOS_PADRAO_EMPRESA);
      setNovaTabela('');
      setTabelasExtras([]);
      setModalEmpresaAberto(false);
      await refetchEmpresas();
      setEmpresaSelecionada(resultado.empresa.id);
      setEmpresaGerenciamento(resultado.empresa.id);
      alert(`Empresa "${resultado.empresa.nome}" cadastrada com sucesso.`);
    } catch (erro) {
      console.error('Erro ao cadastrar empresa:', erro);
      alert('Nao foi possivel cadastrar a empresa.');
    } finally {
      setCadastrandoEmpresa(false);
    }
  };

  const alternarCampoSelecionado = (campo: string) => {
    setCamposSelecionados(atual =>
      atual.includes(campo) ? atual.filter(item => item !== campo) : [...atual, campo]
    );
  };

  const adicionarTabelaExtra = () => {
    const nome = novaTabela.trim();
    if (!nome) return;
    if (tabelasExtras.some(item => item.toUpperCase() === nome.toUpperCase())) {
      setNovaTabela('');
      return;
    }
    setTabelasExtras(atual => [...atual, nome]);
    setNovaTabela('');
  };

  const removerTabelaExtra = (nome: string) => {
    setTabelasExtras(atual => atual.filter(item => item !== nome));
  };

  const criarPeriodoEmBranco = async () => {
    if (!empresaGerenciamento || !novoAnoEmBranco) {
      alert('Informe empresa e ano para criar o novo periodo.');
      return;
    }

    try {
      setGerenciandoPeriodo(true);
      const resposta = await fetch(montarUrlApi('/api/excel/periodo-em-branco'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: empresaGerenciamento,
          ano: Number(novoAnoEmBranco),
        }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) {
        alert(resultado.erro || 'Nao foi possivel criar o periodo em branco.');
        return;
      }

      alert(`Periodo criado com sucesso: ${resultado.arquivo}`);
      await Promise.all([refetchMeses(), refetch(), refetchPeriodosEmpresa(), refetchPeriodosGerenciamento()]);
    } catch (erro) {
      console.error('Erro ao criar periodo em branco:', erro);
      alert('Nao foi possivel criar o periodo em branco.');
    } finally {
      setGerenciandoPeriodo(false);
    }
  };

  const baixarExcel = async () => {
    if (!empresaGerenciamento) {
      alert('Selecione uma empresa para baixar os dados.');
      return;
    }

    if (modoDownloadExcel === 'ano' && !anoDownload) {
      alert('Selecione o ano do arquivo que deseja baixar.');
      return;
    }

    try {
      setBaixandoExcel(true);
      const params = new URLSearchParams();
      params.append('empresa', empresaGerenciamento);
      params.append('ano', modoDownloadExcel === 'todos' ? 'todos' : anoDownload);
      const resposta = await fetch(montarUrlApi(`/api/excel/download?${params.toString()}`));
      if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.erro || 'Erro no download do Excel');
      }

      const blob = await resposta.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        modoDownloadExcel === 'todos'
          ? `${empresaGerenciamento.toLowerCase()}_consolidado.xlsx`
          : `${empresaGerenciamento.toLowerCase()}_${anoDownload}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (erro) {
      console.error('Erro ao baixar Excel:', erro);
      alert(erro instanceof Error ? erro.message : 'Nao foi possivel baixar o Excel.');
    } finally {
      setBaixandoExcel(false);
    }
  };

  const exportarPdfAtrasos = async () => {
    setBaixandoPdf(true);
    try {
      const params = new URLSearchParams();
      if (empresaSelecionada) params.append('empresa', empresaSelecionada);
      if (anoSelecionado) params.append('ano', anoSelecionado);
      const resposta = await fetch(montarUrlApi(`/api/boletos/atrasos.pdf?${params.toString()}`));
      if (!resposta.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await resposta.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boletos_atrasados_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (erro) {
      console.error('Erro ao exportar PDF:', erro);
      alert('Erro ao gerar PDF de boletos em atraso. Tente novamente.');
    } finally {
      setBaixandoPdf(false);
    }
  };

  const importarArquivoRemessa = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';

    if (!arquivo || !empresaSelecionada) {
      return;
    }

    if (!arquivo.name.toLowerCase().endsWith('.txt')) {
      alert('Selecione um arquivo .txt de remessa valido.');
      return;
    }

    try {
      setImportandoRemessa(true);
      const conteudo = await arquivo.text();
      const resultadoParse = parsearArquivoRemessa(conteudo);
      const { registros, linhasInvalidas } = resultadoParse;

      if (registros.length === 0) {
        alert('Arquivo vazio, fora do padrao esperado ou sem registros de detalhe validos.');
        return;
      }

      let importados = 0;
      let rejeitados = 0;

      for (const registro of registros) {
        const resposta = await fetch(montarUrlApi('/api/boletos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa: empresaSelecionada,
            cliente: registro.cliente.trim(),
            nosso: registro.nossoNumero.trim(),
            valor: registro.valor,
            emiss: registro.emissao,
            venc: registro.vencimento,
          }),
        });

        if (resposta.ok) {
          importados += 1;
        } else {
          rejeitados += 1;
        }
      }

      if (importados > 0) {
        setPagina(1);
        await Promise.all([refetch(), refetchMeses()]);
      }

      if (importados === 0) {
        alert('Nenhum boleto da remessa foi importado. Verifique se os registros ja existem ou se o arquivo esta fora do padrao esperado.');
        return;
      }

      const partesMensagem = [`Remessa importada com sucesso. ${importados} boleto(s) importado(s).`];
      if (rejeitados > 0) {
        partesMensagem.push(`${rejeitados} registro(s) rejeitado(s) pelo cadastro.`);
      }
      if (linhasInvalidas > 0) {
        partesMensagem.push(`${linhasInvalidas} linha(s) invalida(s) ignorada(s).`);
      }

      alert(partesMensagem.join(' '));
    } catch (erro) {
      console.error('Erro ao importar remessa:', erro);
      alert('Nao foi possivel importar a remessa. Verifique o formato do arquivo e tente novamente.');
    } finally {
      setImportandoRemessa(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-slate-950">
      <button
        type="button"
        onClick={() => setSidebarAberta(valor => !valor)}
        className="fixed left-4 top-24 z-40 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-md transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        title="Gerenciar planilhas"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide">Menu Excel</span>
      </button>

      {sidebarAberta && (
        <button type="button" className="fixed inset-0 z-30 bg-black/30" onClick={() => setSidebarAberta(false)} aria-label="Fechar painel lateral" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 transform overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Gestao de Excel</h2>
          <button
            type="button"
            onClick={() => setSidebarAberta(false)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Aqui voce pode cadastrar empresas, criar novos anos em branco e baixar os arquivos Excel por periodo ou consolidados.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cadastro de Empresas</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Crie novas empresas e personalize os campos/tabelas iniciais no cadastro.
            </p>
            <button
              type="button"
              onClick={() => setModalEmpresaAberto(true)}
              className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Adicionar empresa
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adicionar novo ano</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cria um novo periodo anual em branco, mantendo apenas a estrutura das abas.
            </p>
            <div className="mt-3 space-y-2">
              <select
                value={empresaGerenciamento}
                onChange={evento => setEmpresaGerenciamento(evento.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {empresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={novoAnoEmBranco}
                onChange={evento => setNovoAnoEmBranco(evento.target.value)}
                placeholder="Ano"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={criarPeriodoEmBranco}
                disabled={gerenciandoPeriodo}
                className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {gerenciandoPeriodo ? 'Criando...' : 'Criar ano em branco'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Baixar dados</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Escolha baixar um arquivo anual especifico ou um consolidado unico com todos os anos.
            </p>
            <div className="mt-3 space-y-2">
              <select
                value={empresaGerenciamento}
                onChange={evento => setEmpresaGerenciamento(evento.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {empresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModoDownloadExcel('ano')}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    modoDownloadExcel === 'ano'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  Ano especifico
                </button>
                <button
                  type="button"
                  onClick={() => setModoDownloadExcel('todos')}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    modoDownloadExcel === 'todos'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  Todos os anos
                </button>
              </div>

              {modoDownloadExcel === 'ano' && (
                <select
                  value={anoDownload}
                  onChange={evento => setAnoDownload(evento.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {(dadosPeriodosGerenciamento?.periodos || []).map(periodo => (
                    <option key={periodo} value={periodo}>
                      {periodo}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={baixarExcel}
                disabled={baixandoExcel}
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {baixandoExcel ? 'Baixando...' : 'Baixar Excel'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {modalEmpresaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Adicionar empresa</h3>
              <button
                type="button"
                onClick={() => setModalEmpresaAberto(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome da empresa</label>
                <input
                  value={nomeNovaEmpresa}
                  onChange={evento => setNomeNovaEmpresa(evento.target.value)}
                  placeholder="Ex.: Empresa Exemplo"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Campos padrao disponiveis
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
                  {CAMPOS_PADRAO_EMPRESA.map(campo => (
                    <label key={campo} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={camposSelecionados.includes(campo)}
                        onChange={() => alternarCampoSelecionado(campo)}
                      />
                      <span>{campo}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Criacao de novas tabelas
                </label>
                <div className="flex gap-2">
                  <input
                    value={novaTabela}
                    onChange={evento => setNovaTabela(evento.target.value)}
                    placeholder="Nome da tabela (ex.: RECEBIMENTOS)"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={adicionarTabelaExtra}
                    className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
                  >
                    Adicionar
                  </button>
                </div>
                {tabelasExtras.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tabelasExtras.map(tabela => (
                      <button
                        key={tabela}
                        type="button"
                        onClick={() => removerTabelaExtra(tabela)}
                        className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        title="Remover tabela"
                      >
                        {tabela} x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalEmpresaAberto(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={cadastrarNovaEmpresa}
                disabled={cadastrandoEmpresa}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {cadastrandoEmpresa ? 'Salvando...' : 'Salvar empresa'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Gestao de Boletos</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Visualize e gerencie todos os boletos cadastrados por empresa.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <BotaoAlternarTema />
              <button
                onClick={() => navigate('/cadastro', { state: { empresaSelecionada } })}
                className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Boleto
              </button>
            </div>
          </div>

          {carregandoEmpresas ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Carregando empresas...
            </div>
          ) : empresas.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Nenhuma empresa cadastrada. Abra o menu lateral para cadastrar a primeira empresa.
            </div>
          ) : (
            <div className="border-b border-gray-200 dark:border-slate-800">
              <nav className="-mb-px flex flex-wrap gap-6" aria-label="Empresas">
                {empresas.map(empresa => (
                  <button
                    key={empresa.id}
                    onClick={() => aoSelecionarEmpresa(empresa.id)}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                      empresaSelecionada === empresa.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {empresa.nome}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {empresaSelecionada && (dadosPeriodosEmpresa?.periodos || []).length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="filtro-ano" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Período (ano):
              </label>
              <select
                id="filtro-ano"
                value={anoSelecionado}
                onChange={evento => aoSelecionarAno(evento.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Todos</option>
                {(dadosPeriodosEmpresa?.periodos || []).map(periodo => (
                  <option key={periodo} value={periodo}>
                    {periodo}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {empresaSelecionada && resumoCards && <CardsResumo resumo={resumoCards} />}

        {empresaSelecionada && (
          <PainelFiltros
            meses={meses}
            mesAtual={mes}
            statusAtual={status}
            buscaAtual={busca}
            modoResumoBusca={modoResumoBusca}
            buscando={isFetching && !!data}
            aoMudarMes={novoMes => {
              setMes(novoMes);
              setPagina(1);
            }}
            aoMudarStatus={novoStatus => {
              setStatus(novoStatus);
              setPagina(1);
            }}
            aoMudarBusca={novaBusca => {
              setBusca(novaBusca);
              setPagina(1);
            }}
            aoMudarModoResumoBusca={setModoResumoBusca}
          />
        )}

        {empresaSelecionada && (
          <div className="mb-4 flex justify-end gap-2">
            <input
              ref={inputArquivoRemessaRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={importarArquivoRemessa}
            />

            <button
              onClick={() => inputArquivoRemessaRef.current?.click()}
              disabled={importandoRemessa}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={`Importar remessa para ${nomeEmpresaAtual}`}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {importandoRemessa ? 'Importando...' : 'Importar Remessa'}
            </button>

            <button
              onClick={exportarPdfAtrasos}
              disabled={baixandoPdf}
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {baixandoPdf ? 'Gerando...' : 'Exportar PDF (Atrasos)'}
            </button>
          </div>
        )}

        {!empresaSelecionada && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Cadastre uma empresa para começar a gerenciar os boletos.
          </div>
        )}

        {empresaSelecionada && !data && isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        )}

        {empresaSelecionada && error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Erro ao carregar boletos</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => refetch()}
                className="text-sm font-medium text-red-800 hover:text-red-600 dark:text-red-200 dark:hover:text-red-100"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {empresaSelecionada && !isLoading && !error && data && (
          <TabelaBoletos
            boletos={data.boletos}
            ordenacao={ordenacao}
            aoOrdenar={campo => {
              setOrdenacao(atual => ({
                campo,
                direcao: atual.campo === campo && atual.direcao === 'asc' ? 'desc' : 'asc',
              }));
              setPagina(1);
            }}
            paginaAtual={data.pagination.page}
            totalPaginas={data.pagination.totalPages}
            aoMudarPagina={setPagina}
          />
        )}

        {empresaSelecionada && data && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
            {data.pagination.total} boleto(s) encontrado(s)
          </div>
        )}
      </div>
    </div>
  );
}
