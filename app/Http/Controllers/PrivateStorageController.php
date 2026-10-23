<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\SacramentSchedule;
use App\Models\ScheduleAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PrivateStorageController extends Controller
{
    /**
     * Serve an uploaded government ID document through authorization gate.
     */
    public function downloadIdDocument(Request $request, DocumentRequest $documentRequest): Response
    {
        $user = $request->user();

        $isOwner = $user && (int) $user->id === (int) $documentRequest->parishioner_id;
        $isChancery = $user && $user->isArchdioceseWide();
        $isParishStaff = $user && $user->isStaff() && (int) $user->home_parish_id === (int) $documentRequest->targeted_parish_id;

        if (!$isOwner && !$isChancery && !$isParishStaff) {
            abort(403, 'Unauthorized access to confidential government ID document.');
        }

        $path = $documentRequest->id_document_path;
        if (!$path) {
            abort(404, 'No ID document is attached to this request.');
        }

        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path);
        }

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->response($path);
        }

        abort(404, 'File not found in storage archive.');
    }

    /**
     * Serve an uploaded payment receipt through authorization gate.
     */
    public function downloadScheduleReceipt(Request $request, SacramentSchedule $schedule): Response
    {
        $user = $request->user();

        $isOwner = $user && (int) $user->id === (int) $schedule->requester_user_id;
        $isChancery = $user && $user->isArchdioceseWide();
        $isParishStaff = $user && $user->isStaff() && (int) $user->home_parish_id === (int) $schedule->parish_id;

        if (!$isOwner && !$isChancery && !$isParishStaff) {
            abort(403, 'Unauthorized access to payment transaction receipt.');
        }

        $path = $schedule->payment_receipt_path;
        if (!$path) {
            abort(404, 'No payment receipt was uploaded for this schedule.');
        }

        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path);
        }

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->response($path);
        }

        abort(404, 'Receipt file not found.');
    }

    /**
     * Serve a schedule attachment through authorization gate.
     */
    public function downloadScheduleAttachment(Request $request, ScheduleAttachment $attachment): Response
    {
        $user = $request->user();
        $schedule = $attachment->sacramentSchedule;

        $isOwner = $user && $schedule && (int) $user->id === (int) $schedule->requester_user_id;
        $isChancery = $user && $user->isArchdioceseWide();
        $isParishStaff = $user && $schedule && $user->isStaff() && (int) $user->home_parish_id === (int) $schedule->parish_id;

        if (!$isOwner && !$isChancery && !$isParishStaff) {
            abort(403, 'Unauthorized access to sacrament request attachment.');
        }

        $path = $attachment->file_path;
        if (!$path) {
            abort(404, 'File not found.');
        }

        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path);
        }

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->response($path);
        }

        abort(404, 'Attachment file not found.');
    }
}
