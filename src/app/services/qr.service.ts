import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface QrValidationResponse {
  ok: boolean;
  result?: 'ok' | 'ko' | string;
  zona?: string;
  type?: string;
  description?: string;
  year?: number;
  mensaje?: string;
}

export interface Pulsera {
  uuid: string;
  zona: string;
  type: string;
  description?: string;
  year?: number;
}

export interface PulseraPayload {
  zona: string;
  type: string;
  uuid?: string;
  description?: string;
  year?: number;
}

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  validateUuid(uuid: string): Observable<QrValidationResponse> {
    return this.http.get<QrValidationResponse>(`${this.getApiUrl()}/pulsera/${encodeURIComponent(uuid)}`);
  }

  getPulseras(): Observable<Pulsera[]> {
    return this.http.get<Pulsera[]>(`${this.getApiUrl()}/pulsera`);
  }

  createPulsera(payload: PulseraPayload): Observable<Pulsera> {
    return this.http.post<Pulsera>(`${this.getApiUrl()}/pulsera`, payload);
  }

  updatePulsera(uuid: string, payload: Partial<PulseraPayload>): Observable<Pulsera> {
    return this.http.put<Pulsera>(`${this.getApiUrl()}/pulsera/${encodeURIComponent(uuid)}`, payload);
  }

  deletePulsera(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl()}/pulsera/${encodeURIComponent(uuid)}`);
  }

  private getApiUrl(): string {
    const userType = (localStorage.getItem('userType') || 'normal').toLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${''}`.replace(/\/$/, '');
  }
}
