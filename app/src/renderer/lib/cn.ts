import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une clases y resuelve conflictos de Tailwind (la última gana). */
export const cn = (...c: ClassValue[]) => twMerge(clsx(c))
