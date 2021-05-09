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
  private host: string = 'mlongwe1.mkrn.dev';
  private port: string = '21';
  private user: string = 'mlongwe1';
  private pass: string = '';
  private isConnected: boolean = false;

  private remoteFiles: Array<any>;
  private localFiles: Array<any>;
  private remotePWD: string;
  private localPWD: string;

  constructor(private router: Router) { }

  async ngOnInit(): Promise<void> {
    let res = await this.electronService.ipcRenderer.invoke('ping');
    console.log(res);
    await this.listFiles(false);
  }

  async cd(remote: boolean, file: any): Promise<void> {
    if (!this.isConnected && remote) throw new Error('Not connected to FTP server');

    if (file.type != 'd') return;

    try {
      await this.electronService.ipcRenderer.invoke('cd', remote, file.name);
      await this.listFiles(remote);
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
        if (a.type == 'd' && b.type != 'd') {
           return -1;
        } else {
          return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        }
      });

      files.unshift({
        name: '..',
        type: 'd'
      });

      if (remote) {
        this.remotePWD = pwd;
        this.remoteFiles = files;
      } else {
        this.localPWD = pwd;
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
      this.isConnected = await this.electronService.ipcRenderer.invoke('connect', this.host, this.port, this.user, this.pass);
      
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

}
