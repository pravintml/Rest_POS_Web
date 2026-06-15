export interface SignInRequest {
  password: string;
  locationId: number;
  unitNo: number;
  useEncode: boolean;
}

export interface SignInResponse {
  token: string;
  cashierId: number;
  name: string;
  code: string;
  type: number;
  locationId: number;
  unitNo: number;
}

export type CashierSession = SignInResponse;

export interface TerminalConfig {
  locationId: number;
  unitNo: number;
}
