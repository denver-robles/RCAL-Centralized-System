<?php

namespace App\Mail;

use App\Models\SacramentSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CashPaymentReceiptMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public SacramentSchedule $schedule
    ) {}

    public function envelope(): Envelope
    {
        $orNum = $this->schedule->payment_reference ?: "REC-{$this->schedule->id}";
        return new Envelope(
            subject: "Official Cash Payment Receipt [{$orNum}] - RCAL PIMS",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cash-payment-receipt',
        );
    }
}