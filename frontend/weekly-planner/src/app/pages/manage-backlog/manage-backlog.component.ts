import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { BacklogItem, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-manage-backlog',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <div class="flex items-center gap-sm mb-md">
          <button class="btn btn--secondary btn--sm" (click)="router.navigate(['/home'])">← Home</button>
        </div>
        <h2 class="mb-md">Manage Backlog</h2>

        <!-- Add button -->
        <button class="btn btn--primary mb-lg" (click)="openAddForm()">
          + Add a New Backlog Item
        </button>

        <!-- Category filter tabs -->
        <div class="cat-tabs mb-md">
          <button class="cat-tab cat-tab--client" [class.cat-tab--active]="filterCategory === 'Client'"
            (click)="setCategory('Client')">Client Focused</button>
          <button class="cat-tab cat-tab--techdebt" [class.cat-tab--active]="filterCategory === 'TechDebt'"
            (click)="setCategory('TechDebt')">Tech Debt</button>
          <button class="cat-tab cat-tab--rnd" [class.cat-tab--active]="filterCategory === 'RnD'"
            (click)="setCategory('RnD')">R&amp;D</button>
          @if (filterCategory) {
            <button class="cat-tab" (click)="setCategory('')">✕ All</button>
          }
        </div>

        <!-- Filters row: availability dropdown + search -->
        <div class="filters-row mb-md">
          <select class="form-control filter-select" [(ngModel)]="filterAvailability"
            (ngModelChange)="applyFilters()">
            <option value="available">Available Only</option>
            <option value="all">Show All</option>
            <option value="archived">Archived</option>
          </select>
          <input class="form-control search-input"
            [(ngModel)]="searchText"
            (ngModelChange)="applyFilters()"
            placeholder="Search by title" />
        </div>

        <!-- Items count -->
        <p class="text-sm text-muted mb-md">{{ filtered().length }} item{{ filtered().length !== 1 ? 's' : '' }} found</p>

        <!-- List -->
        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (filtered().length === 0) {
          <div class="card text-center" style="padding: var(--space-2xl);">
            <p class="text-muted">No backlog items found.</p>
            <button class="btn btn--primary mt-md" (click)="openAddForm()">+ Add First Item</button>
          </div>
        } @else {
          <div class="backlog-list">
            @for (item of filtered(); track item.id) {
              <div class="backlog-row" [class.backlog-row--archived]="!item.isActive">

                <!-- Left: title + badges -->
                <div class="backlog-row__left">
                  <span class="item-title">{{ item.title }}</span>
                  <span class="badge cat-badge cat-badge--{{ badgeClass(item.category) }}">
                    {{ catLabel(item.category) }}
                  </span>
                  @if (item.estimatedHours) {
                    <span class="est-pill">{{ item.estimatedHours }}h est.</span>
                  }
                  @if (item.isActive) {
                    <span class="status-chip status-chip--available">AVAILABLE</span>
                  } @else {
                    <span class="status-chip status-chip--archived">ARCHIVED</span>
                  }
                </div>

                <!-- Right: action buttons -->
                <div class="backlog-row__actions">
                  <button class="btn btn--secondary btn--sm" (click)="openEdit(item)">
                    View &amp; Edit
                  </button>

                  @if (item.isActive) {
                    <!-- Active item: Archive button -->
                    <button class="btn btn--warning-outline btn--sm"
                      [disabled]="busyId() === item.id"
                      (click)="archiveItem(item)">
                      @if (busyId() === item.id) { <span class="spinner"></span> } @else { Archive }
                    </button>
                  } @else {
                    <!-- Archived item: Unarchive button -->
                    <button class="btn btn--success-outline btn--sm"
                      [disabled]="busyId() === item.id"
                      (click)="unarchiveItem(item)">
                      @if (busyId() === item.id) { <span class="spinner"></span> } @else { Unarchive }
                    </button>
                  }

                  <!-- Delete button always shown -->
                  <button class="btn btn--danger-outline btn--sm"
                    [disabled]="busyId() === item.id"
                    (click)="confirmDelete(item)">
                    Delete
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ── Add / Edit Modal ────────────────────────────────────────────────── -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="flex items-center gap-sm mb-lg">
            <button class="btn btn--secondary btn--sm" (click)="closeModal()">← Go Back</button>
          </div>
          <h3 class="mb-lg">{{ editTarget() ? 'Edit Backlog Item' : 'Add a New Backlog Item' }}</h3>

          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-control" [(ngModel)]="editTitle" placeholder="Enter item title" />
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="4" [(ngModel)]="editDescription"
              placeholder="Describe the work..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Category
              @if (editTarget()) {
                <span class="text-muted" style="font-size:0.75rem; font-weight:400;"> (cannot change category of existing item)</span>
              }
            </label>
            <select class="form-control" [(ngModel)]="editCategory"
              [disabled]="!!editTarget()">
              <option value="Client">Client Focused</option>
              <option value="TechDebt">Tech Debt</option>
              <option value="RnD">R&amp;D</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Estimated hours <span class="text-muted">(optional)</span></label>
            <input type="number" class="form-control" [(ngModel)]="editHours"
              min="1" placeholder="e.g. 12" />
          </div>

          <div class="flex gap-md mt-lg">
            <button class="btn btn--primary" [disabled]="saving()" (click)="saveModal()">
              @if (saving()) { <span class="spinner"></span> Saving... } @else { Save This Item }
            </button>
            <button class="btn btn--secondary" (click)="closeModal()">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Delete Confirmation Modal ──────────────────────────────────────── -->
    @if (deleteTarget()) {
      <div class="modal-overlay" (click)="deleteTarget.set(null)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3 style="color: var(--status-error);">🗑️ Delete Backlog Item?</h3>
          <p style="color: var(--text-secondary); margin: var(--space-md) 0; line-height: 1.6;">
            You are about to <strong>permanently delete</strong>
            "<strong>{{ deleteTarget()?.title }}</strong>".<br/>
            @if (deleteTarget()?.isActive) {
              This item is currently available. Consider <strong>archiving</strong> it instead to preserve history.
            } @else {
              This will permanently remove it from the system. This cannot be undone.
            }
          </p>
          <div class="flex gap-md">
            <button class="btn btn--danger-solid" [disabled]="deleting()" (click)="deleteItem()">
              @if (deleting()) { <span class="spinner"></span> } @else { Yes, Delete Permanently }
            </button>
            <button class="btn btn--secondary" (click)="deleteTarget.set(null)">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cat-tabs { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
    .cat-tab {
      padding: 0.4rem 1rem; border-radius: 6px;
      border: 1px solid var(--border); background: var(--bg-input);
      color: var(--text-secondary); font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
      &:hover { opacity: 0.85; }
    }
    .cat-tab--client   { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); color: #60a5fa; }
    .cat-tab--techdebt { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.4); color: #fb923c; }
    .cat-tab--rnd      { background: rgba(34,197,94,0.15);  border-color: rgba(34,197,94,0.4);  color: #4ade80; }
    .cat-tab--active   { box-shadow: 0 0 0 2px currentColor; }

    .filters-row { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
    .filter-select { flex: 0 0 auto; min-width: 150px; }
    .search-input  { flex: 1; min-width: 180px; }

    .backlog-list { display: flex; flex-direction: column; gap: var(--space-sm); }

    .backlog-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-md); padding: var(--space-md) var(--space-lg);
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); flex-wrap: wrap;
      transition: opacity 0.2s;
    }
    .backlog-row--archived { opacity: 0.6; }

    .backlog-row__left {
      display: flex; align-items: center; gap: var(--space-sm);
      flex-wrap: wrap; flex: 1; min-width: 0;
    }

    .item-title { font-weight: 600; font-size: 0.95rem; }

    .cat-badge {
      font-size: 0.72rem; padding: 2px 10px; border-radius: 4px;
      font-weight: 700; white-space: nowrap;
    }
    .cat-badge--client   { background: rgba(59,130,246,0.2);  color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .cat-badge--techdebt { background: rgba(249,115,22,0.2);  color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }
    .cat-badge--rnd      { background: rgba(34,197,94,0.2);   color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }

    .est-pill { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }

    .status-chip {
      font-size: 0.68rem; font-weight: 700; padding: 2px 8px;
      border-radius: 4px; letter-spacing: 0.05em; white-space: nowrap;
    }
    .status-chip--available { background: rgba(34,197,94,0.15);   color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .status-chip--archived  { background: rgba(100,116,139,0.15); color: var(--text-muted); border: 1px solid var(--border); }

    .backlog-row__actions { display: flex; gap: var(--space-sm); flex-shrink: 0; flex-wrap: wrap; }

    /* Button variants */
    .btn--warning-outline {
      background: rgba(249,115,22,0.12); color: #fb923c;
      border: 1px solid rgba(249,115,22,0.35);
      &:hover:not(:disabled) { background: rgba(249,115,22,0.22); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn--success-outline {
      background: rgba(34,197,94,0.12); color: #4ade80;
      border: 1px solid rgba(34,197,94,0.35);
      &:hover:not(:disabled) { background: rgba(34,197,94,0.22); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn--danger-outline {
      background: rgba(239,68,68,0.08); color: #ef4444;
      border: 1px solid rgba(239,68,68,0.3);
      &:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn--danger-solid {
      background: var(--status-error); color: white; border: none;
      padding: 0.5rem 1rem; border-radius: var(--border-radius);
      font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { background: #dc2626; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: var(--space-lg);
    }
    .modal-box {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-xl, 20px); padding: var(--space-xl);
      max-width: 560px; width: 100%;
      box-shadow: 0 8px 40px rgba(0,0,0,0.4);
      animation: fadeUp 0.2s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ManageBacklogComponent implements OnInit {
  readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly busyId = signal(0);       // id of item currently being archived/unarchived
  readonly showModal = signal(false);

  readonly allItems = signal<BacklogItem[]>([]);
  readonly filtered = signal<BacklogItem[]>([]);
  readonly editTarget = signal<BacklogItem | null>(null);
  readonly deleteTarget = signal<BacklogItem | null>(null);

  filterCategory: CategoryType | '' = '';
  filterAvailability = 'available';
  searchText = '';

  // Modal fields
  editTitle = '';
  editDescription = '';
  editCategory: CategoryType = 'Client';
  editHours: number | null = null;

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.api.getAllBacklog().subscribe({
      next: (items) => { this.allItems.set(items); this.applyFilters(); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load backlog.'); this.loading.set(false); }
    });
  }

  applyFilters(): void {
    let result = this.allItems();
    if (this.filterCategory) result = result.filter(i => i.category === this.filterCategory);
    if (this.filterAvailability === 'available') result = result.filter(i => i.isActive);
    else if (this.filterAvailability === 'archived') result = result.filter(i => !i.isActive);
    if (this.searchText.trim())
      result = result.filter(i => i.title.toLowerCase().includes(this.searchText.toLowerCase()));
    this.filtered.set(result);
  }

  setCategory(cat: CategoryType | ''): void {
    this.filterCategory = cat;
    this.applyFilters();
  }

  openAddForm(): void {
    this.editTarget.set(null);
    this.editTitle = ''; this.editDescription = '';
    this.editCategory = 'Client'; this.editHours = null;
    this.showModal.set(true);
  }

  openEdit(item: BacklogItem): void {
    this.editTarget.set(item);
    this.editTitle = item.title; this.editDescription = item.description;
    this.editCategory = item.category; this.editHours = item.estimatedHours ?? null;
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.editTarget.set(null); }

  saveModal(): void {
    if (!this.editTitle.trim()) { this.toast.error('Title is required.'); return; }
    if (this.editHours !== null && this.editHours <= 0) { this.toast.error('Estimated hours must be > 0.'); return; }
    this.saving.set(true);

    const target = this.editTarget();
    if (target) {
      this.api.updateBacklogItem(target.id, {
        title: this.editTitle.trim(), description: this.editDescription.trim(),
        category: this.editCategory, estimatedHours: this.editHours
      }).subscribe({
        next: (u) => {
          this.allItems.update(l => l.map(i => i.id === u.id ? u : i));
          this.applyFilters(); this.closeModal(); this.saving.set(false);
          this.toast.success(`"${u.title}" updated!`);
        },
        error: (e) => { this.toast.error(e.error?.detail ?? 'Update failed.'); this.saving.set(false); }
      });
    } else {
      this.api.createBacklogItem({
        title: this.editTitle.trim(), description: this.editDescription.trim(),
        category: this.editCategory, estimatedHours: this.editHours
      }).subscribe({
        next: (c) => {
          this.allItems.update(l => [...l, c]);
          this.applyFilters(); this.closeModal(); this.saving.set(false);
          this.toast.success(`"${c.title}" added to backlog!`);
        },
        error: (e) => { this.toast.error(e.error?.detail ?? 'Failed to add item.'); this.saving.set(false); }
      });
    }
  }

  archiveItem(item: BacklogItem): void {
    this.busyId.set(item.id);
    this.api.deleteBacklogItem(item.id).subscribe({
      next: () => {
        this.allItems.update(l => l.map(i => i.id === item.id ? { ...i, isActive: false } : i));
        this.applyFilters(); this.busyId.set(0);
        this.toast.success(`"${item.title}" archived.`);
      },
      error: (e) => { this.toast.error(e.error?.detail ?? 'Cannot archive: item may be in use.'); this.busyId.set(0); }
    });
  }

  unarchiveItem(item: BacklogItem): void {
    this.busyId.set(item.id);
    // Pass ALL current item fields so the backend doesn't accidentally wipe EstimatedHours
    this.api.updateBacklogItem(item.id, {
      title: item.title,
      description: item.description,
      category: item.category,
      estimatedHours: item.estimatedHours,
      isActive: true
    }).subscribe({
      next: (u) => {
        this.allItems.update(l => l.map(i => i.id === u.id ? u : i));
        this.applyFilters(); this.busyId.set(0);
        this.toast.success(`"${u.title}" is back in the backlog! ✅`);
      },
      error: (e) => { this.toast.error(e.error?.detail ?? 'Unarchive failed.'); this.busyId.set(0); }
    });
  }

  confirmDelete(item: BacklogItem): void { this.deleteTarget.set(item); }

  deleteItem(): void {
    const item = this.deleteTarget();
    if (!item) return;
    this.deleting.set(true);
    this.api.hardDeleteBacklogItem(item.id).subscribe({
      next: () => {
        this.allItems.update(l => l.filter(i => i.id !== item.id));
        this.applyFilters(); this.deleteTarget.set(null); this.deleting.set(false);
        this.toast.success(`"${item.title}" permanently deleted.`);
      },
      error: (e) => {
        this.toast.error(e.error?.detail ?? 'Cannot delete: item has been used in a plan. Try Archive instead.');
        this.deleteTarget.set(null); this.deleting.set(false);
      }
    });
  }

  catLabel(cat: CategoryType): string {
    return cat === 'Client' ? 'Client Focused' : cat === 'TechDebt' ? 'Tech Debt' : 'R&D';
  }
  badgeClass(cat: CategoryType): string {
    return cat === 'Client' ? 'client' : cat === 'TechDebt' ? 'techdebt' : 'rnd';
  }
}
