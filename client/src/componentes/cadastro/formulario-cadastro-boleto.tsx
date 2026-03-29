import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PainelEstatisticasCadastro from './painel-estatisticas-cadastro';
import { useEstatisticasEmpresa } from '../../ganchos/use-estatisticas-empresa';
import { carregarHistoricoClientes, salvarClienteNoHistorico } from '../../utilitarios/historico-clientes';
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

  const atualizarCampo = (campo: keyof DadosFormularioBoleto, valor: string) => {
    if (campo === 'emiss' || campo === 'venc') {
      valor = aplicarMascaraData(valor);
    } else if (campo === 'nosso') {
      valor = aplicarMascaraNossoNumero(valor, configuracao.prefixoNossoNumero, configuracao.tamanhoCorpoNossoNumero);
    }

    setDadosFormulario(estadoAtual => ({ ...estadoAtual, [campo]: valor }));
  };

  const aoPressionarTecla = (
    evento: React.KeyboardEvent<HTMLInputElement>,
    proximoCampo?: React.RefObject<HTMLInputElement>
  ) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      proximoCampo?.current?.focus();
    }

    if (evento.key === ' ' && evento.ctrlKey && evento.currentTarget.name === 'cliente') {
      evento.preventDefault();
      const ultimoCliente = historicoClientes[0] || '';
      if (ultimoCliente) {
        setDadosFormulario(estadoAtual => ({ ...estadoAtual, cliente: ultimoCliente }));
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

  const classesInput = `w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 ${configuracao.classesTema.foco}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{configuracao.tituloPagina}</h1>
              <p className="mt-2 text-sm text-gray-600">{configuracao.descricaoPagina}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(configuracao.rotaAlternativa)}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm ${configuracao.classesTema.secundario}`}
              >
                {configuracao.textoBotaoAlternativo}
              </button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
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
            <div className="rounded-lg bg-white px-6 py-8 shadow">
              <form onSubmit={aoEnviar} className="space-y-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cliente *</label>
                  <input
                    ref={campoCliente}
                    type="text"
                    name="cliente"
                    required
                    value={dadosFormulario.cliente}
                    onChange={evento => atualizarCampo('cliente', evento.target.value)}
                    onKeyDown={evento => aoPressionarTecla(evento, campoNossoNumero)}
                    list={`clientes-${configuracao.empresa.toLowerCase()}`}
                    autoComplete="off"
                    className={classesInput}
                  />
                  <datalist id={`clientes-${configuracao.empresa.toLowerCase()}`}>
                    {historicoClientes.map(cliente => (
                      <option key={cliente} value={cliente} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500">Dica: Ctrl + Space para autocompletar com ultimo cliente</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nosso Numero *</label>
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
                  <label className="mb-1 block text-sm font-medium text-gray-700">Valor *</label>
                  <input
                    ref={campoValor}
                    type="text"
                    name="valor"
                    required
                    value={dadosFormulario.valor}
                    onChange={evento => atualizarCampo('valor', evento.target.value)}
                    onKeyDown={evento => aoPressionarTecla(evento, campoEmissao)}
                    placeholder="R$ 0,00"
                    className={classesInput}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Emissao *</label>
                    <input
                      ref={campoEmissao}
                      type="text"
                      name="emiss"
                      required
                      value={dadosFormulario.emiss}
                      onChange={evento => atualizarCampo('emiss', evento.target.value)}
                      onKeyDown={evento => aoPressionarTecla(evento, campoVencimento)}
                      placeholder="DD/MM/AAAA"
                      className={classesInput}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Vencimento *</label>
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
                <div className={`mt-4 rounded-md p-4 ${mensagem.tipo === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
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
