<?php

namespace App\Policies;

use App\Models\CertificateTemplate;
use App\Models\User;

/**
 * CertificateTemplatePolicy – gate-keeper for the template CRUD.
 *
 * WHO CAN DO WHAT
 * ─────────────────────────────────────────────────────────
 * Admin / Chancery  → full CRUD across every parish
 * Parish Staff      → full CRUD scoped to own parish only
 * Everyone else     → view-only (preview), no create/edit/delete
 *
 * Parish scoping: non-archdiocese-wide users can only manage
 * templates that belong to their own home_parish_id.
 */
class CertificateTemplatePolicy
{
    /**
     * Can the user see the template list page?
     * Any authenticated staff member may browse templates.
     */
    public function viewAny(User $user): bool
    {
        return $user->isStaff();
    }

    /**
     * Can the user view / preview a single template?
     * Staff may preview any template within their parish scope.
     */
    public function view(User $user, CertificateTemplate $template): bool
    {
        return $user->isStaff() && $this->isWithinParishScope($user, $template);
    }

    /**
     * Can the user upload a new template?
     * Only admin, chancery, and parish staff.
     */
    public function create(User $user): bool
    {
        return $user->canIssueCertificates();
    }

    /**
     * Can the user edit an existing template?
     * Same roles as create, scoped to their parish.
     */
    public function update(User $user, CertificateTemplate $template): bool
    {
        return $user->canIssueCertificates() && $this->isWithinParishScope($user, $template);
    }

    /**
     * Can the user delete a template?
     * Same roles as update, scoped to their parish.
     */
    public function delete(User $user, CertificateTemplate $template): bool
    {
        return $user->canIssueCertificates() && $this->isWithinParishScope($user, $template);
    }

    /**
     * Can the user generate (populate + PDF) from a template?
     * Same as view – any staff within scope.
     */
    public function generate(User $user, CertificateTemplate $template): bool
    {
        return $user->canIssueCertificates() && $this->isWithinParishScope($user, $template);
    }

    /**
     * Check whether the template belongs to the user's parish.
     * Archdiocese-wide roles (admin, chancery) bypass this check.
     */
    private function isWithinParishScope(User $user, CertificateTemplate $template): bool
    {
        if ($user->isArchdioceseWide()) {
            return true;
        }

        return (int) $template->parish_id === (int) $user->home_parish_id;
    }
}
