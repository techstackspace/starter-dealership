import { liveClient } from './client'
import type { ApiClient, Vehicle, VehicleStatus } from './types'

export type { ApiClient, Vehicle, VehicleStatus }
export const api: ApiClient = liveClient
export default api
