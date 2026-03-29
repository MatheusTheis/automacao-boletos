# Gestao de Boletos

Aplicacao desktop em Electron para controle de boletos. O sistema permite consultar registros, cadastrar novos boletos, marcar pagamentos e gerar relatorio em PDF de boletos atrasados.

## Principais recursos

- painel de resumo com indicadores por status
- opcao para ocultar e exibir os valores dos cards do topo
- cadastro manual de boletos
- marcacao de boletos pagos
- exportacao de PDF com boletos atrasados
- empacotamento em Electron com backend Node iniciado automaticamente

## Tecnologias utilizadas

- Electron
- React + TypeScript + Vite
- Node.js + Express
- Tailwind CSS
- XLSX para leitura e escrita das planilhas
- PDFKit para geracao de PDF

## Estrutura do projeto

```text
automacao-boletos/
|-- boletos/              # planilhas locais usadas no desenvolvimento e no empacotamento
|-- build/                # arquivos de apoio do empacotamento
|-- client/               # frontend React
|   |-- src/
|   |   |-- componentes/
|   |   |-- ganchos/
|   |   |-- paginas/
|   |   |-- servicos/
|   |   |-- tipos/
|   |   `-- utilitarios/
|-- electron/             # processo principal do Electron
|-- server/               # backend Node
|   |-- src/
|   |   |-- servicos/
|   |   `-- tipos/
|-- package.json          # scripts da aplicacao desktop
`-- README.md
```

## Como rodar em desenvolvimento

Na raiz do projeto:

```bash
npm install
npm run dev
```

Scripts mais usados:

- `npm run server:dev`: sobe apenas o backend
- `npm run client:dev`: sobe apenas o frontend
- `npm run electron:dev`: abre o Electron em modo desenvolvimento

## Build para entrega

```bash
npm run build
npm run electron:build:win
```

Para testar rapidamente sem instalar:

```bash
npm run electron:pack
```

## Variaveis de ambiente

O projeto funciona sem arquivo `.env`, mas aceita as seguintes variaveis quando necessario:

- `HOST`: host do backend
- `PORT`: porta do backend
- `BOLETOS_DIR`: diretorio das planilhas
- `ELECTRON_START_URL`: usada apenas no desenvolvimento do Electron

## Fluxo do Electron

- em desenvolvimento, o Electron usa o frontend do Vite e sobe o backend local
- em producao, o Electron carrega o frontend compilado e inicia o backend empacotado
- as planilhas sao copiadas para uma pasta gravavel do usuario quando o app instalado abre pela primeira vez

## GitHub

- a pasta `boletos` contem dados locais e nao deve ser enviada com os arquivos `.xlsx`
- o `.gitignore` ja bloqueia as planilhas em `boletos/*.xlsx`
- nao envie `node_modules`, `dist`, `server/dist`, `client/dist` ou `dist-electron`

## Organizacao aplicada

- separacao mais clara entre frontend, backend e processo principal do Electron
- nomes de arquivos e pastas padronizados em portugues
- remocao de codigo legado ligado a fluxos antigos
- centralizacao de tipos, servicos e utilitarios
- limpeza de arquivos obsoletos e estrutura residual

## Observacoes

- para enviar o sistema ao cliente, use o instalador gerado em `dist-electron`
- se quiser icone personalizado no instalador, adicione `build/icon.ico` ou ajuste `build/icon.png`
