import { createContext, useContext, useState, ReactNode, useEffect, Dispatch, SetStateAction } from 'react';

interface SearchContextType {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children, initialOpen = false, onSearchStateChange }: { children: ReactNode; initialOpen?: boolean; onSearchStateChange?: Dispatch<SetStateAction<boolean>> }) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  useEffect(() => {
    onSearchStateChange?.(isOpen);
  }, [isOpen, onSearchStateChange]);

  return (
    <SearchContext.Provider value={{ isOpen, openSearch: () => setIsOpen(true), closeSearch: () => setIsOpen(false) }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
