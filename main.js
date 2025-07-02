// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: { nodeIntegration: false }
  });

  win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  // inicia o servidor express
  const server = exec('npm start', { cwd: __dirname });
  createWindow();

  app.on('window-all-closed', () => {
    server.kill(); // encerra servidor quando fecha
    if (process.platform !== 'darwin') app.quit();
  });
});
