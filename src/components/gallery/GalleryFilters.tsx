import { Search, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption = 'name' | 'modified' | 'created';

interface GalleryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  revisionFilter: string;
  onRevisionFilterChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  availableRevisions: string[];
}

export function GalleryFilters({
  search,
  onSearchChange,
  revisionFilter,
  onRevisionFilterChange,
  sortBy,
  onSortChange,
  availableRevisions,
}: GalleryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search instruments..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={revisionFilter} onValueChange={onRevisionFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Revisions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Revisions</SelectItem>
          {availableRevisions.map((rev) => (
            <SelectItem key={rev} value={rev}>
              {rev}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-[160px]">
          <SortAsc className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="modified">Last Modified</SelectItem>
          <SelectItem value="created">Date Created</SelectItem>
          <SelectItem value="name">Name</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
