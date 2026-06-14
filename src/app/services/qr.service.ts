import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface QrValidationResponse {
  ok: boolean;
  result?: 'ok' | 'ko' | string;
  zona?: string;
  type?: string;
  description?: string;
  mensaje?: string;
}

export interface Pulsera {
  uuid: string;
  zona: string;
  type: string;
  description?: string;
}

export interface PulseraPayload {
  zona: string;
  type: string;
  uuid?: string;
    description?: string;
}

@Injectable({ providedIn: 'root' })
export class QrService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  validateUuid(uuid: string): Observable<QrValidationResponse> {
    return this.http.get<QrValidationResponse>(`${this.apiUrl}/pulsera/${encodeURIComponent(uuid)}`);
  }

  getPulseras(): Observable<Pulsera[]> {
    return this.http.get<Pulsera[]>(`${this.apiUrl}/pulsera`);
  }

  createPulsera(payload: PulseraPayload): Observable<Pulsera> {
    return this.http.post<Pulsera>(`${this.apiUrl}/pulsera`, payload);
  }

  updatePulsera(uuid: string, payload: Partial<PulseraPayload>): Observable<Pulsera> {
    return this.http.put<Pulsera>(`${this.apiUrl}/pulsera/${encodeURIComponent(uuid)}`, payload);
  }

  deletePulsera(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/pulsera/${encodeURIComponent(uuid)}`);
  }
}
