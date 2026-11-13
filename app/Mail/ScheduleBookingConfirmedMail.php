<?php

namespace App\Mail;

use App\Models\SacramentSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ScheduleBookingConfirmedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public SacramentSchedule $schedule
    ) {}

    public function envelope(): Envelope
    {
        $sacrament = ucfirst($this->schedule->sacrament_type?->value ?? (string) $this->schedule->sacrament_type);
        return new Envelope(
            subject: "Sacrament Ceremony Confirmed: {$sacrament} - RCAL PIMS",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.schedule-booking-confirmed',
        );
    }
}