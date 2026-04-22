import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BotaoAlternarTema from '../componentes/compartilhado/botao-alternar-tema';
import PainelEstatisticasCadastro from '../componentes/cadastro/painel-estatisticas-cadastro';
import { useEstatisticasEmpresa } from '../ganchos/use-estatisticas-empresa';
import { montarUrlApi } from '../servicos/api';
import { EmpresaSistema } from '../tipos/boletos';
import {
  carregarHistoricoClientes,
  carregarUltimoValor,
  salvarClienteNoHistorico,
  salvarUltimoValor,
} from '../utilitarios/historico-clientes';
import { aplicarMascaraData, aplicarMascaraNossoNumero } from '../utilitarios/mascaras';

interface EstadoNavegacaoCadastro {
  empresaSelecionada?: string;
}

interface DadosFormulario {
  empresa: string;
  cliente: string;
  nosso: string;
  valor: string;
  emiss: string;
  venc: string;
}

interface ConfiguracaoMascaraEmpresa {
  prefixoNossoNumero: string;
  tamanhoCorpoNossoNumero: number;
}

function obterConfiguracaoMascaraEmpresa(empresa: string): ConfiguracaoMascaraEmpresa {
  switch (empresa.toUpperCase()) {
    case 'CEMAVI':
      return { prefixoNossoNumero: '000', tamanhoCorpoNossoNumero: 7 };
    case 'MB':
      return { prefixoNossoNumero: '0000', tamanhoCorpoNossoNumero: 6 };
    default:
      return { prefixoNossoNumero: '', tamanhoCorpoNossoNumero: 0 };
  }
}

export default function PaginaCadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const campoCliente = useRef<HTMLInputElement>(null);
  const campoNossoNumero = useRef<HTMLInputElement>(null);
  const campoValor = useRef<HTMLInputElement>(null);
  const campoEmissao = useRef<HTMLInputElement>(null);
  const campoVencimento = useRef<HTMLInputElement>(null);
  const timerAtalhoPreenchimento = useRef<number | null>(null);
  const campoAtalhoPressionado = useRef<keyof DadosFormulario | null>(null);
  const preenchimentoCompletoExecutado = useRef(false);
  const prefixoNossoAnterior = useRef('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const empresaInicialNavegacao = (location.state as EstadoNavegacaoCadastro | null)?.empresaSelecionada || '';
  const [dadosFormulario, setDadosFormulario] = useState<DadosFormulario>({
    empresa: empresaInicialNavegacao,
    cliente: '',
    nosso: '',
    valor: '',
    emiss: '',
    venc: '',
  });

  const { data: empresas = [] } = useQuery<EmpresaSistema[]>({
    queryKey: ['empresas'],
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi('/api/empresas'));
      if (!resposta.ok) throw new Error('Erro ao buscar empresas');
      return resposta.json();
    },
  });

  const empresaSelecionada = useMemo(() => {
    if (dadosFormulario.empresa) return dadosFormulario.empresa;
    return empresas[0]?.id || '';
  }, [dadosFormulario.empresa, empresas]);
  const configuracaoMascara = useMemo(() => obterConfiguracaoMascaraEmpresa(empresaSelecionada), [empresaSelecionada]);
  const chaveHistorico = useMemo(() => `clientes-${empresaSelecionada.toLowerCase()}`, [empresaSelecionada]);
  const chaveUltimoValor = useMemo(() => `ultimo-valor-${empresaSelecionada.toLowerCase()}`, [empresaSelecionada]);
  const chaveUltimaEmissao = useMemo(() => `ultima-emissao-${empresaSelecionada.toLowerCase()}`, [empresaSelecionada]);
  const idListaClientes = useMemo(() => `clientes-${empresaSelecionada.toLowerCase()}`, [empresaSelecionada]);
  const [historicoClientes, setHistoricoClientes] = useState<string[]>([]);

  const { data: dadosPeriodosEmpresa } = useQuery<{ empresa: string; periodos: number[] }>({
    queryKey: ['excel-periodos-cadastro', empresaSelecionada],
    enabled: !!empresaSelecionada,
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi(`/api/excel/periodos?empresa=${empresaSelecionada}`));
      if (!resposta.ok) throw new Error('Erro ao buscar períodos da empresa');
      return resposta.json();
    },
  });

  const estatisticas = useEstatisticasEmpresa(empresaSelecionada, anoSelecionado);

  useEffect(() => {
    campoCliente.current?.focus();
  }, []);

  useEffect(() => {
    if (!empresaSelecionada) {
      setHistoricoClientes([]);
      return;
    }

    setHistoricoClientes(carregarHistoricoClientes(chaveHistorico));
  }, [chaveHistorico, empresaSelecionada]);

  useEffect(() => {
    const periodos = dadosPeriodosEmpresa?.periodos || [];
    if (periodos.length === 0) {
      if (anoSelecionado) {
        setAnoSelecionado('');
      }
      return;
    }

    if (anoSelecionado && !periodos.includes(Number(anoSelecionado))) {
      setAnoSelecionado('');
    }
  }, [anoSelecionado, dadosPeriodosEmpresa]);

  useEffect(() => {
    if (!empresaInicialNavegacao) {
      return;
    }

    setDadosFormulario(atual => {
      if (atual.empresa === empresaInicialNavegacao) {
        return atual;
      }

      return { ...atual, empresa: empresaInicialNavegacao };
    });
  }, [empresaInicialNavegacao]);

  useEffect(() => {
    if (!empresaSelecionada) {
      prefixoNossoAnterior.current = '';
      return;
    }

    setDadosFormulario(atual => {
      const prefixoAnterior = prefixoNossoAnterior.current;
      const prefixoAtual = configuracaoMascara.prefixoNossoNumero;
      const deveAtualizarNosso =
        atual.nosso.length === 0 ||
        atual.nosso === prefixoAnterior ||
        (prefixoAnterior.length > 0 && atual.nosso === `${prefixoAnterior}-`);

      const proximoNosso = deveAtualizarNosso ? prefixoAtual : atual.nosso;

      if (atual.empresa === empresaSelecionada && atual.nosso === proximoNosso) {
        return atual;
      }

      return {
        ...atual,
        empresa: empresaSelecionada,
        nosso: proximoNosso,
      };
    });

    prefixoNossoAnterior.current = configuracaoMascara.prefixoNossoNumero;
  }, [configuracaoMascara.prefixoNossoNumero, empresaSelecionada]);

  const atualizarCampo = (campo: keyof DadosFormulario, valor: string) => {
    if (campo === 'emiss' || campo === 'venc') {
      valor = aplicarMascaraData(valor);
    } else if (campo === 'nosso' && configuracaoMascara.tamanhoCorpoNossoNumero > 0) {
      valor = aplicarMascaraNossoNumero(
        valor,
        configuracaoMascara.prefixoNossoNumero,
        configuracaoMascara.tamanhoCorpoNossoNumero
      );
    }

    setDadosFormulario(atual => ({ ...atual, [campo]: valor }));
  };

  const preencherCampoComUltimoValor = (campo: keyof DadosFormulario) => {
    if (campo === 'cliente') {
      const ultimoCliente = historicoClientes[0] || '';
      if (ultimoCliente) {
        setDadosFormulario(atual => ({ ...atual, cliente: ultimoCliente }));
      }
    }

    if (campo === 'valor') {
      const ultimoValor = carregarUltimoValor(chaveUltimoValor);
      if (ultimoValor) {
        setDadosFormulario(atual => ({ ...atual, valor: ultimoValor }));
      }
    }

    if (campo === 'emiss') {
      const ultimaEmissao = carregarUltimoValor(chaveUltimaEmissao);
      if (ultimaEmissao) {
        setDadosFormulario(atual => ({ ...atual, emiss: ultimaEmissao }));
      }
    }
  };

  const preencherCamposRepetitivos = () => {
    const ultimoCliente = historicoClientes[0] || '';
    const ultimoValor = carregarUltimoValor(chaveUltimoValor);
    const ultimaEmissao = carregarUltimoValor(chaveUltimaEmissao);

    setDadosFormulario(atual => ({
      ...atual,
      cliente: ultimoCliente || atual.cliente,
      valor: ultimoValor || atual.valor,
      emiss: ultimaEmissao || atual.emiss,
    }));
  };

  const limparAtalhoPressionado = () => {
    if (timerAtalhoPreenchimento.current !== null) {
      window.clearTimeout(timerAtalhoPreenchimento.current);
      timerAtalhoPreenchimento.current = null;
    }

    campoAtalhoPressionado.current = null;
    preenchimentoCompletoExecutado.current = false;
  };

  const aoPressionarTecla = (
    evento: React.KeyboardEvent<HTMLInputElement>,
    proximoCampo?: React.RefObject<HTMLInputElement>
  ) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      proximoCampo?.current?.focus();
    }

    if (
      evento.key === ' ' &&
      evento.ctrlKey &&
      (evento.currentTarget.name === 'cliente' || evento.currentTarget.name === 'valor' || evento.currentTarget.name === 'emiss')
    ) {
      evento.preventDefault();
      const campoAtual = evento.currentTarget.name as keyof DadosFormulario;

      if (!evento.repeat && timerAtalhoPreenchimento.current === null) {
        campoAtalhoPressionado.current = campoAtual;
        preenchimentoCompletoExecutado.current = false;
        timerAtalhoPreenchimento.current = window.setTimeout(() => {
          preencherCamposRepetitivos();
          preenchimentoCompletoExecutado.current = true;
          timerAtalhoPreenchimento.current = null;
        }, 1500);
      }
    }

    if (evento.currentTarget.name === 'nosso' && configuracaoMascara.prefixoNossoNumero) {
      const inicioSelecao = evento.currentTarget.selectionStart || 0;
      if (inicioSelecao <= configuracaoMascara.prefixoNossoNumero.length && (evento.key === 'Backspace' || evento.key === 'Delete')) {
        evento.preventDefault();
      }

      if (evento.key === '-') {
        evento.preventDefault();
      }
    }
  };

  const aoSoltarTecla = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== ' ') {
      return;
    }

    if (!campoAtalhoPressionado.current) {
      return;
    }

    const campoPressionado = campoAtalhoPressionado.current;
    const houvePreenchimentoCompleto = preenchimentoCompletoExecutado.current;

    limparAtalhoPressionado();

    if (!houvePreenchimentoCompleto) {
      preencherCampoComUltimoValor(campoPressionado);
    }
  };

  const limparFormulario = (empresa: string) => {
    const configuracaoEmpresa = obterConfiguracaoMascaraEmpresa(empresa);
    setDadosFormulario({
      empresa,
      cliente: '',
      nosso: configuracaoEmpresa.prefixoNossoNumero,
      valor: '',
      emiss: '',
      venc: '',
    });
  };

  const aoVoltar = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setMensagem(null);

    const empresa = dadosFormulario.empresa || empresas[0]?.id || '';
    if (!empresa) {
      setMensagem({ texto: 'Selecione uma empresa antes de registrar o boleto.', tipo: 'error' });
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(montarUrlApi('/api/boletos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa,
          cliente: dadosFormulario.cliente,
          nosso: dadosFormulario.nosso,
          valor: dadosFormulario.valor,
          emiss: dadosFormulario.emiss,
          venc: dadosFormulario.venc,
        }),
      });

      const resultado = await resposta.json();
      if (!resposta.ok) {
        setMensagem({ texto: `Erro: ${resultado.erro || 'Falha ao registrar boleto.'}`, tipo: 'error' });
        return;
      }

      setMensagem({ texto: `Gravado em ${resultado.arquivo} > ${resultado.aba}`, tipo: 'success' });
      const historicoAtualizado = salvarClienteNoHistorico(chaveHistorico, dadosFormulario.cliente);
      setHistoricoClientes(historicoAtualizado);
      salvarUltimoValor(chaveUltimoValor, dadosFormulario.valor);
      salvarUltimoValor(chaveUltimaEmissao, dadosFormulario.emiss);
      limparFormulario(empresa);
      setTimeout(() => campoCliente.current?.focus(), 100);
    } catch (erro) {
      console.error('Erro ao registrar boleto:', erro);
      setMensagem({ texto: 'Erro ao conectar com o servidor.', tipo: 'error' });
    } finally {
      setCarregando(false);
    }
  };

  const classesInput = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
  const placeholderNossoNumero = configuracaoMascara.prefixoNossoNumero
    ? `${configuracaoMascara.prefixoNossoNumero}${'_'.repeat(Math.max(configuracaoMascara.tamanhoCorpoNossoNumero - 2, 0))}-__`
    : 'Digite o nosso número';

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Registrar Boleto</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Selecione a empresa e preencha os dados para criar um novo boleto.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotaoAlternarTema />
              <button
                onClick={aoVoltar}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white px-6 py-8 shadow dark:bg-slate-900 dark:shadow-black/20">
              {empresaSelecionada && (dadosPeriodosEmpresa?.periodos || []).length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <label htmlFor="filtro-ano-cadastro" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Período (ano):
                  </label>
                  <select
                    id="filtro-ano-cadastro"
                    value={anoSelecionado}
                    onChange={evento => setAnoSelecionado(evento.target.value)}
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

              <form onSubmit={aoEnviar} className="space-y-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Empresa *</label>
                  <select
                    value={empresaSelecionada}
                    onChange={evento => atualizarCampo('empresa', evento.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {empresas.map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Cliente *</label>
                  <input
                    ref={campoCliente}
                    type="text"
                    name="cliente"
                    required
                    value={dadosFormulario.cliente}
                    onChange={evento => atualizarCampo('cliente', evento.target.value)}
                    onKeyDown={evento => aoPressionarTecla(evento, campoNossoNumero)}
                    onKeyUp={aoSoltarTecla}
                    onBlur={limparAtalhoPressionado}
                    list={idListaClientes}
                    autoComplete="off"
                    className={classesInput}
                  />
                  <datalist id={idListaClientes}>
                    {historicoClientes.map(cliente => (
                      <option key={cliente} value={cliente} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dica: Ctrl + Space repete este campo. Segure por 1,5 segundo para preencher cliente, valor e emissão.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Nosso Número *</label>
                    <input
                      ref={campoNossoNumero}
                      type="text"
                      name="nosso"
                      required
                      value={dadosFormulario.nosso}
                      onChange={evento => atualizarCampo('nosso', evento.target.value)}
                      onKeyDown={evento => aoPressionarTecla(evento, campoValor)}
                      placeholder={placeholderNossoNumero}
                      className={classesInput}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Valor *</label>
                    <input
                      ref={campoValor}
                      type="text"
                      name="valor"
                      required
                      value={dadosFormulario.valor}
                      onChange={evento => atualizarCampo('valor', evento.target.value)}
                      onKeyDown={evento => aoPressionarTecla(evento, campoEmissao)}
                      onKeyUp={aoSoltarTecla}
                      onBlur={limparAtalhoPressionado}
                      placeholder="R$ 0,00"
                      className={classesInput}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dica: Ctrl + Space repete este campo. Segure por 1,5 segundo para preencher cliente, valor e emissão.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Emissão *</label>
                    <input
                      ref={campoEmissao}
                      type="text"
                      name="emiss"
                      required
                      value={dadosFormulario.emiss}
                      onChange={evento => atualizarCampo('emiss', evento.target.value)}
                      onKeyDown={evento => aoPressionarTecla(evento, campoVencimento)}
                      onKeyUp={aoSoltarTecla}
                      onBlur={limparAtalhoPressionado}
                      placeholder="DD/MM/AAAA"
                      className={classesInput}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dica: Ctrl + Space repete este campo. Segure por 1,5 segundo para preencher cliente, valor e emissão.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Vencimento *</label>
                    <input
                      ref={campoVencimento}
                      type="text"
                      name="venc"
                      required
                      value={dadosFormulario.venc}
                      onChange={evento => atualizarCampo('venc', evento.target.value)}
                      placeholder="DD/MM/AAAA"
                      className={classesInput}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {carregando ? 'Registrando...' : 'Registrar Boleto'}
                </button>
              </form>

              {mensagem && (
                <div
                  className={`mt-4 rounded-md p-4 ${
                    mensagem.tipo === 'success'
                      ? 'bg-green-50 text-green-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                  }`}
                >
                  <p className="text-sm font-medium">{mensagem.texto}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <PainelEstatisticasCadastro empresa={empresaSelecionada || '-'} estatisticas={empresaSelecionada ? estatisticas : null} />
          </div>
        </div>
      </div>
    </div>
  );
}

