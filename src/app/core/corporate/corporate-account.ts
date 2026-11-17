/** Corporate directory entry from Identity. `null` = not provided by the source/overlay. */
export interface CorporateAccount {
  readonly id: string;
  readonly code: string | null;
  readonly name: string;
  readonly nameTh: string | null;
  readonly initials: string;
  readonly contactEmail: string | null;
  readonly industry: string | null;
  /** Preferred/only lot; `null` when the corporate has several lots and none is preferred. */
  readonly lotId: string | null;
  readonly lots?: readonly { readonly id: string; readonly name: string | null }[];
}
