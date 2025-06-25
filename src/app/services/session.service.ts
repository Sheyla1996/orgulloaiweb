import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  get userType(): string | null {
    return localStorage.getItem('userType');
  }

  clear(): void {
    localStorage.removeItem('userType');
    localStorage.removeItem('zone');
  }
}