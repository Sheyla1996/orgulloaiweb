import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/message';

  constructor(private http: HttpClient) {}

  getMessages(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }


  sendMessage(message: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, message);
  }
}
