import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { speedDialFabAnimations } from './fab.animations';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fab',
  templateUrl: './fab.component.html',
  styleUrls: ['./fab.component.scss'],
  standalone: true,
  imports: [
    CommonModule
  ],
  animations: speedDialFabAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FabComponent implements OnInit {

  _options: any[] = [];
  @Input() set options(value: any[]) {
    console.log('FAB Component - Setting options:', value); // Debug log
    this._options = [...(value || [])]; // Create a new array reference
    this.cdr.markForCheck();
    this.cdr.detectChanges(); // fuerza actualización del DOM
  }

  get options(): any[] {
    return this._options;
  }

  @Output() onFabMenuItemSelected = new EventEmitter<any>();


  public fabTogglerState = 'inactive';

  constructor(private cdr: ChangeDetectorRef) {}


  public ngOnInit() {
  }

  public showItems() {
    this.fabTogglerState = 'active';
    
  }

  public hideItems() {
    this.fabTogglerState = 'inactive';
  }

  public toggle() {
    this.fabTogglerState === 'active'
      ? this.hideItems() 
      : this.showItems();
  }

  onClickItem(item: string){
    this.onFabMenuItemSelected.emit(item);
  }

  // Method to force update - useful for iOS
  public forceUpdate(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
