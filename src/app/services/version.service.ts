// version.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class VersionService {
  constructor(private http: HttpClient) {}

  getVersion() {
    return this.http.get('/assets/version.txt', { responseType: 'text' });
  }
}