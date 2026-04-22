import { Component, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from '../../components/header/user-dropdown/user-dropdown.component';
import { SearchService, SearchEntry } from '../../../core/services/search.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ThemeToggleButtonComponent,
    //NotificationDropdownComponent,
    UserDropdownComponent,
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent implements OnDestroy, AfterViewInit {
  isApplicationMenuOpen = false;
  readonly isMobileOpen$;

  searchQuery = new FormControl('');
  suggestions$!: Observable<SearchEntry[]>;
  showDropdown = false;
  selectedIndex = -1;
  latestSuggestions: SearchEntry[] = [];

  private destroy$ = new Subject<void>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private searchService: SearchService,
    private authService: AuthService,
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;

    this.suggestions$ = this.searchQuery.valueChanges.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      map((q) => {
        this.selectedIndex = -1;
        const isAdmin = this.authService
          .getUserInfo()
          .roles.some((r: string) => r.toLowerCase() === 'admin');
        return this.searchService.search(q ?? '', isAdmin);
      }),
      takeUntil(this.destroy$),
    );

    // Keep latest suggestions for keyboard navigation without relying on template locals
    this.suggestions$.pipe(takeUntil(this.destroy$)).subscribe((vals) => {
      this.latestSuggestions = vals || [];
      const q = (this.searchQuery.value || '').toString();
      // Show dropdown when we have suggestions or user typed >=2 chars
      this.showDropdown = this.latestSuggestions.length > 0 || q.length >= 2;
    });
  }

  navigateTo(path: string) {
    this.router.navigateByUrl(path);
    this.searchQuery.setValue('', { emitEvent: false });
    this.showDropdown = false;
    this.selectedIndex = -1;
  }

  onFocus() {
    const q = (this.searchQuery.value || '').toString();
    const isAdmin = this.authService
      .getUserInfo()
      .roles.some((r: string) => r.toLowerCase() === 'admin');

    if (q.length >= 2) {
      // perform an immediate search so suggestions populate on focus
      this.latestSuggestions = this.searchService.search(q, isAdmin);
    }

    // Show dropdown only when there are suggestions or when user typed >=2 chars
    this.showDropdown =
      (this.latestSuggestions && this.latestSuggestions.length > 0) || q.length >= 2;
  }

  hideSuggestions() {
    // Delay to allow click on suggestion to fire first
    setTimeout(() => {
      this.showDropdown = false;
      this.selectedIndex = -1;
    }, 150);
  }

  onSearchKeydown(event: KeyboardEvent) {
    const suggestions = this.latestSuggestions || [];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, suggestions.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    } else if (event.key === 'Enter') {
      // Prevent form submission/reload. If an item is selected, navigate to it.
      event.preventDefault();
      if (this.selectedIndex >= 0) {
        this.navigateTo(suggestions[this.selectedIndex].path);
      }
    } else if (event.key === 'Escape') {
      this.showDropdown = false;
      this.selectedIndex = -1;
      this.searchInput.nativeElement.blur();
    }
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
      this.showDropdown = true;
    }
  };
}
