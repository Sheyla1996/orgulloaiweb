import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Carroza } from '../models/carroza.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CarrozasService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/carroza';

  constructor(private http: HttpClient) {}

  getCarrozas(): Observable<Carroza[]> {
    return this.http.get<Carroza[]>(this.apiUrl);
  }
}
