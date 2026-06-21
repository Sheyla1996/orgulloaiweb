import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Carroza } from '../models/carroza.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CarrozasService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getCarrozas(): Observable<Carroza[]> {
    return this.http.get<Carroza[]>(this.getApiUrl());
  }

  getCarrozasFromSheet(): Observable<Carroza[]> {
    return this.http.get<Carroza[]>(`${this.getApiUrl()}/from-sheet`);
  }

  updatePosition(carrozas: any): Observable<any> {
    return this.http.post<any>(`${this.getApiUrl()}/posicion`, carrozas);
  }

  updateState(id:number, carroza: any): Observable<any> {
    return this.http.put<any>(`${this.getApiUrl()}/${id}/estado`, carroza);
  }

  createCarroza(payload: any): Observable<Carroza> {
    return this.http.post<Carroza>(this.getApiUrl(), payload);
  }

  updateCarroza(id: number, payload: any): Observable<Carroza> {
    return this.http.put<Carroza>(`${this.getApiUrl()}/${id}`, payload);
  }

  deleteCarroza(id: number): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl()}/${id}`);
  }

  changePosicion(id: number, nuevaPosicion: number): Observable<any> {
    return this.http.put<any>(`${this.getApiUrl()}/${id}/posicion`, { nuevaPosicion });
  }

  private getApiUrl(): string {
    const userType = (localStorage.getItem('userType') || 'normal').toLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${forceTestMode || isTestUser ? 'test/' : ''}carroza`;
  }
}
