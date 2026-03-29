const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const { app, BrowserWindow, dialog } = require('electron');

const emDesenvolvimento = Boolean(process.env.ELECTRON_START_URL);
const HOST_SERVIDOR = '127.0.0.1';
const PORTA_INICIAL = 3001;
const TIMEOUT_HEALTHCHECK = 30000;
const INTERVALO_HEALTHCHECK = 500;

let janelaPrincipal = null;
let processoServidor = null;
let portaServidor = PORTA_INICIAL;
let encerrandoAplicacao = false;

function logElectron(mensagem, extra) {
  if (extra !== undefined) {
    console.log(`[electron] ${mensagem}`, extra);
    return;
  }

  console.log(`[electron] ${mensagem}`);
}

function logErroElectron(mensagem, erro) {
  console.error(`[electron] ${mensagem}`, erro);
}

function obterRaizProjeto() {
  return app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
}

function obterRaizProjetoDesempacotada() {
  return app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : obterRaizProjeto();
}

function obterCaminhoServidor() {
  if (emDesenvolvimento) {
    return path.join(obterRaizProjeto(), 'server', 'src', 'index.ts');
  }

  return path.join(obterRaizProjetoDesempacotada(), 'server', 'dist', 'index.js');
}

function obterDiretorioServidor() {
  return app.isPackaged
    ? path.join(obterRaizProjetoDesempacotada(), 'server')
    : path.join(obterRaizProjeto(), 'server');
}

function obterDiretorioBoletos() {
  if (!app.isPackaged) {
    return path.join(obterRaizProjeto(), 'boletos');
  }

  const diretorioOrigem = path.join(process.resourcesPath, 'boletos');
  const diretorioGravavel = path.join(app.getPath('userData'), 'boletos');

  if (!fs.existsSync(diretorioGravavel)) {
    fs.mkdirSync(diretorioGravavel, { recursive: true });
  }

  const possuiArquivos = fs.readdirSync(diretorioGravavel).some(arquivo => arquivo.toLowerCase().endsWith('.xlsx'));
  if (!possuiArquivos) {
    logElectron(`Copiando boletos iniciais para pasta gravavel: ${diretorioGravavel}`);
    fs.cpSync(diretorioOrigem, diretorioGravavel, { recursive: true });
  }

  return diretorioGravavel;
}

function obterUrlRenderer() {
  const apiBase = encodeURIComponent(`http://${HOST_SERVIDOR}:${portaServidor}`);
  const urlBase = emDesenvolvimento
    ? process.env.ELECTRON_START_URL
    : `file://${path.join(obterRaizProjeto(), 'client', 'dist', 'index.html')}`;

  return `${urlBase}${urlBase.includes('?') ? '&' : '?'}apiBase=${apiBase}`;
}

function portaDisponivel(porta) {
  return new Promise((resolve, reject) => {
    const servidorTeste = net.createServer();

    servidorTeste.once('error', erro => {
      if (erro.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(erro);
    });

    servidorTeste.once('listening', () => {
      servidorTeste.close(() => resolve(true));
    });

    servidorTeste.listen(porta, HOST_SERVIDOR);
  });
}

async function encontrarPortaLivre(portaInicial) {
  for (let porta = portaInicial; porta < portaInicial + 20; porta += 1) {
    if (await portaDisponivel(porta)) {
      return porta;
    }
  }

  throw new Error(`Nenhuma porta livre encontrada a partir de ${portaInicial}`);
}

function aguardarBackend() {
  const inicio = Date.now();

  return new Promise((resolve, reject) => {
    const tentar = () => {
      if (!processoServidor) {
        reject(new Error('Processo do backend nao foi criado.'));
        return;
      }

      if (processoServidor.exitCode !== null) {
        reject(new Error(`Backend encerrou antes do health check. Codigo: ${processoServidor.exitCode}`));
        return;
      }

      const requisicao = http.get(
        {
          hostname: HOST_SERVIDOR,
          port: portaServidor,
          path: '/health',
          timeout: 2000,
        },
        resposta => {
          resposta.resume();

          if (resposta.statusCode === 200) {
            logElectron(`Backend respondeu em http://${HOST_SERVIDOR}:${portaServidor}/health`);
            resolve();
            return;
          }

          if (Date.now() - inicio >= TIMEOUT_HEALTHCHECK) {
            reject(new Error(`Health check respondeu com status ${resposta.statusCode}`));
            return;
          }

          setTimeout(tentar, INTERVALO_HEALTHCHECK);
        }
      );

      requisicao.on('timeout', () => {
        requisicao.destroy(new Error('Timeout no health check'));
      });

      requisicao.on('error', erro => {
        if (Date.now() - inicio >= TIMEOUT_HEALTHCHECK) {
          reject(erro);
          return;
        }

        setTimeout(tentar, INTERVALO_HEALTHCHECK);
      });
    };

    tentar();
  });
}

async function iniciarServidor() {
  portaServidor = await encontrarPortaLivre(PORTA_INICIAL);

  const caminhoServidor = obterCaminhoServidor();
  const diretorioServidor = obterDiretorioServidor();
  const diretorioBoletos = obterDiretorioBoletos();
  const ambienteFilho = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    HOST: HOST_SERVIDOR,
    PORT: String(portaServidor),
    BOLETOS_DIR: diretorioBoletos,
  };

  let args = [];

  if (emDesenvolvimento) {
    const caminhoTsx = require.resolve('tsx/dist/cli.mjs', {
      paths: [obterRaizProjeto()],
    });
    args = [caminhoTsx, caminhoServidor];
    logElectron(`Iniciando backend em desenvolvimento: ${caminhoServidor}`);
  } else {
    ambienteFilho.NODE_ENV = 'production';
    args = [caminhoServidor];
    logElectron(`Iniciando backend empacotado: ${caminhoServidor}`);
  }

  logElectron(`Diretorio dos boletos: ${diretorioBoletos}`);
  logElectron(`Porta selecionada para o backend: ${portaServidor}`);

  processoServidor = spawn(process.execPath, args, {
    cwd: diretorioServidor,
    env: ambienteFilho,
    stdio: 'inherit',
    windowsHide: true,
  });

  processoServidor.on('spawn', () => {
    logElectron(`Backend iniciado com PID ${processoServidor.pid}`);
  });

  processoServidor.on('error', erro => {
    logErroElectron('Erro ao iniciar backend:', erro);
  });

  processoServidor.on('close', (codigo, sinal) => {
    logElectron(`Backend encerrado. code=${codigo} signal=${sinal || 'none'}`);

    if (!encerrandoAplicacao) {
      dialog.showErrorBox(
        'Backend encerrado',
        `O servico interno foi encerrado inesperadamente.\n\nCodigo: ${codigo}\nSinal: ${sinal || 'nenhum'}`
      );
    }
  });

  await aguardarBackend();
}

function encerrarServidor() {
  if (!processoServidor || processoServidor.killed) {
    return;
  }

  encerrandoAplicacao = true;
  logElectron(`Encerrando backend (PID ${processoServidor.pid})`);
  processoServidor.kill();
}

function criarJanela() {
  janelaPrincipal = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    title: 'Gestao de Boletos - CEMAVI e MB',
    backgroundColor: '#f9fafb',
  });

  const urlInicial = obterUrlRenderer();
  logElectron(`Carregando interface: ${urlInicial}`);
  janelaPrincipal.loadURL(urlInicial);

  if (emDesenvolvimento) {
    janelaPrincipal.webContents.openDevTools();
  }

  janelaPrincipal.on('closed', () => {
    janelaPrincipal = null;
  });

  janelaPrincipal.setMenuBarVisibility(false);
}

app.on('ready', async () => {
  try {
    logElectron('Iniciando aplicacao...');
    await iniciarServidor();
    criarJanela();
  } catch (erro) {
    logErroElectron('Falha ao inicializar aplicacao:', erro);
    dialog.showErrorBox('Erro ao iniciar a aplicacao', `Nao foi possivel iniciar o backend automaticamente.\n\n${erro.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  encerrarServidor();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (janelaPrincipal === null) {
    criarJanela();
  }
});

app.on('before-quit', () => {
  encerrarServidor();
});

app.on('will-quit', () => {
  encerrarServidor();
});
