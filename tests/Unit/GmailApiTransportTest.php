<?php

namespace Tests\Unit;

use App\Mail\Transport\GmailApiTransport;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class GmailApiTransportTest extends TestCase
{
    public function test_gmail_api_transport_exchanges_token_and_sends_encoded_email(): void
    {
        Cache::flush();

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'fake-access-token'], 200),
            'gmail.googleapis.com/gmail/v1/users/me/messages/send' => Http::response(['id' => 'msg-123'], 200),
        ]);

        $transport = new GmailApiTransport('client-id', 'client-secret', 'refresh-token');

        $email = (new Email)
            ->from('sender@gmail.com')
            ->to('parishioner@example.com')
            ->subject('Test Subject')
            ->text('Test body');

        $transport->send($email);

        Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/token'
            && $request['grant_type'] === 'refresh_token');

        Http::assertSent(fn ($request) => $request->url() === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
            && $request->hasHeader('Authorization', 'Bearer fake-access-token')
            && ! empty($request['raw']));
    }

    public function test_gmail_api_transport_throws_exception_when_credentials_missing(): void
    {
        $this->expectException(TransportException::class);

        $transport = new GmailApiTransport('', '', '');

        $email = (new Email)
            ->from('sender@gmail.com')
            ->to('parishioner@example.com')
            ->subject('Test Subject')
            ->text('Test body');

        $transport->send($email);
    }
}