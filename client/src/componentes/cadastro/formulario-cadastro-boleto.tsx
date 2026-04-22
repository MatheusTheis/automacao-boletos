import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PainelEstatisticasCadastro from './painel-estatisticas-cadastro';
import { useEstatisticasEmpresa } from '../../ganchos/use-estatisticas-empresa';
import BotaoAlternarTema from '../compartilhado/botao-alternar-tema';
import {
  carregarHistoricoClientes,
  carregarUltimoValor,
  salvarClienteNoHistorico,
  salvarUltimoValor,
} from '../../utilitarios/historico-clientes';
import { aplicarMascaraData, aplicarMascaraNossoNumero } from '../../utilitarios/mascaras';
import { DadosFormularioBoleto, Empresa } from '../../tipos/boletos';
import { montarUrlApi } from '../../servicos/api';

interface ConfiguracaoFormularioCadastro {
  empresa: Empresa;
  tituloPagina: string;
  descricaoPagina: string;
  rotaAlternativa: string;
  textoBotaoAlternativo: string;
  prefixoNossoNumero: string;
  tamanhoCorpoNossoNumero: number;
  classesTema: {
    primario: string;
    foco: string;
    secundario: string;
  };
}

interface MensagemFormulario {
  texto: string;
  tipo: 'success' | 'error';
}

export default function FormularioCadastroBoleto({ configuracao }: { configuracao: ConfiguracaoFormularioCadastro }) {
  const navigate = useNavigate();
  const estatisticas = useEstatisticasEmpresa(configuracao.empresa);
  const chaveHistorico = `clientes-${configuracao.empresa.toLowerCase()}`;
  const chaveUltimoValor = `ultimo-valor-${configuracao.empresa.toLowerCase()}`;
  const chaveUltimaEmissao = `ultima-emissao-${configuracao.empresa.toLowerCase()}`;
  const [historicoClientes, setHistoricoClientes] = useState<string[]>(() => carregarHistoricoClientes(chaveHistorico));
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemFormulario | null>(null);
  const [dadosFormulario, setDadosFormulario] = useState<DadosFormularioBoleto>({
    empresa: configuracao.empresa,
    cliente: '',
    nosso: configuracao.prefixoNossoNumero,
    valor: '',
    emiss: '',
    venc: '',
  });

  const campoCliente = useRef<HTMLInputElement>(null);
  const campoNossoNumero = useRef<HTMLInputElement>(null);
  const campoValor = useRef<HTMLInputElement>(null);
  const campoEmissao = useRef<HTMLInputElement>(null);
  const campoVencimento = useRef<HTMLInputElement>(null);
  const timerAtalhoPreenchimento = useRef<number | null>(null);
  const campoAtalhoPressionado = useRef<keyof DadosFormularioBoleto | null>(null);
  const preenchimentoCompletoExecutado = useRef(false);

  const atualizarCampo = (campo: keyof DadosFormularioBoleto, valor: string) => {
    if (campo === 'emiss' || campo === 'venc') {
      valor = aplicarMascaraData(valor);
    } else if (campo === 'nosso') {
      valor = aplicarMascaraNossoNumero(valor, configuracao.prefixoNossoNumero, configuracao.tamanhoCorpoNossoNumero);
    }

    setDadosFormulario(estadoAtual => ({ ...estadoAtual, [campo]: valor }));
  };

  const preencherCampoComUltimoValor = (campo: keyof DadosFormularioBoleto) => {
    if (campo === 'cliente') {
      const ultimoCliente = historicoClientes[0] || '';
      if (ultimoCliente) {
        setDadosFormulario(estadoAtual => ({ ...estadoAtual, cliente: ultimoCliente }));
      }
    }

    if (campo === 'valor') {
      const ultimoValor = carregarUltimoValor(chaveUltimoValor);
      if (ultimoValor) {
        setDadosFormulario(estadoAtual => ({ ...estadoAtual, valor: ultimoValor }));
      }
    }

    if (campo === 'emiss') {
      const ultimaEmissao = carregarUltimoValor(chaveUltimaEmissao);
      if (ultimaEmissao) {
        setDadosFormulario(estadoAtual => ({ ...estadoAtual, emiss: ultimaEmissao }));
      }
    }
  };

  const preencherCamposRepetitivos = () => {
    const ultimoCliente = historicoClientes[0] || '';
    const ultimoValor = carregarUltimoValor(chaveUltimoValor);
    const ultimaEmissao = carregarUltimoValor(chaveUltimaEmissao);

    setDadosFormulario(estadoAtual => ({
      ...estadoAtual,
      cliente: ultimoCliente || estadoAtual.cliente,
      valor: ultimoValor || estadoAtual.valor,
      emiss: ultimaEmissao || estadoAtual.emiss,
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
      const campoAtual = evento.currentTarget.name as keyof DadosFormularioBoleto;

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

    if (evento.currentTarget.name === 'nosso') {
      const inicioSelecao = evento.currentTarget.selectionStart || 0;
      if (inicioSelecao <= configuracao.prefixoNossoNumero.length && (evento.key === 'Backspace' || evento.key === 'Delete')) {
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

  const limparFormulario = () => {
    setDadosFormulario({
      empresa: configuracao.empresa,
      cliente: '',
      nosso: configuracao.prefixoNossoNumero,
      valor: '',
      emiss: '',
      venc: '',
    });
  };

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCarregando(true);
    setMensagem(null);

    try {
      const resposta = await fetch(montarUrlApi('/api/boletos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosFormulario),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        setMensagem({
          texto: `Erro: ${resultado.erro}`,
          tipo: 'error',
        });
        return;
      }

      setMensagem({
        texto: `Gravado em ${resultado.arquivo} > ${resultado.aba}`,
        tipo: 'success',
      });
      const historicoAtualizado = salvarClienteNoHistorico(chaveHistorico, dadosFormulario.cliente);
      setHistoricoClientes(historicoAtualizado);
      salvarUltimoValor(chaveUltimoValor, dadosFormulario.valor);
      salvarUltimoValor(chaveUltimaEmissao, dadosFormulario.emiss);
      limparFormulario();
      setTimeout(() => campoCliente.current?.focus(), 100);
    } catch (erro) {
      setMensagem({
        texto: 'Erro ao conectar com o servidor',
        tipo: 'error',
      });
      console.error('Erro ao registrar boleto:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const classesInput = `w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${configuracao.classesTema.foco}`;

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{configuracao.tituloPagina}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{configuracao.descricaoPagina}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <BotaoAlternarTema />
              <button
                onClick={() => navigate(configuracao.rotaAlternativa)}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm ${configuracao.classesTema.secundario}`}
              >
                {configuracao.textoBotaoAlternativo}
              </button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white px-6 py-8 shadow transition-colors dark:bg-slate-900 dark:shadow-black/20">
              <form onSubmit={aoEnviar} className="space-y-6">
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
                    list={`clientes-${configuracao.empresa.toLowerCase()}`}
                    autoComplete="off"
                    className={classesInput}
                  />
                  <datalist id={`clientes-${configuracao.empresa.toLowerCase()}`}>
                    {historicoClientes.map(cliente => (
                      <option key={cliente} value={cliente} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dica: Ctrl + Space repete este campo. Segure por 1,5 segundo para preencher cliente, valor e emissao.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Nosso Numero *</label>
                  <input
                    ref={campoNossoNumero}
                    type="text"
                    name="nosso"
                    required
                    value={dadosFormulario.nosso}
                    onChange={evento => atualizarCampo('nosso', evento.target.value)}
                    onKeyDown={evento => aoPressionarTecla(evento, campoValor)}
                    placeholder={`${configuracao.prefixoNossoNumero}____-__`}
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
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dica: Ctrl + Space repete este campo. Segure por 1,5 segundo para preencher cliente, valor e emissao.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Emissao *</label>
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
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Dica: Ctrl + Space repete este campo. Segure por 1,5 segundo para preencher cliente, valor e emissao.</p>
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
                  className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${configuracao.classesTema.primario}`}
                >
                  {carregando ? 'Registrando...' : 'Registrar Boleto'}
                </button>
              </form>

              {mensagem && (
                <div
                  className={`mt-4 rounded-md p-4 ${
                    mensagem.tipo === 'success'
                      ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
                  }`}
                >
                  <p className="text-sm font-medium">{mensagem.texto}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <PainelEstatisticasCadastro empresa={configuracao.empresa} estatisticas={estatisticas} />
          </div>
        </div>
      </div>
    </div>
  );
}
