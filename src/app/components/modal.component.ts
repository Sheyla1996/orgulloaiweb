// login.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatDialogModule
  ],
  templateUrl: './modal.component.html',
})
export class ModalComponent implements OnInit {
    
  installPromptEvent: any = null;
  showInstallButton = false;
  constructor(
    private dialogRef: MatDialogRef<ModalComponent>,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Check for install prompt event
      window.addEventListener('beforeinstallprompt', (event: any) => {
        event.preventDefault();
        this.installPromptEvent = event;
        this.showInstallButton = true;
      });
    }
  }

  onInstallPwa() {
    if (this.installPromptEvent) {
      this.installPromptEvent.prompt();
      this.installPromptEvent.userChoice.then((choiceResult: any) => {
        // Puedes ocultar el botón si el usuario acepta o rechaza
        this.showInstallButton = false;
        this.installPromptEvent = null;
      });
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  install(): void {
    /*if (isPlatformBrowser(this.platformId)) {
        window.open('https://www.ejemplo.com', '_blank');
    }*/
   this.dialogRef.close('install');
  }
}