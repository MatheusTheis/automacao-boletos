# 💼 Automação de Boletos

Sistema simples para registro e organização de boletos via planilhas Excel, com interface amigável em formato de formulário.

---

## 🚀 Funcionalidades

- Registro de boletos por empresa e ano (ex: EMPRESA_A2025.xlsx, EMPRESA_B2026.xlsx)
- Interface web simples para preenchimento
- Organização automática por aba mensal (JANEIRO a DEZEMBRO)
- Inserção **ordenada por vencimento**
- Geração de `.xlsx` com:
  - Formatação padronizada (Comic Sans MS, bordas, datas, moeda)
  - Abas separadas por mês
- Aplicação empacotada como aplicativo desktop (Electron)

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

AutomacaoBoletos/
├─ public/ # Interface HTML
│ └─ index.html
├─ boletos/ # Planilhas .xlsx geradas (não sobem pro Git)
├─ main.js # Electron launcher
├─ server.js # Servidor Express
├─ registrarBoleto.js # Lógica de gravação no Excel
├─ package.json
└─ README.md

---

## 🛠️ Como rodar localmente (modo desenvolvedor)

1. Instale Node.js **v20.x** (recomendo usar [NVM](https://github.com/coreybutler/nvm-windows))
2. Clone o projeto:

   ```bash
   git clone https://github.com/MatheusTheis/automacao-boletos.git
   cd automacao-boletos
   npm install
Para testar localmente com navegador:
npm start
Para rodar como app com janela (Electron):
npm run dev
🧾 Como gerar instalador (.exe)
npm run build
A saída ficará em /dist/, com o instalador .exe.

⚠️ Importante
Os arquivos .xlsx gerados são salvos na pasta boletos/ e não são enviados ao GitHub

Cada planilha é nomeada como EMPRESA_A2025.xlsx, EMPRESA_B2026.xlsx, etc., organizadas por empresa + ano

👤 Autor
Matheus Theis