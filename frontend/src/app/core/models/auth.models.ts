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

/** Session stored in localStorage — extends sign-in response with loaded permissions. */
export interface CashierSession extends SignInResponse {
  /** Map of FunctName → IsAccess loaded from CashierPermission table on sign-in. */
  permissions: Record<string, boolean>;
}

export interface TerminalConfig {
  locationId: number;
  unitNo: number;
}
