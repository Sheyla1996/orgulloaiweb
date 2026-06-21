import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Telefono } from "../models/telefono.model";

@Injectable({ providedIn: 'root' })
export class TelefonosService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getTelefonos(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(this.getApiUrl());
  }

  getTelefonosFromSheet(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(`${this.getApiUrl()}/from-sheet`);
  }

  createTelefono(payload: Partial<Telefono> & { sheet_row?: number }): Observable<Telefono> {
    return this.http.post<Telefono>(this.getApiUrl(), payload);
  }

  updateTelefono(id: number, payload: Partial<Telefono>): Observable<Telefono> {
    const backendPayload = {
      name: payload.name,
      telefono: payload.telefono,
      image: payload.telefono,
      zona: payload.zona
    };
    return this.http.put<Telefono>(`${this.getApiUrl()}/${id}`, backendPayload);
  }

  deleteTelefono(id: number): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl()}/${id}`);
  }

  private getApiUrl(): string {
    const userType = (localStorage.getItem('userType') || 'normal')?.toLocaleLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${forceTestMode || isTestUser ? 'test/' : ''}telefono`;
  }
}
