import { ContractStatus } from './enums';
import { CustomerScoring } from './customer.model';
import { Page } from './page.model';

export interface ContractOfferTarifa {
  nombre?: string | null;
  tipo?: string | null;
  energiaP1?: number | null;
  energiaP2?: number | null;
  energiaP3?: number | null;
  energiaP4?: number | null;
  energiaP5?: number | null;
  energiaP6?: number | null;
  potenciaP1?: number | null;
  potenciaP2?: number | null;
  potenciaP3?: number | null;
  potenciaP4?: number | null;
  potenciaP5?: number | null;
  potenciaP6?: number | null;
}

export interface ContractOffer {
  nombreProducto?: string;
  tipoOferta?: 'FIJO' | 'INDEXADO' | 'PASS_POOL';
  /** keys: "2.0TD", "3.0TD", "6.1TD" */
  tarifas?: Record<string, ContractOfferTarifa>;
}

export interface ContractSuministro {
  id: string;
  cups: string;
  tipo: string | null;
  tarifa: string | null;
  provincia: string | null;
}

export interface Contract {
  id: string;
  idExterno: string | null;
  estado: ContractStatus;
  fechaEstado: string | null;
  fechaCreacion: string | null;
  fechaInicio: string | null;
  fechaFinPrevista: string | null;
  fechaFinReal: string | null;
  campana: string | null;
  servicio: string | null;
  descuento: number | null;
  clienteId: string;
  clienteNombre: string;
  clienteNif: string | null;
  clienteDelegacion: string | null;
  suministroId: string | null;
  cups: string | null;
  suministroTipo: string | null;
  suministroTarifa: string | null;
  provincia: string | null;
  margenBruto: number | null;
  margenNeto: number | null;
  motivoRechazo: string | null;
  feedbackBaja: string | null;
  validado: boolean;
  tienePenalizacion: boolean;
  montoLiquidacion: number | null;
  consumoTotal: number | null;
  scoring?: CustomerScoring | null;
  createdAt: string;
  updatedAt: string;
  ofertas?: ContractOffer[] | null;
  contratoVinculadoId?: string | null;
  suministros?: ContractSuministro[] | null;
}

export interface ContractFilter {
  status?: ContractStatus;
  q?: string;
  startDate?: string;
  endDate?: string;
  motivoRechazo?: string;
}

export interface SuministroPayload {
  id?: string;
  cups?: string;
  tipo?: 'E' | 'G';
  tarifa?: string;
  compra?: boolean;
  consumoContrato?: number | null;
  consumoUltimos12Meses?: number | null;
  direccion?: string | null;
  codigoPostal?: string | null;
  ineProvincia?: string | null;
  provincia?: string | null;
  inePoblacion?: string | null;
  poblacion?: string | null;
  dirFacturacion?: string | null;
  cpFacturacion?: string | null;
  ineProvFacturacion?: string | null;
  provFacturacion?: string | null;
  inePobFacturacion?: string | null;
  pobFacturacion?: string | null;
  potenciaP1?: number | null;
  potenciaP2?: number | null;
  potenciaP3?: number | null;
  potenciaP4?: number | null;
  potenciaP5?: number | null;
  potenciaP6?: number | null;
}

export interface ContractPayload {
  clienteId: string;
  suministros?: SuministroPayload[];
  campana?: string | null;
  servicio?: string | null;
  pagoFacturas?: string | null;
  tipoEnvioFactura?: string | null;
  importeEnvioFactura?: number | null;
  descuento?: number | null;
  observacionesFactura?: string | null;
  fechaCreacion?: string | null;
  mesesPrevisto?: number | null;
  fechaInicio?: string | null;
  fechaFinPrevista?: string | null;
  fechaFinReal?: string | null;
  fechaRenovacion?: string | null;
  estado?: ContractStatus | null;
  fechaEstado?: string | null;
  motivoRechazo?: string | null;
  margenBruto?: number | null;
  margenNeto?: number | null;
  margenCobros?: number | null;
  margenCliente?: number | null;
  margenAgenteAnual?: number | null;
  margenAgenteKwh?: number | null;
  categoriaAgente?: string | null;
  formaPagoAgente?: string | null;
  margenBeneficio?: number | null;
  margenOperacion?: number | null;
  ofertas?: ContractOffer[];
}

export interface ContractRenovaciones {
  vencidos: Page<Contract>;
  porVencer: Page<Contract>;
  renovados: Page<Contract>;
}

export interface ChangeContractStatusPayload {
  estado: ContractStatus;
  fechaEstado?: string | null;
  motivoRechazo?: string | null;
}
