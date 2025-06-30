import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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

  @Input() 
  public options: any;

  @Output() onFabMenuItemSelected = new EventEmitter<any>();

  public buttons: any[] = [];

  public fabTogglerState = 'inactive';

  constructor() { }

  public ngOnInit() {
    const maxButtons = 6;
    if (this.options.length > maxButtons) {
      this.options.splice(5, this.options.buttons.length - maxButtons);
    }
  }

  public showItems() {
    this.fabTogglerState = 'active';
    this.buttons = this.options;
  }

  public hideItems() {
    this.fabTogglerState = 'inactive';
    this.buttons = [];
  }

  public toggle() {
    this.buttons.length 
      ? this.hideItems() 
      : this.showItems();
  }

  onClickItem(item: string){
    this.onFabMenuItemSelected.emit(item);
  }
}
