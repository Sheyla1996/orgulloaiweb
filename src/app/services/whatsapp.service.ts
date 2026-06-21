import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Whatsapp } from "../models/whatsapp.model";

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getWhatsapp(): Observable<Whatsapp[]> {
    return this.http.get<Whatsapp[]>(this.getApiUrl());
  }

  getWhatsappFromSheet(): Observable<Whatsapp[]> {
    return this.http.get<Whatsapp[]>(`${this.getApiUrl()}/from-sheet`);
  }

  createWhatsapp(payload: Partial<Whatsapp> & { sheet_row?: number }): Observable<Whatsapp> {
    return this.http.post<Whatsapp>(this.getApiUrl(), payload);
  }

  updateWhatsapp(id: number, payload: Partial<Whatsapp>): Observable<Whatsapp> {
    return this.http.put<Whatsapp>(`${this.getApiUrl()}/${id}`, payload);
  }

  deleteWhatsapp(id: number): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl()}/${id}`);
  }

  private getApiUrl(): string {
    const userType = (localStorage.getItem('userType') || 'normal').toLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${forceTestMode || isTestUser ? 'test/' : ''}whatsapp`;
  }
}
