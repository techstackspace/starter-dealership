export type VehicleStatus = 'Available' | 'Pending' | 'Low Stock'

export type SupportedCurrency = 'USD' | 'NGN' | 'EUR' | 'GBP' | 'AED' | 'ZAR' | 'CAD' | 'JPY'

export type Vehicle = {
  id: string
  vin: string
  year: string
  make: string
  model: string
  trim: string
  price: number
  mileage: number
  status: VehicleStatus
  description: string
  category: string
  fuel: string
  location: string
  image: string
  deal: string
  currency: SupportedCurrency
}

export type CreateVehicleInput = Omit<Vehicle, 'id' | 'vin' | 'year'> & {
  year: number
  vin?: string
  currency?: SupportedCurrency
}

export type UpdateVehicleInput = Partial<Omit<Vehicle, 'id' | 'year'>> & {
  year?: number
  vin?: string
  currency?: SupportedCurrency
}

export type CreateInquiryInput = {
  name: string
  email: string
  formSource: 'contact' | 'inventory'
  inquiryType: 'sales' | 'financing' | 'test-drive'
  vehicle: string
  preferredDate: string | null
  message: string
}

export interface ApiClient {
  getVehicles(): Promise<Vehicle[]>
  getVehicleById(id: string): Promise<Vehicle | undefined>
  createVehicle(vehicle: CreateVehicleInput): Promise<{ id: string; createdAt: string }>
  updateVehicle(id: string, changes: UpdateVehicleInput): Promise<Vehicle>
  deleteVehicle(id: string): Promise<boolean>
  uploadVehiclePhoto(vehicleId: string, file: File): Promise<{ url: string; vehicleId: string }>
  createInquiry(inquiry: CreateInquiryInput): Promise<{ id: string; emailConfigured: boolean; emailSent: boolean }>
}