import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Whatsapp } from "../models/whatsapp.model";

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/whatsapp';

  constructor(private http: HttpClient) {}

  getWhatsapp(): Observable<Whatsapp[]> {
    return this.http.get<Whatsapp[]>(this.apiUrl);
  }

  getWhatsappFromSheet(): Observable<Whatsapp[]> {
    return this.http.get<Whatsapp[]>(`${this.apiUrl}/from-sheet`);
  }
}
