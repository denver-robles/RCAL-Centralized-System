<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'facepp' => [
        'key' => env('FACEPP_API_KEY'),
        'secret' => env('FACEPP_API_SECRET'),
        'verify_ssl' => env('FACEPP_VERIFY_SSL', true),
    ],

    'ocr' => [
        'key' => env('OCR_SPACE_API_KEY', 'helloworld'),
        'verify_ssl' => env('OCR_VERIFY_SSL', env('FACEPP_VERIFY_SSL', true)),
    ],

    'carbone' => [
        'key' => env('CARBONE_API_KEY'),
        'url' => env('CARBONE_API_URL', 'https://api.carbone.io'),
        'version' => env('CARBONE_VERSION', '5'),
        'verify_ssl' => env('CARBONE_VERIFY_SSL', false),
        'timeout' => (int) env('CARBONE_TIMEOUT', 180),
        'templates' => [
            'baptism' => env('CARBONE_TEMPLATE_BAPTISM', 'd547719481923332bc94b54e13585118a2a9a00d7d96f574c30a4307297d9742'),
            'confirmation' => env('CARBONE_TEMPLATE_CONFIRMATION'),
        ],
    ],

];
