import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TelefonosService } from '../../services/telefonos.service';
import { Telefono } from '../../models/telefono.model';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';


@Component({
    selector: 'app-list-telefonos',
    imports: [FormsModule],
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
    this.telefonosService.getTelefonos().subscribe(data => {
      this.telefonos = data;
      this.filteredTelefonos = data;
    });
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
    this.filteredTelefonos = this.telefonos.filter(t =>
      t.name.toLowerCase().includes(term) || t.zona.toLowerCase().includes(term)
    );
  }

  call(number: string): void {

    if (number && isPlatformBrowser(this.platformId)) window.location.href = `tel:${number}`;
  }
}
