import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  redeemDiscount,
  redeemReward,
  subscribeBenefitsHistory,
  subscribeLastBenefitsEvent,
  subscribeLoyaltyStats,
} from '@/services/benefits/benefitsService'
import { subscribeBenefitsSettings, updateBenefitsSettings } from '@/services/settings/settingsService'
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
 * Mutation: save the configurable loyalty program settings.
 */
export function useUpdateBenefitsSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateBenefitsSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'settings'] })
    },
  })
}

/**
 * Fetch aggregate loyalty reward stats for the admin panel in real time.
 */
export function useLoyaltyStats() {
  return useQuery({
    queryKey: [BENEFITS_KEY, 'stats'],
    queryFn: createRealtimeQuery(subscribeLoyaltyStats),
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
 * Mutation: redeem a reward (discount or free service) for a client.
 */
export function useRedeemReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, adminUid, type }) => redeemReward(clientId, adminUid, type),
    onSuccess: (result, { clientId }) => {
      if (result?.success) {
        qc.invalidateQueries({ queryKey: ['clients'] })
        qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'history', clientId] })
        qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'lastEvent', clientId] })
        qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'stats'] })
      }
    },
  })
}

/**
 * Mutation: redeem a discount reward for a client (backward-compatible helper).
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
        qc.invalidateQueries({ queryKey: [BENEFITS_KEY, 'stats'] })
      }
    },
  })
}
