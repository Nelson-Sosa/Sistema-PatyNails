import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBenefitsHistory,
  getLastBenefitsEvent,
  redeemDiscount,
  subscribeBenefitsHistory,
  subscribeLastBenefitsEvent,
} from '@/services/benefits/benefitsService'
import { subscribeBenefitsSettings } from '@/services/settings/settingsService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

const BENEFITS_KEY = 'benefits'

/**
 * Fetch the salon's benefits program settings in real time.
 */
export function useBenefitsSettings() {
  return useQuery({
    queryKey: [BENEFITS_KEY, 'settings'],
    queryFn: createRealtimeQuery(subscribeBenefitsSettings),
    refetchOnMount: 'always',
  })
}

/**
 * Fetch benefits/reward history for a specific client in real time.
 * Updates instantly when a visit is completed or a reward is redeemed.
 * @param {string} clientId
 */
export function useBenefitsHistory(clientId) {
  return useQuery({
    queryKey: [BENEFITS_KEY, 'history', clientId],
    queryFn: createRealtimeQuery((onNext, onError) =>
      subscribeBenefitsHistory(clientId, onNext, onError)
    ),
    enabled: !!clientId,
    refetchOnMount: 'always',
  })
}

/**
 * Fetch the most recent benefits event for a client in real time.
 * @param {string} clientId
 */
export function useLastBenefitsEvent(clientId) {
  return useQuery({
    queryKey: [BENEFITS_KEY, 'lastEvent', clientId],
    queryFn: createRealtimeQuery((onNext, onError) =>
      subscribeLastBenefitsEvent(clientId, onNext, onError)
    ),
    enabled: !!clientId,
    refetchOnMount: 'always',
  })
}

/**
 * Mutation: redeem a 20% discount for a client.
 */
export function useRedeemDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, adminUid }) => redeemDiscount(clientId, adminUid),
    onSuccess: (result, { clientId }) => {
      if (result?.success) {
        qc.invalidateQueries({ queryKey: ['clients'] })
        qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'history', clientId] })
        qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'lastEvent', clientId] })
      }
    },
  })
}
