const { contextBridge, ipcRenderer } = require('electron');

const CANAIS_STATUS_VALIDOS = [
  'atualizacao:verificando',
  'atualizacao:disponivel',
  'atualizacao:indisponivel',
  'atualizacao:progresso',
  'atualizacao:baixada',
  'atualizacao:erro',
];

contextBridge.exposeInMainWorld('atualizacoes', {
  verificar: () => ipcRenderer.invoke('atualizacao:verificar'),
  instalarEReiniciar: () => ipcRenderer.invoke('atualizacao:instalar'),
  obterVersaoAtual: () => ipcRenderer.invoke('atualizacao:versao-atual'),
  aoMudarStatus: callback => {
    const listenersPorCanal = CANAIS_STATUS_VALIDOS.map(canal => {
      const listener = (_evento, dados) => callback({ tipo: canal, dados });
      ipcRenderer.on(canal, listener);
      return { canal, listener };
    });

    return () => {
      listenersPorCanal.forEach(({ canal, listener }) => {
        ipcRenderer.removeListener(canal, listener);
      });
    };
  },
});
