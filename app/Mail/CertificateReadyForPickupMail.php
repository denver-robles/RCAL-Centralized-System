<?php

namespace App\Mail;

use App\Models\DocumentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CertificateReadyForPickupMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public DocumentRequest $documentRequest
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Certificate Ready for Pickup: Claim [{$this->documentRequest->tracking_code}] - RCAL PIMS",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.certificate-ready-for-pickup',
        );
    }
}