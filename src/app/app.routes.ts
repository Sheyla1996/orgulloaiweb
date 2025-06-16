import { Routes } from '@angular/router';
import { ListCarrozasComponent } from './pages/list-carrozas/list-carrozas.component';
import { ListAsociacionesComponent } from './pages/list-asociaciones/list-asociaciones.component';
import { ListTelefonosComponent } from './pages/list-telefonos/list-telefonos.component';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: '', redirectTo: '/asociaciones', pathMatch: 'full' },
    { path: 'carrozas', component: ListCarrozasComponent, canActivate: [AuthGuard] },
    { path: 'asociaciones', component: ListAsociacionesComponent, canActivate: [AuthGuard] },
    { path: 'telefonos', component: ListTelefonosComponent, canActivate: [AuthGuard] }
];
