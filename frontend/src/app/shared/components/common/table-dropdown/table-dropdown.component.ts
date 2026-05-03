import { CommonModule } from '@angular/common';
import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { createPopper, Instance } from '@popperjs/core';

interface DropdownButton {
  // Define the structure of the dropdown button
}

interface DropdownContent {
  // Define the structure of the dropdown content
}

@Component({
  selector: 'app-table-dropdown',
  imports: [CommonModule],
  templateUrl: './table-dropdown.component.html',
  styles: ``,
})
export class TableDropdownComponent implements AfterViewInit, OnDestroy {
  @Input() dropdownButton!: DropdownButton;
  @Input() dropdownContent!: DropdownContent;
  @ViewChild('buttonRef') buttonRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;

  isOpen = false;
  private popperInstance: Instance | null = null;

  constructor() {}

  ngAfterViewInit() {
    document.addEventListener('click', this.close.bind(this));

    if (this.buttonRef && this.contentRef) {
      this.popperInstance = createPopper(
        this.buttonRef.nativeElement,
        this.contentRef.nativeElement,
        {
          placement: 'bottom-end',
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 4],
              },
            },
          ],
        },
      );
    }
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.close.bind(this));
    if (this.popperInstance) {
      this.popperInstance.destroy();
      this.popperInstance = null;
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.popperInstance) {
      this.popperInstance.update();
    }
  }

  close(event: MouseEvent) {
    const target = event.target as Node;
    if (this.buttonRef && this.contentRef) {
      const dropdown = this.buttonRef.nativeElement.closest('div');
      if (dropdown && !dropdown.contains(target)) {
        this.isOpen = false;
      }
    }
  }
}
