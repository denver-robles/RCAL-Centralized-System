<?php

namespace App\Http\Controllers;

use App\Models\ScheduleAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ScheduleAttachmentController extends Controller
{
    /**
     * Stream the uploaded schedule attachment inline in the browser.
     * Bypasses web server symlink permission issues and prevents 403 Forbidden errors.
     */
    public function view(Request $request, ScheduleAttachment $attachment): BinaryFileResponse
    {
        $this->authorizeAccess($request, $attachment);

        if (! Storage::disk('public')->exists($attachment->file_path)) {
            abort(404, 'The requested document file could not be found in storage.');
        }

        $fullPath = Storage::disk('public')->path($attachment->file_path);
        $mimeType = Storage::disk('public')->mimeType($attachment->file_path) ?: 'application/octet-stream';

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="'.basename($attachment->file_path).'"',
        ]);
    }

    /**
     * Download the schedule attachment.
     */
    public function download(Request $request, ScheduleAttachment $attachment): StreamedResponse
    {
        $this->authorizeAccess($request, $attachment);

        if (! Storage::disk('public')->exists($attachment->file_path)) {
            abort(404, 'The requested document file could not be found in storage.');
        }

        return Storage::disk('public')->download($attachment->file_path);
    }

    /**
     * Authorize user access to the sacrament schedule attachment.
     */
    protected function authorizeAccess(Request $request, ScheduleAttachment $attachment): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $schedule = $attachment->schedule;
        if (! $schedule) {
            abort(404, 'Associated sacrament appointment not found.');
        }

        $isOwner = $schedule->requester_user_id === $user->id;
        $isStaff = $user->isStaff();

        if ($isStaff) {
            // Parish staff can only view attachments for their home parish unless archdiocese-wide
            if (! $user->isArchdioceseWide() && $user->home_parish_id && $schedule->parish_id !== $user->home_parish_id) {
                abort(403, 'Unauthorized access to documents from another parish.');
            }

            return;
        }

        if (! $isOwner) {
            abort(403, 'Unauthorized access. You may only view your own submitted documents.');
        }
    }
}
