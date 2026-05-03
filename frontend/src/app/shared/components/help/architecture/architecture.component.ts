import { Component } from '@angular/core';

/**
 * ArchitectureComponent (Presentation Component)
 *
 * Displays a comprehensive system architecture overview with visual cards describing the four main
 * subsystems (Frontend Angular, Backend Spring Boot, Python Detection Service, Database), their communication
 * patterns, deployment recommendations, and security guidelines.
 *
 * Features:
 * - Responsive two-column grid layout (1 column mobile, 2 columns desktop) with four architecture cards
 * - Card 1: Primary Components (Frontend, Backend, Detector, Database) with descriptive text and icon badges
 * - Card 2: Communication (HTTP/broker event routing, JWT/Keycloak security note)
 * - Card 3: Deployment & Scalability (horizontal scaling, Docker/Kubernetes, caching, data partitioning)
 * - Card 4: Security & Operation (role-based access, audit/TLS, monitoring)
 * - Icon badges for each section (blue, purple, green, red color-coded)
 * - Hover shadows on cards for interactive feedback
 * - Dark mode support via dark: Tailwind prefix
 * - Semantic HTML structure with section grouping
 * - No data binding or Observable subscriptions (static presentation)
 *
 * @selector app-architecture
 * @standalone true
 * @imports none
 * @example
 * <app-architecture />
 */
@Component({
  selector: 'app-architecture',
  standalone: true,
  imports: [],
  templateUrl: './architecture.component.html',
})
export class ArchitectureComponent {}
