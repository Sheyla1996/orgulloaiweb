import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import Keyboard from 'simple-keyboard';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [
    MatIconModule
  ],
  encapsulation: ViewEncapsulation.None,
})
export class SearchComponent implements OnInit, AfterViewInit, OnDestroy {

  value = '';
  private keyboard?: Keyboard;
  @ViewChild('keyboardContainer', { static: false }) keyboardContainer?: ElementRef<HTMLDivElement>;
  @Output() searchTerm = new EventEmitter<string>();

  constructor() {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.initKeyboard();
  }

  ngOnDestroy(): void {
    this.destroyKeyboard();
  }

  private initKeyboard(): void {
    this.destroyKeyboard();

    const container = this.keyboardContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.keyboard = new Keyboard(container, {
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button),
      theme: "hg-theme-default myTheme1",
      layout: {
        'default': [
          '1 2 3 4 5 6 7 8 9 0 {bksp}',
          'q w e r t y u i o p',
          'a s d f g h j k l ñ',
          'z x c v b n m',
          '{space}'
        ],
      },
      display: {
        '{bksp}': '⌫',
        '{space}': 'Espacio',
      }
    });
  }

  private destroyKeyboard(): void {
    this.keyboard?.destroy();
    this.keyboard = undefined;
  }

  onChange = (input: string) => {
    this.value = input;
    this.searchTerm.emit(this.value);
  };

  onKeyPress = (button: string) => {
    /**
    * If you want to handle the shift and caps lock buttons
    */
    if (button === "{shift}" || button === "{lock}") this.handleShift();
  };

  onInputChange = (event: any) => {
    this.keyboard?.setInput(event.target.value);
  };

  handleShift = () => {
    if (!this.keyboard) {
      return;
    }

    let currentLayout = this.keyboard.options.layoutName;
    let shiftToggle = currentLayout === "default" ? "shift" : "default";
    this.keyboard.setOptions({
      layoutName: shiftToggle
    });
  };

  clear() {
    this.value = '';
    this.keyboard?.clearInput();
    this.searchTerm.emit(this.value);
  }


}
