import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Asociacion } from "../models/asociacion.model";

@Injectable({ providedIn: 'root' })
export class AsociacionesService {
  userType = localStorage.getItem('userType') || 'normal';
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/' + (['test', 'test_coor'].includes(this.userType) ? 'test/' : '') + 'asociacion';

  constructor(private http: HttpClient) {}

  getAsociaciones(): Observable<Asociacion[]> {
    return this.http.get<Asociacion[]>(this.apiUrl);
  }

  getAsociacionesFromSheet(): Observable<Asociacion[]> {
    return this.http.get<Asociacion[]>(`${this.apiUrl}/from-sheet`);
  }

  updatePosition(asociacion: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/posicion`, asociacion);
  }

  createAsociacion(payload: Partial<Asociacion>): Observable<Asociacion> {
    return this.http.post<Asociacion>(this.apiUrl, payload);
  }

  updateAsociacion(id: number, payload: Partial<Asociacion>): Observable<Asociacion> {
    return this.http.put<Asociacion>(`${this.apiUrl}/${id}`, payload);
  }

  deleteAsociacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  changePosicion(id: number, nuevaPosicion: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/posicion`, { nuevaPosicion });
  }
}
