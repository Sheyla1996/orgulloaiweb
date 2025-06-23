import { CommonModule, isPlatformBrowser } from "@angular/common";
import { Component, Inject, NO_ERRORS_SCHEMA, OnInit, PLATFORM_ID } from "@angular/core";
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule
  ],
  template: `<p>Home Component</p>`,
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeComponent implements OnInit {

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private router: Router
    ) {
        
    }

    async ngOnInit(): Promise<void> {
        console.log('HomeComponent initialized');
        console.log('Platform ID:', this.platformId);
        if (isPlatformBrowser(this.platformId)) {
            console.log('Running in browser context');
            const userType = localStorage.getItem('userType');
            console.log('User Type:', userType);
            if (!userType) {
                this.router.navigate(['/login']);
            } else {
                this.router.navigate(['/asociaciones']);
            }
        }
    }
}