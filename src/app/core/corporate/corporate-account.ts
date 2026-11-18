/** Corporate directory entry from Identity. `null` = not provided by the source/overlay. */
export interface CorporateAccount {
  readonly id: string;
  readonly code: string | null;
  readonly name: string;
  readonly nameTh: string | null;
  readonly initials: string;
  readonly contactEmail: string | null;
  readonly industry: string | null;
  /** CRM `business_type_other` (free text for "other"). Fields below are additive. */
  readonly industryOther?: string | null;
  readonly legalEntityType?: string | null;
  readonly legalEntityTypeOther?: string | null;
  /** Raw CRM `current_status` (e.g. ACTIVE). */
  readonly status?: string | null;
  /** `null` when missing or not plain text in the CRM (encrypted values are never shown). */
  readonly taxId?: string | null;
  readonly telephone?: string | null;
  readonly contactName?: string | null;
  readonly contactTelephone?: string | null;
  /** Preferred/only lot; `null` when the corporate has several lots and none is preferred. */
  readonly lotId: string | null;
  readonly lots?: readonly { readonly id: string; readonly name: string | null }[];
}
