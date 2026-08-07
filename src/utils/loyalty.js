import { LOYALTY } from '@/constants/app'

/**
 * Loyalty Program helpers.
 *
 * These functions centralize the display logic for the configurable loyalty
 * program so the reward engine and every UI surface render the same labels.
 * They accept the *normalized* settings object returned by
 * `getBenefitsSettings()` / `subscribeBenefitsSettings()`.
 */

/**
 * Return the accumulation unit used by the program (singular).
 * @param {Object} settings - normalized benefits settings
 * @returns {string} 'visita' | 'servicio'
 */
export function getAccumulationUnit(settings) {
  return settings?.accumulation === LOYALTY.ACCUMULATION.SERVICES ? 'servicio' : 'visita'
}

/**
 * Return the accumulation unit in plural form for generic text.
 * @param {Object} settings
 * @returns {string} 'visitas' | 'servicios'
 */
export function getAccumulationLabel(settings) {
  const unit = getAccumulationUnit(settings)
  return unit === 'servicio' ? 'servicios' : 'visitas'
}

/**
 * The condition (quantity) required to earn the reward.
 * @param {Object} settings
 * @returns {number}
 */
export function getCondition(settings) {
  return Number(settings?.condition ?? settings?.rewardEveryVisits ?? LOYALTY.DEFAULT_CONDITION)
}

/**
 * Human-friendly label of the configured reward.
 * @param {Object} settings
 * @returns {string} e.g. "20% de descuento", "Servicio gratuito", "Servicio de Barba gratis"
 */
export function getRewardLabel(settings) {
  const benefit = settings?.benefit ?? {}
  if (benefit.type === LOYALTY.BENEFIT.FREE_SERVICE) {
    if (benefit.freeServiceId && benefit.freeServiceId !== LOYALTY.FREE_SERVICE_ANY) {
      return benefit.freeServiceName
        ? `Servicio de ${benefit.freeServiceName} gratis`
        : 'Servicio gratuito'
    }
    return 'Servicio gratuito'
  }
  const pct = Number(benefit.discountPercent ?? LOYALTY.DEFAULT_DISCOUNT_PERCENT)
  return `${pct}% de descuento`
}

/**
 * Reward with proper article for use in sentences, e.g.
 * "un 20% de descuento", "un servicio gratuito", "un servicio de barba gratis".
 * @param {Object} settings
 * @returns {string}
 */
export function getRewardPhrase(settings) {
  const benefit = settings?.benefit ?? {}
  if (benefit.type === LOYALTY.BENEFIT.FREE_SERVICE) {
    if (benefit.freeServiceId && benefit.freeServiceId !== LOYALTY.FREE_SERVICE_ANY) {
      return benefit.freeServiceName
        ? `un servicio de ${benefit.freeServiceName.toLowerCase()} gratis`
        : 'un servicio gratuito'
    }
    return 'un servicio gratuito'
  }
  const pct = Number(benefit.discountPercent ?? LOYALTY.DEFAULT_DISCOUNT_PERCENT)
  return `un ${pct}% de descuento`
}

/**
 * One-line description of the whole program, e.g.
 * "Cada 8 visitas obtenés un 20% de descuento" or
 * "Cada 6 servicios obtenés un servicio gratuito".
 * @param {Object} settings
 * @returns {string}
 */
export function getProgramDescription(settings) {
  const condition = getCondition(settings)
  const unit = getAccumulationUnit(settings)
  const pluralUnit = unit === 'servicio' ? 'servicios' : 'visitas'
  return `Cada ${condition} ${pluralUnit} obtenés ${getRewardPhrase(settings)}`
}

/**
 * Current progress counter for a client (visits or services depending on the
 * configured accumulation mode).
 * @param {Object} settings
 * @param {Object} client - client/user document (or userProfile)
 * @returns {number}
 */
export function getClientProgressCount(settings, client) {
  if (settings?.accumulation === LOYALTY.ACCUMULATION.SERVICES) {
    return Number(client?.totalServices ?? client?.servicesCount ?? 0)
  }
  return Number(client?.totalVisits ?? 0)
}

/**
 * Compute reward status for a client: how close they are and whether a reward
 * is currently available.
 * @param {Object} settings
 * @param {Object} client - client/user document
 * @returns {{ counter: number, condition: number, remaining: number, progressPct: number, ready: boolean, availableCount: number }}
 */
export function getClientRewardStatus(settings, client) {
  const condition = getCondition(settings)
  const counter = getClientProgressCount(settings, client)
  const threshold = Number(client?.nextRewardAt ?? condition)
  const ready = counter > 0 && counter >= threshold
  const remaining = ready ? 0 : Math.max(threshold - counter, 0)
  const progressPct = Math.min(Math.round((counter / threshold) * 100), 100)
  const availableCount = getActiveRewardCount(settings, client)
  return { counter, condition, remaining, progressPct, ready, availableCount }
}

/**
 * Number of available rewards for the client, honoring the configured
 * expiration window (rewards become unavailable after the deadline).
 * @param {Object} settings
 * @param {Object} client - client/user document
 * @returns {number}
 */
export function getActiveRewardCount(settings, client) {
  const type = settings?.benefit?.type ?? LOYALTY.BENEFIT.DISCOUNT
  const count =
    type === LOYALTY.BENEFIT.FREE_SERVICE
      ? Number(client?.freeServiceRewards ?? 0)
      : Number(client?.freeServices ?? 0)
  if (count < 1) return 0
  if (isRewardsExpired(settings, client)) return 0
  return count
}

/**
 * Whether the client's available rewards have expired (validity enabled and
 * the deadline has passed).
 * @param {Object} settings
 * @param {Object} client
 * @returns {boolean}
 */
export function isRewardsExpired(settings, client) {
  if (!settings?.validity?.enabled) return false
  const expireAt = client?.rewardsExpireAt
  if (!expireAt) return false
  const time = expireAt.toDate
    ? expireAt.toDate().getTime()
    : expireAt.seconds
      ? expireAt.seconds * 1000
      : new Date(expireAt).getTime()
  if (Number.isNaN(time)) return false
  return Date.now() > time
}

/**
 * Expiry timestamp as a Date (if configured and set), null otherwise.
 * @param {Object} settings
 * @param {Object} client
 * @returns {Date|null}
 */
export function getRewardsExpiryDate(settings, client) {
  if (!settings?.validity?.enabled || !client?.rewardsExpireAt) return null
  const expireAt = client.rewardsExpireAt
  const date = expireAt.toDate ? expireAt.toDate() : expireAt.seconds ? new Date(expireAt.seconds * 1000) : new Date(expireAt)
  return Number.isNaN(date.getTime()) ? null : date
}
