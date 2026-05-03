import { Component } from '@angular/core';

/**
 * FaqComponent (Presentation Component)
 *
 * Displays frequently asked questions organized into five collapsible sections covering devices,
 * streaming and security, thresholds and alerts, operation and troubleshooting, and administration.
 * Each question uses HTML5 details/summary elements for progressive disclosure.
 *
 * Features:
 * - Organized into six semantic sections: Devices, Streams & Security, Thresholds & Alerts, Operation & Troubleshooting, Administration
 * - Each section has an icon badge (blue, red, yellow, green, purple) for visual categorization
 * - Collapsible details elements with animated chevron rotation on expand/collapse (group-open:rotate-180)
 * - Summary elements styled as interactive buttons with hover effects
 * - Responsive spacing with md: breakpoints for larger screens
 * - Dark mode support via dark: Tailwind prefix
 * - Code blocks embedded in answers with background and padding (e.g., <code> tags)
 * - Colored alert boxes (bg-blue-50, bg-purple-50) with checkmarks or status text
 * - Multiple details per section (2-3 questions each)
 * - No data binding or Observable subscriptions (static FAQ content)
 *
 * @selector app-faq
 * @standalone true
 * @imports none
 * @example
 * <app-faq />
 */
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [],
  templateUrl: './faq.component.html',
})
export class FaqComponent {}
