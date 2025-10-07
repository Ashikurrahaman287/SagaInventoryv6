import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  mainWindow.setMenu(null);

  mainWindow.loadURL('http://localhost:5000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  const isDev = process.env.NODE_ENV === 'development';
  
  const serverPath = isDev 
    ? path.join(__dirname, '../server/index.ts')
    : path.join(process.resourcesPath, 'dist/index.js');

  const command = isDev ? 'tsx' : 'node';
  const args = [serverPath];

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    ELECTRON_MODE: 'true',
    DATABASE_URL: `sqlite:${path.join(app.getPath('userData'), 'saga-inventory.db')}`,
    PORT: '5000'
  };

  serverProcess = spawn(command, args, {
    env,
    cwd: isDev ? path.join(__dirname, '..') : process.resourcesPath,
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

app.on('ready', () => {
  startServer();
  
  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on('window-all-closed', function () {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
