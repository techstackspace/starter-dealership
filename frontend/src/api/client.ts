import type { ApiClient, CreateInquiryInput, CreateVehicleInput, UpdateVehicleInput, Vehicle } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ErrorResponse = { error?: string }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ErrorResponse | null
    throw new ApiError(response.status, body?.error ?? response.statusText)
  }

  return response.json() as Promise<T>
}

export const liveClient: ApiClient = {
  async getVehicles() {
    const result = await request<{ vehicles: Vehicle[] }>('/vehicles')
    return result.vehicles
  },

  async getVehicleById(id) {
    try {
      const result = await request<{ vehicle: Vehicle }>(`/vehicles/${encodeURIComponent(id)}`)
      return result.vehicle
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined
      throw error
    }
  },

  createVehicle(vehicle: CreateVehicleInput) {
    return request<{ id: string; createdAt: string }>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    })
  },

  async updateVehicle(id: string, changes: UpdateVehicleInput) {
    const result = await request<{ vehicle: Vehicle }>(`/vehicles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    })
    return result.vehicle
  },

  async deleteVehicle(id: string) {
    const result = await request<{ success: boolean }>(`/vehicles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return result.success
  },

  uploadVehiclePhoto(vehicleId: string, file: File) {
    const form = new FormData()
    form.append('vehicleId', vehicleId)
    form.append('file', file)
    return request<{ url: string; vehicleId: string }>('/upload', {
      method: 'POST',
      body: form,
    })
  },

  createInquiry(inquiry: CreateInquiryInput) {
    return request<{ id: string; emailConfigured: boolean; emailSent: boolean }>('/inquiries', {
      method: 'POST',
      body: JSON.stringify(inquiry),
    })
  },
}