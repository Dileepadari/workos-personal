import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/contexts/SearchContext';

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  const { openSearch } = useSearch();

  const handleSearchClick = () => {
    openSearch();
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search everything..."
            onClick={handleSearchClick}
            onFocus={handleSearchClick}
            className="pl-10 pr-16 h-10 cursor-pointer"
            readOnly
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-2 py-1 text-xs text-muted-foreground bg-muted font-semibold">⌘K</kbd>
        </div>
      </div>
    </div>
  );
}
