import { app, BrowserWindow, screen, shell } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as os from 'os';
import { ipcMain } from 'electron';
import { resolve } from 'node:path';
import * as fs from 'fs-extra';
import { File } from './src/app/file';

// import FTPClient from 'ftp';
const FTPClient = require('promise-ftp');


// Initialize remote module
require('@electron/remote/main').initialize();

let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
      contextIsolation: false,  // false if you want to run 2e2 test with Spectron
      enableRemoteModule : true // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
    },
  });

  if (serve) {

    win.webContents.openDevTools();

    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');

  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}

// todo: make sure all files send over ipc are valid files
  // maybe need some sort of validation in the file class, though I don't like this

ipcMain.handle('ping', (): string => {
  return 'pong';
});

let ftpClient = new FTPClient();

ipcMain.handle('homedir', async (evt, ...args): Promise<File> => {
  let remote: boolean = args[0] || false;
  return new File(remote ? (await ftpClient.pwd()) : os.homedir(), true, remote);
});

ipcMain.handle('connect', async (evt, ...args): Promise<boolean> => {
  let host: string = args[0];
  let port: string = args[1];
  let user: string = args[2];
  let pass: string = args[3];
  let protocol: string = args[4];

  console.log(host, port, user, pass, protocol);
  
  try {
    await ftpClient.destroy();
    ftpClient = new FTPClient();

    await ftpClient.connect({
      host: host,
      port: port,
      user: user,
      password: pass,
      secure: protocol == 'ftps' || protocol == 'sftp',
      secureOptions: {
        rejectUnauthorized: false
      }
    });

    return true;
  } catch (err) {
    // todo: send err to ui
    console.error(new Error(err));
    return false;
  }
});

ipcMain.handle('ls', async (evt, ...args): Promise<Array<File>> => {
  // let remote: boolean = args[0] || false;
  let file: File = File.fromObject(args[0]);

  if (!file.isDirectory) throw new Error('Cannot list files in non-directory');

  try {
    // todo: unify the return listing into a standardized object for remote & local
    if (file.isRemote) {
      let list = await ftpClient.list(file.path);
      let files: File[] = list.map((item) => {
        return new File(path.join(file.path, item.name), item.type == 'd', true);
      });
      return files;
    } else {
      let list = await fs.readdir(file.path);
      let files: File[] = [];
      for (let item of list) {
        let fileStat = await fs.lstat(path.join(file.path, item));
        files.push(new File(path.join(file.path, item), fileStat.isDirectory(), false));
      }
      return files;
    }
  } catch (err) {
    // todo: send err to ui
    console.error(err);
    return [];
  }
});

ipcMain.handle('open', async (evt, ...args): Promise<boolean> => {
  let file: File = File.fromObject(args[0]);

  if (file.isRemote) throw new Error('Cannot open remote file');

  try {
    let err = await shell.openPath(path.resolve(file.path));
    if (err.length > 0) throw new Error(err);
    return true;
  } catch (err) {
    // todo: send error back to client
    console.error(err);
    return false;
  }
});

ipcMain.handle('put', async (evt, ...args): Promise<boolean> => {
  let file: File = File.fromObject(args[0]);
  let remoteDir: File = File.fromObject(args[1]);

  if (file.isRemote) throw new Error('Cannot put remote file');
  if (!remoteDir.isDirectory) throw new Error('Remote path is not a directory');
  if (!remoteDir.isRemote) throw new Error('Must supply remote directory');

  // todo: check that file exists locally first maybe?
  // todo: check if file exists on remote, prompt user for choice if it does
  try {
    await ftpClient.put(path.resolve(file.path), path.join(remoteDir.path, file.fileName));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
});

ipcMain.handle('get', async (evt, ...args): Promise<boolean> => {
  let file: File = File.fromObject(args[0]);
  let localDir: File = File.fromObject(args[1]);

  if (!file.isRemote) throw new Error('Cannot get local file');
  if (!localDir.isDirectory) throw new Error('Local path is not a directory');
  if (localDir.isRemote) throw new Error('Must supply local directory');

  // todo: check that file exists on remote first maybe?
  // todo: check if file exists on local, prompt user for choice if it does
  try {
    let fileStream = await ftpClient.get(file.path);
    await new Promise((resolve, reject): void => {
      fileStream.once('close', resolve);
      fileStream.once('error', reject);
      fileStream.pipe(fs.createWriteStream(path.join(localDir.path, file.fileName)));
    });
    
    return true;
  } catch (err) {
    // todo: send to gui
    console.error(err);
    return false;
  }
});

ipcMain.handle('rm', async (evt, ...args): Promise<boolean> => {
  // let remote: boolean = args[0] || false;
  // let relativePath: string = args[1] || '.';
  let file: File = File.fromObject(args[0]);

  // todo: make sure it exists first
  // todo: recursive delete?

  try {
    if (file.isRemote) {
      if (file.isDirectory) {
        await ftpClient.rmdir(file.path, true);
      } else {
        await ftpClient.delete(file.path);
      }
    } else {
      await fs.remove(path.resolve(file.path));
    }

    return true;
  } catch (err) {
    // todo: send to gui
    console.error(err);
    return false;
  }
});

ipcMain.handle('reveal', async (evt, ...args): Promise<boolean> => {
  let file: File = File.fromObject(args[0]);

  if (file.isRemote) throw new Error('Cannot reveal remote file in local filesystem');

  try {
    shell.showItemInFolder(path.resolve(file.path));
    return true;
  } catch (err) {
    // todo: send error back to client
    console.error(err);
    return false;
  }
});