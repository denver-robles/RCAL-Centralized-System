<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class EnrollFaceReferenceCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'face:enroll {identifier : Email or username of the user} {image_path : Path to the reference photo (JPG/PNG)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Enroll a reference facial image for a user for Face++ biometric authentication';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $identifier = $this->argument('identifier');
        $imagePath = $this->argument('image_path');

        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (!$user) {
            $this->error("User not found for identifier: {$identifier}");
            return Command::FAILURE;
        }

        if (!file_exists($imagePath)) {
            $this->error("Image file does not exist at: {$imagePath}");
            return Command::FAILURE;
        }

        $imageContents = file_get_contents($imagePath);
        if ($imageContents === false) {
            $this->error("Failed to read image file.");
            return Command::FAILURE;
        }

        $base64 = base64_encode($imageContents);

        $user->update([
            'face_reference_image' => $base64,
        ]);

        $this->info("✓ Face reference photo successfully enrolled for {$user->display_name} ({$user->username} / {$user->email}).");
        return Command::SUCCESS;
    }
}
