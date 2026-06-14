import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Whatsapp } from "../models/whatsapp.model";

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  userType = localStorage.getItem('userType') || 'normal';
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/' + (['test', 'test_coor'].includes(this.userType) ? 'test/' : '') + 'whatsapp';

  constructor(private http: HttpClient) {}

  getWhatsapp(): Observable<Whatsapp[]> {
    return this.http.get<Whatsapp[]>(this.apiUrl);
  }

  getWhatsappFromSheet(): Observable<Whatsapp[]> {
    return this.http.get<Whatsapp[]>(`${this.apiUrl}/from-sheet`);
  }

  createWhatsapp(payload: Partial<Whatsapp> & { sheet_row?: number }): Observable<Whatsapp> {
    return this.http.post<Whatsapp>(this.apiUrl, payload);
  }

  updateWhatsapp(id: number, payload: Partial<Whatsapp>): Observable<Whatsapp> {
    return this.http.put<Whatsapp>(`${this.apiUrl}/${id}`, payload);
  }

  deleteWhatsapp(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
