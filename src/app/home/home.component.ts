import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronService } from '../core/services';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private electronService: ElectronService = new ElectronService();
  private host: string = 'localhost';
  private port: string = '21';
  private user: string = 'marcus';
  private pass: string = '';
  private isSecure: boolean = true;
  private isConnected: boolean = false;

  private remoteFiles: Array<any>;
  private localFiles: Array<any>;
  private remotePWD: string;
  private localPWD: string;
  private remoteCrumbs: Array<any>;
  private localCrumbs: Array<any>;

  constructor(private router: Router) { }

  async ngOnInit(): Promise<void> {
    let res = await this.electronService.ipcRenderer.invoke('ping');
    await this.listFiles(false);
  }

  async open(remote: boolean, file: any): Promise<void> {
    if (!this.isConnected && remote) throw new Error('Not connected to FTP server');

    try {
      if (file.type == 'd') {
        await this.electronService.ipcRenderer.invoke('cd', remote, file.name);
        await this.listFiles(remote);
      } else if (!remote) {
        // if local, open file in os
        await this.electronService.ipcRenderer.invoke('open', file.name);
      }
      
      return;
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async listFiles(remote: boolean) {
    if (!this.isConnected && remote) throw new Error('Not connected to FTP server');

    let files: Array<any>;
    let pwd: string;
    try {
      if (remote) {
        pwd = await this.electronService.ipcRenderer.invoke('pwd', true);
        files = await this.electronService.ipcRenderer.invoke('ls', true);
      } else {
        pwd = await this.electronService.ipcRenderer.invoke('pwd', false);
        files = await this.electronService.ipcRenderer.invoke('ls', false);
      }

      files.sort((a, b): number => {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });

      files.sort((a, b): number => {
        return (a.type == 'd' && b.type != 'd') ? -1 : 0;
      });

      files.unshift({
        name: '..',
        type: 'd'
      });

      // todo: test on windows client & windows ftp server
      let crumbs: Array<any> = [];
      console.log('pwd: ' + pwd);
      let splitPath: Array<string> = pwd.split('/');

      if (splitPath[0] == splitPath[1]) {
        // top level directory, path was just a single slash
        splitPath = splitPath.splice(0, 1);
      }

      for (let dir of splitPath) {
        crumbs.push({
          name: dir
        });
      }

      if (remote) {
        this.remotePWD = pwd;
        this.remoteCrumbs = crumbs;
        this.remoteFiles = files;
      } else {
        this.localPWD = pwd;
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
    console.log(this.host + ':' + this.port + ', ' + this.user + ', ' + this.pass);
    try {
      this.isConnected = await this.electronService.ipcRenderer.invoke('connect', this.host, this.port, this.user, this.pass, this.isSecure);
      
      if (this.isConnected) {
        await this.listFiles(true);
      } else {
        throw new Error('Unable to connect for unknown reason');
      }
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async put(fileName: string): Promise<void> {
    if (!this.isConnected) throw new Error('Cannot put file if not connected');

    try {
      await this.electronService.ipcRenderer.invoke('put', fileName);
      await this.listFiles(true);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async get(fileName: string): Promise<void> {
    if (!this.isConnected) throw new Error('Cannot get file if not connected');

    try {
      await this.electronService.ipcRenderer.invoke('get', fileName);
      await this.listFiles(false);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

}
