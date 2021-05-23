export class File {
  private _path: string;
  private _isDirectory: boolean = false;
  private _isRemote: boolean = false;

  constructor();
  constructor(file: File);
  constructor(path: string);
  constructor(path: string, isDirectory: boolean);
  constructor(path: string, isDirectory: boolean, isRemote: boolean);
  constructor(fileOrPath?: File | string, isDirectory?: boolean, isRemote?: boolean) {
    if (typeof fileOrPath == 'undefined' || fileOrPath == null) {
      this.path = '/';
    } else if (fileOrPath instanceof File) {
      this.path = fileOrPath.path;
      this.isDirectory = fileOrPath.isDirectory;
      this.isRemote = fileOrPath.isRemote;
    } else if (typeof fileOrPath == 'string') {
      this.path = fileOrPath;

      if (typeof isDirectory == 'boolean') {
        this.isDirectory = isDirectory;

        if (typeof isRemote == 'boolean') {
          this.isRemote = isRemote;
        }
      }
    }
  }

  get path(): string {
    return this._path;
  }

  set path(path: string) {
    this._path = path;
  }

  get isDirectory(): boolean {
    return this._isDirectory;
  }

  set isDirectory(isDirectory: boolean) {
    this._isDirectory = isDirectory;
  }

  get isRemote(): boolean {
    return this._isRemote;
  }

  set isRemote(isRemote: boolean) {
    this._isRemote = isRemote;
  }

  get fileName(): string {
    return this.path.split(/[\\/]/).pop();
  }

  get baseName(): string {
    if (!this.fileName.includes('.')) return this.fileName;

    let parts: Array<string> = this.fileName.split('.');
    parts = parts.slice(0, parts.length - 1);
    return parts.join('.');
  }

  get extension(): string {
    if (this.isDirectory) throw new Error('Cannot get extension of directory');

    if (!this.fileName.includes('.')) return '';
    return this.fileName.split('.').pop();
  }

  get directory(): string {
    let parts: Array<string> = this.path.split(/[\\/]/);
    parts = parts.slice(0, parts.length - 1);
    return parts.join(this.path.includes('\\') ? '\\' : '/');
  }

  static fromObject(obj: any): File {
    let path: string = obj?.path || obj?._path || '/';
    let isDirectory: boolean = obj?.isDirectory || obj?._isDirectory || false;
    let isRemote: boolean = obj?.isRemote || obj?._isRemote || false;
    return new File(path, isDirectory, isRemote);
  }
}
