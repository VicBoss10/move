import { Component } from '@angular/core';

import { FaqComponent } from '../../../shared/components/help/faq/faq.component';

/**
 * FAQ Page container
 */
@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [FaqComponent],
  templateUrl: './faq.component.html',
})
export class FaqPageComponent {}
