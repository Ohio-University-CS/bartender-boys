import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettings } from '@/contexts/settings';

// Prefer app Settings theme when set to light/dark; fall back to system when 'system'
export function useColorScheme(): 'light' | 'dark' | null {
		const rn = useRNColorScheme();
	const { theme } = useSettings();
		if (theme === 'system') return (rn ?? null);
	return theme; // 'light' | 'dark'
}
