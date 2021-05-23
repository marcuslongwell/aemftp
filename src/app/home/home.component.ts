import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronService } from '../core/services';
import { File } from '../file';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private electronService: ElectronService = new ElectronService();
  private host: string = 'demo.wftpserver.com';
  private port: string = '21';
  private user: string = 'demo';
  private pass: string = 'demo';
  private protocol: string = 'ftp';
  private isConnected: boolean = false;

  private remoteFiles: File[];
  private localFiles: File[];

  // private remoteFiles: Array<any>;
  // private localFiles: Array<any>;
  private remotePWD: File;
  private localPWD: File;
  // private remotePWD: string;
  // private localPWD: string;
  private remoteCrumbs: Array<any>;
  private localCrumbs: Array<any>;

  constructor(private router: Router) { }

  async ngOnInit(): Promise<void> {
    let res = await this.electronService.ipcRenderer.invoke('ping');
    this.localPWD = File.fromObject(await this.electronService.ipcRenderer.invoke('homedir', false));
    await this.listFiles(this.localPWD);
  }

  async open(file: File): Promise<void> {
    if (!this.isConnected && file.isRemote) throw new Error('Not connected to FTP server');

    try {
      if (file.isDirectory) {
        await this.listFiles(file);
      } else if (!file.isRemote) {
        // if local, open file in os
        console.log('trying to open the file locally');
        await this.electronService.ipcRenderer.invoke('open', file);
      }
      
      return;
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async listFiles(file: File) {
    if (!this.isConnected && file.isRemote) throw new Error('Not connected to FTP server');

    console.log('listing remote files in: ', file, 'path is', file.path);

    // let files: Array<any>;
    let files: File[] = [];
    try {
      files = (await this.electronService.ipcRenderer.invoke('ls', file)).map(item => File.fromObject(item));
      console.log(files);

      files.sort((a, b): number => {
        // return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        return a.fileName.toLowerCase() < b.fileName.toLowerCase() ? -1 : 1;
      });

      files.sort((a, b): number => {
        // return (a.type == 'd' && b.type != 'd') ? -1 : 0;
        return (a.isDirectory && !b.isDirectory) ? -1 : 0;
      });

      // files.unshift(new File(file.path + '/..', true, file.isRemote));

      // todo: test on windows client & windows ftp server (check slash)
      let crumbs: Array<any> = [];
      console.log('pwd: ' + file.path);
      let splitPath: Array<string> = file.path.split('/');

      if (splitPath[0] == splitPath[1]) {
        // top level directory, path was just a single slash
        splitPath = splitPath.splice(0, 1);
      }

      for (let dir of splitPath) {
        crumbs.push({
          name: dir
        });
      }

      if (file.isRemote) {
        this.remotePWD = file;
        this.remoteCrumbs = crumbs;
        this.remoteFiles = files;
      } else {
        this.localPWD = file;
        this.localCrumbs = crumbs;
        this.localFiles = files;
      }
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async connect(): Promise<void> {
    console.log('Connecting...');
    console.log(this.host + ':' + this.port + ', ' + this.user + ', ' + this.pass + ', ' + this.protocol);
    try {
      this.isConnected = await this.electronService.ipcRenderer.invoke('connect', this.host, this.port, this.user, this.pass, this.protocol);
      
      if (this.isConnected) {
        this.remotePWD = File.fromObject(await this.electronService.ipcRenderer.invoke('homedir', true));
        await this.listFiles(this.remotePWD);
      } else {
        throw new Error('Unable to connect for unknown reason');
      }
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async put(file: File): Promise<void> {
    if (!this.isConnected) throw new Error('Cannot put file if not connected');

    try {
      await this.electronService.ipcRenderer.invoke('put', file, this.remotePWD);
      await this.listFiles(this.remotePWD);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async get(file: File): Promise<void> {
    if (!this.isConnected) throw new Error('Cannot get file if not connected');

    try {
      await this.electronService.ipcRenderer.invoke('get', file, this.localPWD);
      await this.listFiles(this.localPWD);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async rm(file: File): Promise<void> {
    if (file.isRemote && !this.isConnected) throw new Error('Cannot remove remote file if not connected');

    try {
      await this.electronService.ipcRenderer.invoke('rm', file);
      await this.listFiles(file.isRemote ? this.remotePWD : this.localPWD);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

}
