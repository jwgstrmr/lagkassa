import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`
}

export function initials(name: string | null | undefined): string {
  return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}
