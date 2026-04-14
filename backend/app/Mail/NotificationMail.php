<?php

namespace App\Mail;

use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Notification $notification) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Place2Padel — '.$this->notification->title,
        );
    }

    public function content(): Content
    {
        // FRONTEND_URL + link = CTA du template. Fallback safe si link null.
        $ctaUrl = $this->notification->link
            ? rtrim(config('app.frontend_url', ''), '/').$this->notification->link
            : null;

        return new Content(
            view: 'emails.notification',
            with: [
                'title' => $this->notification->title,
                'body' => $this->notification->message,
                'ctaUrl' => $ctaUrl,
            ],
        );
    }
}
