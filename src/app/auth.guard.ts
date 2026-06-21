// auth.guard.ts
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (isPlatformBrowser(this.platformId)) {
      const userType = localStorage.getItem('userType')?.toLocaleLowerCase();
      const zona = localStorage.getItem('zone')?.toLocaleLowerCase();
      const allowed = route.data['allowed'] as string[] | undefined;
      const year = localStorage.getItem('year');
      const actualYear = new Date().getFullYear();

      if (state.url === '/login') {
        return true;
      }

      if (year !== actualYear.toString()) {
        return this.router.parseUrl('/login');
      }

      if (!allowed || allowed.includes(userType || zona || '')) {
        return true;
      }

      if (userType) {
        return this.router.parseUrl('');
      }

      return this.router.parseUrl('/login');
    }
    return false;
  }

}