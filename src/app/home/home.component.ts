import { Component, OnInit, Inject  } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronService } from '../core/services';
import { File } from '../file';
import { DndDropEvent } from 'ngx-drag-drop';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface FolderDialogData {
  folderName: string;
}

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

  constructor(private router: Router, public dialog: MatDialog) { }

  async ngOnInit(): Promise<void> {
    let res = await this.electronService.ipcRenderer.invoke('ping');
    this.localPWD = File.fromObject(await this.electronService.ipcRenderer.invoke('homedir', false));
    await this.listFiles(this.localPWD);
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

  async createFolder(remote: boolean): Promise<void> {
    if (remote && !this.isConnected) throw new Error('Cannot create remote directory without remote connection');
    
    const dialogRef = this.dialog.open(FolderNameDialog, {
      width: '320px',
      data: { folderName: '' }
    });

    dialogRef.afterClosed().subscribe(async (folderName: string): Promise<void> => {
      if (folderName?.length > 0) {
        let file: File = new File((remote ? this.remotePWD.path : this.localPWD.path) + '/' + folderName, true, remote);
        console.log(file.path);
        await this.mkdir(file);
      }
    });
  }

  async mkdir(file: File) {
    if (file.isRemote && !this.isConnected) throw new Error('Cannot create remote directory without remote connection');

    try {
      await this.electronService.ipcRenderer.invoke('mkdir', file);
      await this.listFiles(file.isRemote ? this.remotePWD : this.localPWD);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async listFiles(file: File): Promise<void> {
    if (!this.isConnected && file.isRemote) throw new Error('Not connected to FTP server');
    if (!file.isDirectory) throw new Error('Cannot list files of non-directory');

    let files: File[] = [];
    try {
      files = (await this.electronService.ipcRenderer.invoke('ls', file)).map(item => File.fromObject(item));

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
      let crumbs: Array<File> = [];
      let iteratedFile = file;
      while (iteratedFile.directory.includes('/')) {
        iteratedFile = new File(iteratedFile.directory, true, file.isRemote);
        crumbs.unshift(iteratedFile);
      }

      crumbs.unshift(new File('/', true, file.isRemote));
      if (file.fileName.length > 0) crumbs.push(file);

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

  async open(file: File): Promise<void> {
    if (!this.isConnected && file.isRemote) throw new Error('Not connected to FTP server');

    try {
      if (file.isDirectory) {
        await this.listFiles(file);
      } else if (!file.isRemote) {
        // if local, open file in os
        console.log('trying to open the file locally');
        await this.electronService.ipcRenderer.invoke('open', file);
      } else {
        throw new Error('Cannot open remove file; file must be downloaded first');
      }
      
      return;
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async reveal(file: File): Promise<void> {
    if (file.isRemote) throw new Error('Cannot reveal remote file');

    try {
      await this.electronService.ipcRenderer.invoke('reveal', file);
    } catch (err) {
      // todo: handle in ui
      console.error(err);
    }
  }

  async onFileDrop(event: DndDropEvent, toRemote: boolean): Promise<void> {
    if (!event.data) throw new Error('Drop event data must contain a file');

    let file: File = File.fromObject(event.data);
    if (file.path.length < 1) throw new Error('Unable to find specified file');

    if (file.isRemote && !toRemote) {
      // we're getting the file from remote
      return this.get(file);
    } else if (!file.isRemote && toRemote) {
      // we're putting the file from local
      return this.put(file);
    } else {
      throw new Error('Cannot copy a local or remote file to same location');
    }
  }
}

@Component({
  selector: 'folder-name-dialog',
  templateUrl: 'folder-name-dialog.html',
})
export class FolderNameDialog {
  constructor(
    public dialogRef: MatDialogRef<FolderNameDialog>,
    @Inject(MAT_DIALOG_DATA) public data: FolderDialogData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

}