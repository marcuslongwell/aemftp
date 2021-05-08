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

  constructor(private router: Router) { }

  async ngOnInit(): Promise<void> {
    let res = await this.electronService.ipcRenderer.invoke('ping');
    console.log(res);
  }

  async listFiles(remote: boolean) {
    if (!this.isConnected && remote) throw new Error('Not connected to FTP server');

    if (remote) {
      // list remote files in pwd
      try {
        let files = await this.electronService.ipcRenderer.invoke('ls');
        console.log(files);
        this.remoteFiles = files;
      } catch (err) {
        // todo: handle in ui
        console.error(err);
      }
    } else {
      // list local files in pwd
    }
  }

  async connect(): Promise<void> {
    console.log('Connecting...');
    console.log(this.host + ':' + this.port + ', ' + this.user + ', ' + this.pass);
    try {
      this.isConnected = await this.electronService.ipcRenderer.invoke('connect', [this.host, this.port, this.user, this.pass]);
      
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
