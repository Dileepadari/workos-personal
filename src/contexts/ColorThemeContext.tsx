import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ColorPalette = 'common' | 'monokai' | 'github' | 'material' | 'original';

// Helper function to convert hex to HSL
function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Custom color palettes with light and dark mode support
export const colorPalettes: Record<ColorPalette, Record<string, string>> = {
  common: {
    // Light mode
    primary: hexToHSL('#2563eb'),
    primaryLight: hexToHSL('#dbeafe'),
    accent: hexToHSL('#22c55e'),
    accentLight: hexToHSL('#dcfce7'),
    background: hexToHSL('#ffffff'),
    surface: hexToHSL('#f9fafb'),
    border: hexToHSL('#e5e7eb'),
    text: hexToHSL('#1f2937'),
    textMuted: hexToHSL('#6b7280'),
    // Dark mode
    darkPrimary: hexToHSL('#3b82f6'),
    darkPrimaryLight: hexToHSL('#1e40af'),
    darkAccent: hexToHSL('#4ade80'),
    darkAccentLight: hexToHSL('#15803d'),
    darkBackground: hexToHSL('#0f172a'),
    darkSurface: hexToHSL('#1e293b'),
    darkBorder: hexToHSL('#334155'),
    darkText: hexToHSL('#f8fafc'),
    darkTextMuted: hexToHSL('#94a3b8'),
    // Semantic colors
    destructive: hexToHSL('#dc2626'),
    destructiveLight: hexToHSL('#fee2e2'),
    success: hexToHSL('#16a34a'),
    successLight: hexToHSL('#dcfce7'),
    warning: hexToHSL('#ea580c'),
    warningLight: hexToHSL('#ffedd5'),
    info: hexToHSL('#0284c7'),
    infoLight: hexToHSL('#e0f2fe'),
  },
  monokai: {
    // Light mode
    primary: hexToHSL('#f92672'),
    primaryLight: hexToHSL('#fce7f3'),
    accent: hexToHSL('#a6e22e'),
    accentLight: hexToHSL('#f0fde8'),
    background: hexToHSL('#fffaf3'),
    surface: hexToHSL('#fdf7f0'),
    border: hexToHSL('#f5e6d3'),
    text: hexToHSL('#272822'),
    textMuted: hexToHSL('#75715e'),
    // Dark mode
    darkPrimary: hexToHSL('#ff006e'),
    darkPrimaryLight: hexToHSL('#d7006b'),
    darkAccent: hexToHSL('#b6e946'),
    darkAccentLight: hexToHSL('#9bd336'),
    darkBackground: hexToHSL('#18181b'),
    darkSurface: hexToHSL('#25252f'),
    darkBorder: hexToHSL('#444452'),
    darkText: hexToHSL('#f8f8f2'),
    darkTextMuted: hexToHSL('#a6acaf'),
    // Semantic colors
    destructive: hexToHSL('#ff5555'),
    destructiveLight: hexToHSL('#ffe0e0'),
    success: hexToHSL('#50fa7b'),
    successLight: hexToHSL('#e0ffe0'),
    warning: hexToHSL('#ffb86c'),
    warningLight: hexToHSL('#ffe0cc'),
    info: hexToHSL('#8be9fd'),
    infoLight: hexToHSL('#e0f7ff'),
  },
  github: {
    // Light mode
    primary: hexToHSL('#0969da'),
    primaryLight: hexToHSL('#ddf4ff'),
    accent: hexToHSL('#fb8500'),
    accentLight: hexToHSL('#fff0e0'),
    background: hexToHSL('#ffffff'),
    surface: hexToHSL('#f6f8fa'),
    border: hexToHSL('#d0d7de'),
    text: hexToHSL('#24292f'),
    textMuted: hexToHSL('#57606a'),
    // Dark mode
    darkPrimary: hexToHSL('#58a6ff'),
    darkPrimaryLight: hexToHSL('#1f6feb'),
    darkAccent: hexToHSL('#fb8500'),
    darkAccentLight: hexToHSL('#d96e06'),
    darkBackground: hexToHSL('#0d1117'),
    darkSurface: hexToHSL('#161b22'),
    darkBorder: hexToHSL('#30363d'),
    darkText: hexToHSL('#c9d1d9'),
    darkTextMuted: hexToHSL('#8b949e'),
    // Semantic colors
    destructive: hexToHSL('#da3633'),
    destructiveLight: hexToHSL('#ffebe6'),
    success: hexToHSL('#1a7f34'),
    successLight: hexToHSL('#dafbe1'),
    warning: hexToHSL('#d4a574'),
    warningLight: hexToHSL('#fff8e6'),
    info: hexToHSL('#0969da'),
    infoLight: hexToHSL('#ddf4ff'),
  },
  material: {
    // Light mode
    primary: hexToHSL('#6200ee'),
    primaryLight: hexToHSL('#ede7f6'),
    accent: hexToHSL('#03dac6'),
    accentLight: hexToHSL('#e0f2f1'),
    background: hexToHSL('#ffffff'),
    surface: hexToHSL('#f5f5f5'),
    border: hexToHSL('#e0e0e0'),
    text: hexToHSL('#212121'),
    textMuted: hexToHSL('#757575'),
    // Dark mode
    darkPrimary: hexToHSL('#bb86fc'),
    darkPrimaryLight: hexToHSL('#6a1b9a'),
    darkAccent: hexToHSL('#03dac6'),
    darkAccentLight: hexToHSL('#018786'),
    darkBackground: hexToHSL('#121212'),
    darkSurface: hexToHSL('#1e1e1e'),
    darkBorder: hexToHSL('#302f31'),
    darkText: hexToHSL('#ffffff'),
    darkTextMuted: hexToHSL('#b3b3b3'),
    // Semantic colors
    destructive: hexToHSL('#cf6679'),
    destructiveLight: hexToHSL('#fce4ec'),
    success: hexToHSL('#4caf50'),
    successLight: hexToHSL('#e8f5e9'),
    warning: hexToHSL('#ff9800'),
    warningLight: hexToHSL('#fff3e0'),
    info: hexToHSL('#2196f3'),
    infoLight: hexToHSL('#e3f2fd'),
  },
  original: {
    // Light mode
    primary: hexToHSL('#3b82f6'),
    primaryLight: hexToHSL('#dbeafe'),
    accent: hexToHSL('#f59e42'),
    accentLight: hexToHSL('#fef3c7'),
    background: hexToHSL('#ffffff'),
    surface: hexToHSL('#f7f7fa'),
    border: hexToHSL('#e5e7eb'),
    text: hexToHSL('#1f2937'),
    textMuted: hexToHSL('#6b7280'),
    // Dark mode
    darkPrimary: hexToHSL('#2563eb'),
    darkPrimaryLight: hexToHSL('#1e40af'),
    darkAccent: hexToHSL('#f59e0b'),
    darkAccentLight: hexToHSL('#d97706'),
    darkBackground: hexToHSL('#0f172a'),
    darkSurface: hexToHSL('#1e293b'),
    darkBorder: hexToHSL('#334155'),
    darkText: hexToHSL('#f8fafc'),
    darkTextMuted: hexToHSL('#94a3b8'),
    // Semantic colors
    destructive: hexToHSL('#ef4444'),
    destructiveLight: hexToHSL('#fee2e2'),
    success: hexToHSL('#10b981'),
    successLight: hexToHSL('#d1fae5'),
    warning: hexToHSL('#f59e0b'),
    warningLight: hexToHSL('#fef3c7'),
    info: hexToHSL('#06b6d4'),
    infoLight: hexToHSL('#cffafe'),
  },
};

interface ColorThemeContextType {
  colorPalette: ColorPalette;
  setColorPalette: (palette: ColorPalette) => void;
  getCurrentColors: () => Record<string, string>;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(() => {
    const stored = localStorage.getItem('workos-color-palette');
    const validPalettes: ColorPalette[] = ['common', 'monokai', 'github', 'material', 'original'];
    return (validPalettes.includes(stored as ColorPalette) ? (stored as ColorPalette) : 'common');
  });

  const applyColors = () => {
    const colors = colorPalettes[colorPalette];
    if (!colors) return;
    
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    // Select colors based on theme
    const primaryColor = isDark ? colors.darkPrimary : colors.primary;
    const primaryLight = isDark ? colors.darkPrimaryLight : colors.primaryLight;
    const accentColor = isDark ? colors.darkAccent : colors.accent;
    const accentLight = isDark ? colors.darkAccentLight : colors.accentLight;
    const backgroundColor = isDark ? colors.darkBackground : colors.background;
    const surfaceColor = isDark ? colors.darkSurface : colors.surface;
    const borderColor = isDark ? colors.darkBorder : colors.border;
    const textColor = isDark ? colors.darkText : colors.text;
    const textMutedColor = isDark ? colors.darkTextMuted : colors.textMuted;
    
    // Apply all colors to CSS variables
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--primary-light', primaryLight);
    
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--accent-light', accentLight);
    
    root.style.setProperty('--background', backgroundColor);
    root.style.setProperty('--foreground', textColor);
    root.style.setProperty('--card', surfaceColor);
    root.style.setProperty('--card-foreground', textColor);
    root.style.setProperty('--popover', surfaceColor);
    root.style.setProperty('--popover-foreground', textColor);
    
    root.style.setProperty('--secondary', surfaceColor);
    root.style.setProperty('--secondary-foreground', textColor);
    
    root.style.setProperty('--muted', surfaceColor);
    root.style.setProperty('--muted-foreground', textMutedColor);
    
    root.style.setProperty('--border', borderColor);
    root.style.setProperty('--input', surfaceColor);
    root.style.setProperty('--ring', primaryColor);
    
    root.style.setProperty('--destructive', colors.destructive);
    root.style.setProperty('--destructive-foreground', '0 0% 100%');
    root.style.setProperty('--destructive-light', colors.destructiveLight);
    
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--success-light', colors.successLight);
    
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--warning-light', colors.warningLight);
    
    root.style.setProperty('--info', colors.info);
    root.style.setProperty('--info-light', colors.infoLight);
    
    // Sidebar colors - use background/surface colors for sidebar
    root.style.setProperty('--sidebar-background', backgroundColor);
    root.style.setProperty('--sidebar-foreground', textColor);
    root.style.setProperty('--sidebar-primary', primaryColor);
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-accent', accentColor);
    root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-border', borderColor);
    root.style.setProperty('--sidebar-ring', primaryColor);
  };

  // Apply colors on palette change
  useEffect(() => {
    applyColors();
    localStorage.setItem('workos-color-palette', colorPalette);
  }, [colorPalette]);

  // Watch for theme changes (light/dark mode toggle)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyColors();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, [colorPalette]);

  const setColorPalette = (palette: ColorPalette) => {
    setColorPaletteState(palette);
  };

  const getCurrentColors = () => colorPalettes[colorPalette];

  return (
    <ColorThemeContext.Provider value={{ colorPalette, setColorPalette, getCurrentColors }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (!context) throw new Error('useColorTheme must be used within ColorThemeProvider');
  return context;
}
