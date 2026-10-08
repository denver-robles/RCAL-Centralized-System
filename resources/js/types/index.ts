export type Role = 'admin' | 'chancery' | 'parish_staff' | 'clergy' | 'viewer' | 'parishioner';

export type SacramentType = 'baptism' | 'confirmation' | 'marriage' | 'death';

export type RequestStatus =
    | 'pending'
    | 'verified'
    | 'approved'
    | 'awaiting_payment'
    | 'processing'
    | 'ready'
    | 'out_for_delivery'
    | 'issued'
    | 'rejected'
    | 'cancelled';

export type DocumentRequestStatus =
    | 'submitted'
    | 'under_review'
    | 'record_not_found'
    | 'processing'
    | 'ready'
    | 'out_for_delivery'
    | 'completed'
    | 'rejected'
    | 'cancelled';

export type ScheduleStatus = 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export type ScheduleType =
    | 'baptism'
    | 'confirmation'
    | 'wedding'
    | 'funeral'
    | 'blessing'
    | 'eucharist'
    | 'anointing'
    | 'reconciliation'
    | 'meeting'
    | 'office_activity'
    | 'other';

export interface User {
    id: number;
    username: string;
    email: string;
    display_name: string;
    role: Role;
    role_label: string;
    is_staff: boolean;
    is_parishioner: boolean;
    is_archdiocese_wide: boolean;
    can_issue_certificates: boolean;
    home_parish_id: number | null;
    home_parish_name?: string | null;
}

export interface Vicariate {
    id: number;
    name: string;
    description?: string | null;
}

export interface Parish {
    id: number;
    name: string;
    patron_saint?: string | null;
    feast_day?: string | null;
    vicariate_id: number;
    vicariate?: Vicariate;
    address?: string | null;
    municipality?: string | null;
    city_municipality?: string | null;
    contact_number?: string | null;
    phone?: string | null;
    email?: string | null;
    established_year?: number | null;
    is_active: boolean;
}

export interface Clergy {
    id: number;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    title: string;
    sex: string;
    full_name: string;
    titled_name: string;
    ordination_date?: string | null;
    status: string;
    is_active: boolean;
}

export interface Person {
    id: number;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    sex: 'male' | 'female';
    full_name: string;
    sort_name: string;
    date_of_birth?: string | null;
    date_of_death?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    parent_names?: string;
}

export interface CanonicalAnnotation {
    id: number;
    record_id: number;
    annotation_type: string;
    note_text: string;
    event_date?: string | null;
    decree_reference?: string | null;
    reference_record_id?: number | null;
    annotated_by_user_id?: number | null;
    annotated_at?: string | null;
    created_at: string;
    annotated_by_user?: {
        id: number;
        username: string;
        display_name: string;
    };
}

export interface SacramentalRecord {
    id: number;
    person_id: number;
    person: Person;
    spouse_person_id?: number | null;
    spouse?: Person | null;
    sacrament_type: SacramentType;
    event_date: string;
    book_number: number;
    page_number: number;
    entry_number: number;
    citation: string;
    originating_parish_id: number;
    originating_parish?: Parish;
    performed_by_clergy_id?: number | null;
    performed_by_clergy?: Clergy | null;
    legitimacy?: string | null;
    godparents?: string | null;
    witnesses?: string | null;
    place_of_event?: string | null;
    register_notes?: string | null;
    status: 'registered' | 'annotated' | 'voided';
    created_at: string;
    annotations?: CanonicalAnnotation[];
}

export interface CertificateRequest {
    id: number;
    record_id: number;
    record?: SacramentalRecord;
    requester_user_id?: number | null;
    requester_name: string;
    requester_contact?: string | null;
    purpose?: string | null;
    status: RequestStatus;
    certificate_number?: string | null;
    verification_token?: string | null;
    verified_by_user_id?: number | null;
    verified_at?: string | null;
    approved_by_user_id?: number | null;
    approved_at?: string | null;
    issued_by_user_id?: number | null;
    issued_at?: string | null;
    rejected_by_user_id?: number | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    created_at: string;
}

export interface DocumentRequest {
    id: number;
    tracking_code: string;
    parishioner_id: number;
    targeted_parish_id?: number | null;
    targeted_parish?: Parish | null;
    sacrament_type: SacramentType;
    name_on_record: string;
    date_of_birth: string;
    date_of_sacrament?: string | null;
    place_of_sacrament?: string | null;
    parents_or_spouse?: string | null;
    relationship_to_owner?: string | null;
    purpose?: string | null;
    status: DocumentRequestStatus;
    matched_record_id?: number | null;
    matched_record?: SacramentalRecord | null;
    certificate_request_id?: number | null;
    certificate_request?: CertificateRequest | null;
    id_document_path?: string | null;
    consent_given_at?: string | null;
    verification_hash?: string | null;
    rejection_reason?: string | null;
    cancellation_reason?: string | null;
    internal_note?: string | null;
    issued_at?: string | null;
    created_at: string;
}

export interface Venue {
    id: number;
    parish_id: number;
    name: string;
    capacity?: number | null;
    description?: string | null;
    is_active: boolean;
}

export interface SacramentSchedule {
    id: number;
    parish_id: number;
    parish?: Parish;
    venue_id?: number | null;
    venue?: Venue | null;
    presiding_clergy_id?: number | null;
    presiding_clergy?: Clergy | null;
    requester_user_id?: number | null;
    sacrament_type: ScheduleType;
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    status: ScheduleStatus;
    requester_name?: string | null;
    requester_contact?: string | null;
    expected_attendees?: number | null;
    record_id?: number | null;
    cancellation_reason?: string | null;
    notes?: string | null;
    created_at: string;
}

export interface AuditLog {
    id: number;
    user_id?: number | null;
    actor_username?: string | null;
    action: string;
    subject_type?: string | null;
    subject_id?: number | null;
    subject_label?: string | null;
    old_values?: Record<string, unknown> | null;
    new_values?: Record<string, unknown> | null;
    ip_address?: string | null;
    request_path?: string | null;
    request_method?: string | null;
    note?: string | null;
    created_at: string;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
        warning?: string | null;
    };
    curia: {
        name: string;
        operating_hours: string;
        current_date: string;
    };
};
