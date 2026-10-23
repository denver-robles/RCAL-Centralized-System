<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Stripe\StripeClient;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;

class StripeIdentityController extends Controller
{
    protected mixed $stripe = null;

    public function __construct()
    {
        if (class_exists(StripeClient::class) && config('services.stripe.secret')) {
            $this->stripe = new StripeClient(config('services.stripe.secret'));
        }
    }

    /**
     * Show verification onboarding step
     */
    public function onboarding(Request $request)
    {
        $user = $request->user();

        // If already verified, go directly to portal dashboard
        if ($user->identity_status === 'verified') {
            return redirect()->route('portal.dashboard')->with('success', 'Your identity is already verified.');
        }

        return Inertia::render('Auth/VerifyIdentity', [
            'status' => $user->identity_status ?? 'unverified',
        ]);
    }

    /**
     * Create a Stripe VerificationSession
     */
    public function createSession(Request $request)
    {
        $user = $request->user();

        $secret = config('services.stripe.secret');
        if (empty($secret) || str_starts_with($secret, 'sk_test_...')) {
            return response()->json([
                'error' => 'Stripe Secret Key is not configured yet. Please update STRIPE_SECRET in your .env file with your valid Stripe secret key.',
            ], 422);
        }

        if (!class_exists(StripeClient::class) || !$this->stripe) {
            return response()->json([
                'error' => 'Stripe SDK is not installed. Please run composer require stripe/stripe-php.',
            ], 422);
        }

        try {
            $session = $this->stripe->identity->verificationSessions->create([
                'type' => 'document',
                'metadata' => [
                    'user_id' => $user->id,
                ],
                'options' => [
                    'document' => [
                        'require_matching_selfie' => true, // optional selfie match
                    ],
                ],
                'return_url' => route('identity.status'),
            ]);

            $user->update([
                'stripe_verification_session_id' => $session->id,
                'identity_status' => 'pending',
            ]);

            return response()->json([
                'url' => $session->url,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Failed to initialize verification: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display status page after returning from Stripe
     */
    public function status(Request $request)
    {
        $user = $request->user();

        // If user is pending and we have a session ID, actively check Stripe in case webhook is delayed
        if ($this->stripe && $user->stripe_verification_session_id && $user->identity_status !== 'verified') {
            try {
                $session = $this->stripe->identity->verificationSessions->retrieve(
                    $user->stripe_verification_session_id
                );

                if ($session->status === 'verified') {
                    $user->update([
                        'identity_status' => 'verified',
                        'id_verified_at' => now(),
                    ]);
                } elseif ($session->status === 'requires_input') {
                    $user->update([
                        'identity_status' => 'requires_input',
                    ]);
                }
            } catch (\Throwable $e) {
                // Stripe API retrieve failed; fallback to existing db status
            }
        }

        return Inertia::render('Auth/IdentityStatus', [
            'status' => $user->fresh()->identity_status ?? 'unverified',
        ]);
    }

    /**
     * Handle Stripe asynchronous webhooks
     */
    public function handleWebhook(Request $request)
    {
        if (!class_exists(Webhook::class)) {
            return response()->json(['error' => 'Invalid signature or payload'], 400);
        }

        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $endpointSecret = config('services.stripe.webhook_secret');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\UnexpectedValueException | SignatureVerificationException $e) {
            return response()->json(['error' => 'Invalid signature or payload'], 400);
        }

        switch ($event->type) {
            case 'identity.verification_session.verified':
                $session = $event->data->object;
                $userId = $session->metadata->user_id ?? null;

                if ($userId) {
                    $user = User::find($userId);
                    if ($user) {
                        $user->update([
                            'identity_status' => 'verified',
                            'id_verified_at' => now(),
                        ]);
                    }
                }
                break;

            case 'identity.verification_session.requires_input':
                $session = $event->data->object;
                $userId = $session->metadata->user_id ?? null;

                if ($userId) {
                    User::where('id', $userId)->update([
                        'identity_status' => 'requires_input',
                    ]);
                }
                break;
        }

        return response()->json(['status' => 'success']);
    }
}