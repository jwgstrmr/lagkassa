import { QueryCache, QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export const queryClient = new QueryClient({
  // Annars står sidan kvar med laddningsskelett utan att man förstår varför
  queryCache: new QueryCache({
    onError: (error) => {
      console.error(error)
      toast.error('Kunde inte hämta data – försök igen om en stund', { id: 'query-error' })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('not authenticated')) return false
        return failureCount < 2
      },
      // Föräldrar öppnar appen igen för att se om inbetalningen kommit in – läs om gammal data då
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})
