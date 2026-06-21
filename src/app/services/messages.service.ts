import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly apiBase = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  getMessages(): Observable<any[]> {
    return this.http.get<any[]>(this.getApiUrl());
  }


  sendMessage(message: any): Observable<any> {
    return this.http.post<any>(this.getApiUrl(), message);
  }

  private getApiUrl(): string {
    const userType = (localStorage.getItem('userType') || 'normal').toLowerCase();
    const forceTestMode = localStorage.getItem('test') === 'true';
    const isTestUser = ['test', 'test_coor'].includes(userType);
    return `${this.apiBase}/${forceTestMode || isTestUser ? 'test/' : ''}message`;
  }
}
