<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * CertificateTemplateStoreRequest – validates data when creating a new template.
 *
 * VALIDATED FIELDS
 * ─────────────────────────────────────────────────────────
 * name        → A human-readable label, e.g. "Baptismal Certificate".
 * file        → The uploaded template file (DOCX, PDF, PNG, JPG, JPEG).
 *               Max size 10 MB to accommodate high-res backgrounds.
 * paper_size  → Either 'short' (short bond, 8.5 × 11) or 'a4'.
 * placeholders → Optional JSON array of manually added placeholder names
 *                (in addition to those auto-detected from the file).
 *
 * AUTHORIZATION
 * ─────────────────────────────────────────────────────────
 * Allowed only for users who canIssueCertificates() (admin, chancery, parish staff).
 */
class CertificateTemplateStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Delegates to the canIssueCertificates() check on the User model.
     */
    public function authorize(): bool
    {
        return $this->user()?->canIssueCertificates() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sacrament_type' => ['required', 'in:baptism,confirmation'],
            'name' => ['nullable', 'string', 'max:255'],
            'file' => ['nullable', 'file', 'mimes:docx,pdf,png,jpg,jpeg', 'max:10240'],
            'paper_size' => ['nullable', 'in:short,a4'],
            'placeholders' => ['nullable', 'array'],
            'placeholders.*' => ['string', 'max:100'],
        ];
    }

    /**
     * Custom validation messages for user-friendly feedback.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.mimes' => 'Only DOCX, PDF, PNG, and JPG files are accepted as certificate templates.',
            'file.max' => 'The template file must be 10 MB or smaller.',
        ];
    }
}
