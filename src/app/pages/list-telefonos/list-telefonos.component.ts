import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TelefonosService } from '../../services/telefonos.service';
import { Telefono } from '../../models/telefono.model';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';


@Component({
    selector: 'app-list-telefonos',
    imports: [
      CommonModule,
      FormsModule,
      MatIconModule
    ],
    standalone: true,
    templateUrl: './list-telefonos.component.html',
    styleUrls: ['./list-telefonos.component.scss']
})
export class ListTelefonosComponent implements OnInit {
  telefonos: Telefono[] = [];
  filteredTelefonos: Telefono[] = [];
  searchText = '';

  constructor(private telefonosService: TelefonosService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const cached = localStorage.getItem('telefonos');
      if (cached) {
        this.telefonos = JSON.parse(cached);
        this.filteredTelefonos = this.telefonos;
      }
      this.telefonosService.getTelefonos().subscribe({
        next: data => {
          this.telefonos = data;
          this.filteredTelefonos = data;
          localStorage.setItem('telefonos', JSON.stringify(data));
        },
        error: err => {
          console.error('Error fetching telefonos:', err);
          // Optionally, you can handle the error by showing a message to the user
        }
      });
    }
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
    this.filteredTelefonos = this.telefonos.filter(t =>
      t.name.toLowerCase().includes(term) || t.zona.toLowerCase().includes(term)
    );
  }

}
