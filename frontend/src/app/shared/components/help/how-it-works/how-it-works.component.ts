import { Component } from '@angular/core';

/**
 * HowItWorksComponent (Presentation Component)
 *
 * Displays a visual step-by-step walkthrough of the system's data flow and architecture, organized into
 * four main stages: Data Flow (cameras and sensors), Vehicle Detection (ML processing), Backend & Security
 * (API and storage), and Visualization & Analysis (dashboards). Includes a practical tips section.
 *
 * Features:
 * - Four sequential step cards with icon badges (blue, purple, green, orange) for visual categorization
 * - Step 1: Data Flow - describes cameras (RTSP/HTTP) and sensors (CO₂, temperature, etc.) as inputs
 * - Step 2: Detection - covers Python microservice with YOLO11n model execution and event emission
 * - Step 3: Backend & Security - Spring Boot API, Keycloak JWT authentication, metadata enrichment, threshold rules
 * - Step 4: Visualization - Angular dashboards with time series, location analysis, heat maps
 * - Responsive grid layouts: single column mobile, two columns for step details (cameras/sensors), three columns for dashboard types
 * - Icon badges for each step (blue, purple, green, orange) with SVG icons
 * - Card styling with hover shadows and dark mode support via dark: prefix
 * - Practical tips section at bottom with amber background, containing four actionable recommendations
 * - No data binding or Observable subscriptions (static educational content)
 *
 * @selector app-how-it-works
 * @standalone true
 * @imports none
 * @example
 * <app-how-it-works />
 */
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [],
  templateUrl: './how-it-works.component.html',
})
export class HowItWorksComponent {}
