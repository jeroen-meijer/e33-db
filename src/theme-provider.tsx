import type { PropsWithChildren } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }: PropsWithChildren<Record<string, unknown>>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
