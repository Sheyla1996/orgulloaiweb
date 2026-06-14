import { Routes } from '@angular/router';
import { ListCarrozasComponent } from './pages/list-carrozas/list-carrozas.component';
import { ListAsociacionesComponent } from './pages/list-asociaciones/list-asociaciones.component';
import { ListTelefonosComponent } from './pages/list-telefonos/list-telefonos.component';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminEditorComponent } from './pages/admin/admin-editor.component';
import { ChatComponent } from './pages/list-messages/list-messages.component';
import { HomeComponent } from './pages/home/home.component';
import { QrComponent } from './pages/qr/qr.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'qr', component: QrComponent },
    {
        path: 'asociaciones',
        component: ListAsociacionesComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss', 'tarde', 'willy', 'test_coor', 'test'] }
    },
    { path: 'login', component: LoginComponent },
    {
        path: 'carrozas',
        component: ListCarrozasComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['mañana', 'boss', 'willy', 'test_coor'] }
    },
    {
        path: 'telefonos',
        component: ListTelefonosComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss', 'tarde', 'willy', 'test_coor', 'test'] }
    },
    {
        path: 'messages',
        component: ChatComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss', 'tarde', 'willy', 'test_coor', 'test'] }
    },
    {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    },
    {
        path: 'admin/editor',
        component: AdminEditorComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    }
];
