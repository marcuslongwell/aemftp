import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { DndModule } from 'ngx-drag-drop';

import { HomeRoutingModule } from './home-routing.module';

import { FolderNameDialog, HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [HomeComponent, FolderNameDialog],
  imports: [
    CommonModule, SharedModule, HomeRoutingModule, BrowserAnimationsModule,
    MatButtonModule, MatInputModule, MatFormFieldModule, MatIconModule, MatMenuModule,
    MatSelectModule, DndModule, MatDialogModule
  ]
})
export class HomeModule {}
