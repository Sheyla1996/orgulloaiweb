import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getSettings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/settings`);
  }

  createSetting(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/settings`, payload);
  }

  updateSetting(id: string, payload: Partial<any>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/settings/${encodeURIComponent(id)}`, payload);
  }

  deleteSetting(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/settings/${encodeURIComponent(id)}`);
  }
}