import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Ubicacion } from "../models/ubicacion.model";

@Injectable({ providedIn: 'root' })
export class UbicacionesService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getUbicaciones(): Observable<Ubicacion[]> {
    return this.http.get<Ubicacion[]>(this.getApiUrl());
  }

  deleteUbicacion(clientId: string): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl()}/${encodeURIComponent(clientId)}`);
  }

  private getApiUrl(): string {
    const userType = (localStorage.getItem('userType') || 'normal')?.toLocaleLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${forceTestMode || isTestUser ? 'test/' : ''}ubicacion`;
  }
}
