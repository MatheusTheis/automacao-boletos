# 💼 Automação de Boletos

Sistema simples para registro e organização de boletos via planilhas Excel, com interface amigável em formato de formulário.

---

## 🚀 Funcionalidades

- Registro de boletos por empresa e ano (ex: CEMAVI_2025.xlsx, MB_2025.xlsx)
- Interface web simples para preenchimento
- Organização automática por aba mensal (JANEIRO a DEZEMBRO)
- Inserção **ordenada por vencimento**
- Geração de `.xlsx` com:
  - Formatação padronizada (Comic Sans MS, bordas, datas, moeda)
  - Abas separadas por mês
- Aplicação empacotada como aplicativo desktop (Electron)
- **Modo Escuro/Claro**: Alternância de temas com preferência salva no navegador
- **Navegação por teclado**: Use `Enter` para navegar entre os campos sem precisar do mouse
- **Foco automático**: Após registrar um boleto, o foco volta automaticamente para o campo Cliente
- **Histórico de clientes**: Sistema de autocompletar com os últimos 3 clientes cadastrados (aparece ao digitar qualquer letra)
- **Atalho rápido**: Pressione `Ctrl + Space` no campo Cliente para preencher com o último nome registrado
- **Máscara automática**: Formatação automática para datas (DD/MM/AAAA) e campo "Nosso Número"
- **Proteção contra duplicação**: O sistema verifica os últimos 5 registros e impede a duplicação do "Nosso Nº"

---

## 🖥️ Tecnologias Utilizadas

- Node.js
- Express
- ExcelJS
- Electron
- HTML/CSS (formulário)
- Day.js

---

## 📁 Estrutura de Pastas

```
AutomacaoBoletos/
├─ public/                 # Interface HTML
│  ├─ cemavi.html          # Tela de registro Cemavi
│  ├─ mb.html              # Tela de registro MB
│  └─ style.css            # Estilos com tema escuro/claro
├─ boletos/                # Planilhas .xlsx geradas (não sobem pro Git)
├─ main.js                 # Electron launcher
├─ server.js               # Servidor Express
├─ registrarBoleto.js      # Lógica de gravação no Excel
├─ package.json
└─ README.md
```

---

## 🛠️ Como rodar localmente (modo desenvolvedor)

1. Instale Node.js **v20.x** (recomendo usar [NVM](https://github.com/coreybutler/nvm-windows))
2. Clone o projeto:

   ```bash
   git clone https://github.com/MatheusTheis/automacao-boletos.git
   cd automacao-boletos
   npm install
   ```

3. Para testar localmente com navegador:
   ```bash
   npm start
   ```
   Acesse: `http://localhost:3000`

4. Para rodar como app com janela (Electron):
   ```bash
   npm run dev
   ```

---

## ⌨️ Atalhos e Recursos de Teclado

- **Enter**: Navega para o próximo campo do formulário
- **Ctrl + Space**: No campo Cliente, preenche automaticamente com o último nome registrado
- **Tab**: Navegação padrão entre campos
- **Modo Claro/Escuro**: Clique no botão superior ou use a preferência salva automaticamente

---

## 🧾 Como gerar instalador (.exe)

```bash
npm run build
```

A saída ficará em `/dist/`, com o instalador .exe.

---

## ⚠️ Importante

- Os arquivos `.xlsx` gerados são salvos na pasta `boletos/` e não são enviados ao GitHub
- Cada planilha é nomeada como `CEMAVI_2025.xlsx`, `MB_2025.xlsx`, etc., organizadas por empresa + ano
- O histórico de clientes é salvo no `localStorage` do navegador (separado por empresa)
- As preferências de tema (claro/escuro) são mantidas entre sessões
- **Proteção contra duplicação**: O sistema mantém em memória os últimos 5 "Nosso Nº" registrados por empresa para evitar duplicação acidental (cache temporário, válido enquanto o servidor estiver rodando)

---

## 👤 Autor

Matheus Theis