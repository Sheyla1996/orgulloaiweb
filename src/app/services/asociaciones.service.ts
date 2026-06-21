import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Asociacion } from "../models/asociacion.model";

export interface UbicacionCompartida {
  id?: number;
  clientId?: string;
  uuid: string;
  displayName?: string | null;
  zona: string;
  userType?: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AsociacionesService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getAsociaciones(): Observable<Asociacion[]> {
    return this.http.get<Asociacion[]>(this.getApiUrl('asociacion'));
  }

  getUbicacionesCompartidas(ttlMinutes = 10): Observable<UbicacionCompartida[]> {
    return this.http.get<UbicacionCompartida[]>(`${this.getApiUrl('ubicacion')}?ttlMinutes=${ttlMinutes}`);
  }

  upsertUbicacionCompartida(payload: Partial<UbicacionCompartida> & { clientId: string; uuid: string; zona: string; userType: string; lat: number; lng: number; }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.getApiUrl('ubicacion'), payload);
  }

  deleteUbicacionCompartida(clientId: string): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl('ubicacion')}/${encodeURIComponent(clientId)}`);
  }

  getAsociacionesFromSheet(): Observable<Asociacion[]> {
    return this.http.get<Asociacion[]>(`${this.getApiUrl('asociacion')}/from-sheet`);
  }

  updatePosition(asociacion: any): Observable<any> {
    return this.http.post<any>(`${this.getApiUrl('asociacion')}/posicion`, asociacion);
  }

  createAsociacion(payload: Partial<Asociacion>): Observable<Asociacion> {
    return this.http.post<Asociacion>(this.getApiUrl('asociacion'), payload);
  }

  updateAsociacion(id: number, payload: Partial<Asociacion>): Observable<Asociacion> {
    return this.http.put<Asociacion>(`${this.getApiUrl('asociacion')}/${id}`, payload);
  }

  deleteAsociacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl('asociacion')}/${id}`);
  }

  changePosicion(id: number, nuevaPosicion: number): Observable<any> {
    return this.http.put<any>(`${this.getApiUrl('asociacion')}/${id}/posicion`, { nuevaPosicion });
  }

  private getApiUrl(resource: string): string {
    const userType = (localStorage.getItem('userType') || 'normal')?.toLocaleLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${forceTestMode || isTestUser ? 'test/' : ''}${resource}`;
  }
}
