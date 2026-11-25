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
        $sacrament = $this->schedule->sacrament_type?->label() ?? 'Sacrament';
        $parishEmail = $this->schedule->parish?->email;

        return new Envelope(
            subject: "Sacrament Ceremony Confirmed: {$sacrament} - RCAL PIMS",
            replyTo: $parishEmail ? [$parishEmail] : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.schedule-booking-confirmed',
        );
    }
}