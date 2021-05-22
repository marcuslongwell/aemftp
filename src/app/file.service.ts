import { Injectable } from '@angular/core';
import { File } from './file';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  localFiles: File[] = [];
  remoteFiles: File[] = [];

  constructor() { }
}
