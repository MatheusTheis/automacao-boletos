import FormularioCadastroBoleto from '../componentes/cadastro/formulario-cadastro-boleto';

export default function PaginaCadastroCemavi() {
  return (
    <FormularioCadastroBoleto
      configuracao={{
        empresa: 'CEMAVI',
        tituloPagina: 'Registrar Boleto - CEMAVI',
        descricaoPagina: 'Preencha os dados do novo boleto CEMAVI',
        rotaAlternativa: '/mb',
        textoBotaoAlternativo: 'Ir para MB',
        prefixoNossoNumero: '000',
        tamanhoCorpoNossoNumero: 7,
        classesTema: {
          primario: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          foco: 'focus:ring-green-500 focus:border-green-500',
          secundario: 'bg-purple-600 hover:bg-purple-700',
        },
      }}
    />
  );
}
