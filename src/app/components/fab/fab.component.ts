import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  animations: speedDialFabAnimations
})
export class FabComponent implements OnInit {

    _options: any[] = [];
  @Input() set options(value: any[]) {
    this._options = value;
    this.cdr.detectChanges(); // fuerza actualización del DOM
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
}
