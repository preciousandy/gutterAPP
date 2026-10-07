<?php

namespace App\Services\Kyc;

use App\Models\KycVerification;
use App\Models\User;

class KycService
{
    protected KycProviderInterface $provider;

    public function __construct()
    {
        $driver = env('KYC_PROVIDER', 'mock');

        $this->provider = match ($driver) {
            'prembly' => new PremblyKycProvider(),
            default => new MockKycProvider(),
        };
    }

    public function getProviderName(): string
    {
        return $this->provider->getName();
    }

    /**
     * Submit and verify an identity document.
     *
     * @return array{success: bool, message: string, verification?: KycVerification, error?: string}
     */
    public function processDocumentSubmission(User $user, string $type, string $number, ?string $documentImage = null): array
    {
        $cleanNumber = preg_replace('/[\s-]/', '', strtoupper(trim($number)));

        // Run verification via provider
        $result = $this->provider->verifyDocument($type, $cleanNumber, $user);

        if (!$result['success']) {
            return [
                'success' => false,
                'message' => $result['message'],
                'error' => $result['error'] ?? 'verification_failed',
            ];
        }

        // Record verification in database
        $idData = $result['data'] ?? [];
        if ($documentImage) {
            $idData['document_image'] = $documentImage;
        }

        $verification = $user->kycVerifications()->create([
            'document_type' => $type,
            'document_number' => $cleanNumber,
            'status' => 'id_verified',
            'provider' => $this->provider->getName(),
            'id_data' => $idData,
            'id_verified_at' => now(),
        ]);

        // Update user state to pending face check
        $user->update([
            'kyc_status' => 'pending',
        ]);

        return [
            'success' => true,
            'message' => $result['message'],
            'verification' => $verification,
            'next_step' => 'face_verification',
        ];
    }

    /**
     * Process face verification and finalize user KYC status.
     *
     * @return array{success: bool, message: string, user?: User, error?: string}
     */
    public function processFaceVerification(User $user, ?string $selfieData = null): array
    {
        $verification = $user->kycVerifications()
            ->whereIn('status', ['id_verified', 'pending'])
            ->latest()
            ->first();

        if (!$verification) {
            return [
                'success' => false,
                'message' => 'Please submit a valid identity document before performing face verification.',
                'error' => 'no_pending_document',
            ];
        }

        $result = $this->provider->verifyFace($user, $selfieData);

        if (!$result['success']) {
            if ($verification) {
                $verification->update([
                    'status' => 'rejected',
                    'rejection_reason' => $result['message'],
                ]);
            }
            return [
                'success' => false,
                'message' => $result['message'],
                'error' => $result['error'] ?? 'face_check_failed',
            ];
        }

        // Successfully verified!
        if ($verification) {
            $verification->update([
                'status' => 'verified',
                'face_data' => [
                    'confidence' => $result['confidence'] ?? 98.0,
                    'liveness_score' => $result['liveness_score'] ?? 99.0,
                    'has_selfie' => !empty($selfieData),
                ],
                'face_verified_at' => now(),
            ]);
        }

        // Upgrade user to verified & Tier 2!
        $user->update([
            'kyc_status' => 'verified',
            'tier' => max((int) ($user->tier ?? 1), 2),
        ]);

        // Automatically issue dedicated PalmPay NUBAN virtual account for verified user
        try {
            app(\App\Services\PalmPayService::class)->createVirtualAccount($user);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed creating PalmPay virtual account during KYC: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'message' => 'Identity and face verification successful. Your account is verified.',
            'user' => $user->fresh(),
        ];
    }
}
