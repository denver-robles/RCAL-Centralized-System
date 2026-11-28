<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

class GmailApiTransport extends AbstractTransport
{
    public function __construct(
        protected string $clientId,
        protected string $clientSecret,
        protected string $refreshToken,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->clientId === '' || $this->clientSecret === '' || $this->refreshToken === '') {
            throw new TransportException('Gmail API OAuth credentials are not configured.');
        }

        $accessToken = $this->getAccessToken();

        // Gmail API requires URL-safe Base64 of the raw RFC 2822 MIME message
        $rawMime = $message->getMessage()->toString();
        $encodedMessage = rtrim(strtr(base64_encode($rawMime), '+/', '-_'), '=');

        $response = Http::withToken($accessToken)
            ->timeout(15)
            ->post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', [
                'raw' => $encodedMessage,
            ]);

        if ($response->failed()) {
            // If token was unexpectedly revoked/expired, clear cache once and report error
            if ($response->status() === 401) {
                Cache::forget($this->cacheKey());
            }

            throw new TransportException(
                'Gmail API send failed (HTTP '.$response->status().'): '.$response->body()
            );
        }
    }

    protected function getAccessToken(): string
    {
        return Cache::remember($this->cacheKey(), now()->addMinutes(50), function () {
            $response = Http::asForm()
                ->timeout(15)
                ->post('https://oauth2.googleapis.com/token', [
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'refresh_token' => $this->refreshToken,
                    'grant_type' => 'refresh_token',
                ]);

            if ($response->failed() || empty($response->json('access_token'))) {
                throw new TransportException(
                    'Failed to refresh Gmail API access token: '.$response->body()
                );
            }

            return (string) $response->json('access_token');
        });
    }

    protected function cacheKey(): string
    {
        return 'gmail_api_access_token_'.md5($this->clientId.$this->refreshToken);
    }

    public function __toString(): string
    {
        return 'gmail-api';
    }
}