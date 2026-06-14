import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Telefono } from "../models/telefono.model";

@Injectable({ providedIn: 'root' })
export class TelefonosService {
  userType = localStorage.getItem('userType') || 'normal';
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/' + (['test', 'test_coor'].includes(this.userType) ? 'test/' : '') + 'telefono';

  constructor(private http: HttpClient) {}

  getTelefonos(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(this.apiUrl);
  }

  getTelefonosFromSheet(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(`${this.apiUrl}/from-sheet`);
  }

  createTelefono(payload: Partial<Telefono> & { sheet_row?: number }): Observable<Telefono> {
    return this.http.post<Telefono>(this.apiUrl, payload);
  }

  updateTelefono(id: number, payload: Partial<Telefono>): Observable<Telefono> {
    const backendPayload = {
      name: payload.name,
      telefono: payload.telefono,
      image: payload.telefono,
      zona: payload.zona
    };
    return this.http.put<Telefono>(`${this.apiUrl}/${id}`, backendPayload);
  }

  deleteTelefono(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
