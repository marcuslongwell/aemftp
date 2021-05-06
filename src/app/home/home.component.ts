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
  private host: string = '';
  private port: string = '';
  private user: string = '';
  private pass: string = '';

  constructor(private router: Router) { }

  async ngOnInit(): Promise<void> {
    let res = await this.electronService.ipcRenderer.invoke('ping');
    console.log(res);
  }

  async connect(): Promise<void> {
    console.log('Connecting...');
    console.log(this.host + ':' + this.port + ', ' + this.user + ', ' + this.pass);
  }

}
