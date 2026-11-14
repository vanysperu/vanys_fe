import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  Carrier,
  CatalogListParams,
  Driver,
  Guide,
  GuideListParams,
  GuidePrefill,
  GuideSummary,
  RegisterGuideDto,
  SaveDriverDto,
  SaveGuideDto,
  SaveVehicleDto,
  Vehicle,
} from '@/modules/dispatchGuides/types/dispatchGuide.types';

const unwrap = <T,>(body: ApiResponse<T>): T => {
  if (!body.success) throw body;
  return body.data;
};

// ---------------------------------------------------------------- guías
export async function getGuides(params: GuideListParams): Promise<PagedListResult<GuideSummary>> {
  return unwrap((await apiClient.get<ApiResponse<PagedListResult<GuideSummary>>>('/dispatch-guide/guides', { params })).data);
}

export async function getGuide(id: number): Promise<Guide> {
  return unwrap((await apiClient.get<ApiResponse<Guide>>(`/dispatch-guide/guides/${id}`)).data);
}

export async function getGuidePrefill(source: { quotationId?: number; transferId?: number }): Promise<GuidePrefill> {
  return unwrap((await apiClient.get<ApiResponse<GuidePrefill>>('/dispatch-guide/prefill', { params: source })).data);
}

export async function createGuide(dto: SaveGuideDto): Promise<Guide> {
  return unwrap((await apiClient.post<ApiResponse<Guide>>('/dispatch-guide/guides', dto)).data);
}

export async function updateGuide({ id, dto }: { id: number; dto: SaveGuideDto }): Promise<Guide> {
  return unwrap((await apiClient.put<ApiResponse<Guide>>(`/dispatch-guide/guides/${id}`, dto)).data);
}

// Registrar la guía emitida en SUNAT: multipart, así el PDF va en el mismo paso.
export async function registerGuide({ id, dto }: { id: number; dto: RegisterGuideDto }): Promise<Guide> {
  const formData = new FormData();
  formData.append('series', dto.series);
  formData.append('number', String(dto.number));
  if (dto.issue_date) formData.append('issue_date', dto.issue_date);
  if (dto.file) formData.append('file', dto.file);
  return unwrap((await apiClient.post<ApiResponse<Guide>>(`/dispatch-guide/guides/${id}/register`, formData)).data);
}

export async function uploadGuidePdf({ id, file }: { id: number; file: File }): Promise<Guide> {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap((await apiClient.post<ApiResponse<Guide>>(`/dispatch-guide/guides/${id}/file`, formData)).data);
}

// El PDF es privado: se descarga con la sesión y se abre desde la memoria del navegador.
export async function getGuidePdf(id: number): Promise<Blob> {
  return (await apiClient.get<Blob>(`/dispatch-guide/guides/${id}/file`, { responseType: 'blob' })).data;
}

export async function discardGuide(id: number): Promise<Guide> {
  return unwrap((await apiClient.post<ApiResponse<Guide>>(`/dispatch-guide/guides/${id}/discard`)).data);
}

export async function voidGuide({ id, reason }: { id: number; reason: string }): Promise<Guide> {
  return unwrap((await apiClient.post<ApiResponse<Guide>>(`/dispatch-guide/guides/${id}/void`, { reason })).data);
}

// ------------------------------------------------------------- catálogos
export async function getCarriers(params: { searchTerm?: string; companyId?: number }): Promise<PagedListResult<Carrier>> {
  return unwrap((await apiClient.get<ApiResponse<PagedListResult<Carrier>>>('/dispatch-guide/carriers', { params: { page: 1, limit: 100, ...params } })).data);
}

export async function getVehicles(params: CatalogListParams): Promise<PagedListResult<Vehicle>> {
  return unwrap((await apiClient.get<ApiResponse<PagedListResult<Vehicle>>>('/dispatch-guide/vehicles', { params })).data);
}

export async function createVehicle(dto: SaveVehicleDto): Promise<Vehicle> {
  return unwrap((await apiClient.post<ApiResponse<Vehicle>>('/dispatch-guide/vehicles', dto)).data);
}

export async function updateVehicle({ id, dto }: { id: number; dto: SaveVehicleDto }): Promise<Vehicle> {
  return unwrap((await apiClient.put<ApiResponse<Vehicle>>(`/dispatch-guide/vehicles/${id}`, dto)).data);
}

export async function toggleVehicleStatus(id: number): Promise<Vehicle> {
  return unwrap((await apiClient.put<ApiResponse<Vehicle>>(`/dispatch-guide/vehicles/${id}/disable`)).data);
}

export async function getDrivers(params: CatalogListParams): Promise<PagedListResult<Driver>> {
  return unwrap((await apiClient.get<ApiResponse<PagedListResult<Driver>>>('/dispatch-guide/drivers', { params })).data);
}

export async function createDriver(dto: SaveDriverDto): Promise<Driver> {
  return unwrap((await apiClient.post<ApiResponse<Driver>>('/dispatch-guide/drivers', dto)).data);
}

export async function updateDriver({ id, dto }: { id: number; dto: SaveDriverDto }): Promise<Driver> {
  return unwrap((await apiClient.put<ApiResponse<Driver>>(`/dispatch-guide/drivers/${id}`, dto)).data);
}

export async function toggleDriverStatus(id: number): Promise<Driver> {
  return unwrap((await apiClient.put<ApiResponse<Driver>>(`/dispatch-guide/drivers/${id}/disable`)).data);
}
