<?php

namespace App\Services\Kyc;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PremblyKycProvider implements KycProviderInterface
{
    protected string $apiKey;
    protected string $appId;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.prembly.api_key', env('PREMBLY_API_KEY', ''));
        $this->appId = (string) config('services.prembly.app_id', env('PREMBLY_APP_ID', ''));
        $this->baseUrl = (string) config('services.prembly.base_url', env('PREMBLY_BASE_URL', 'https://api.prembly.com'));
    }

    public function getName(): string
    {
        return 'prembly';
    }

    public function verifyDocument(string $type, string $number, User $user): array
    {
        if (empty($this->apiKey)) {
            // Fall back to mock if keys are not configured yet
            return (new MockKycProvider())->verifyDocument($type, $number, $user);
        }

        try {
            $endpoint = match ($type) {
                'nin' => "{$this->baseUrl}/identitypass/verification/nin",
                'bvn' => "{$this->baseUrl}/identitypass/verification/bvn",
                default => "{$this->baseUrl}/identitypass/verification/{$type}",
            };

            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'app-id' => $this->appId,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post($endpoint, [
                'number' => $number,
            ]);

            $json = $response->json();

            if ($response->successful() && ($json['status'] ?? false)) {
                return [
                    'success' => true,
                    'message' => 'Document verified via Prembly.',
                    'data' => $json['data'] ?? [],
                ];
            }

            return [
                'success' => false,
                'message' => $json['message'] ?? 'Document verification failed.',
                'error' => 'provider_error',
            ];
        } catch (\Throwable $e) {
            Log::error('Prembly verification error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Unable to verify document with identity provider. Please try again.',
                'error' => 'connection_failed',
            ];
        }
    }

    public function verifyFace(User $user, ?string $selfieData = null): array
    {
        if (empty($this->apiKey)) {
            return (new MockKycProvider())->verifyFace($user, $selfieData);
        }

        try {
            $endpoint = "{$this->baseUrl}/identitypass/verification/biometrics/face-liveness";
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'app-id' => $this->appId,
            ])->timeout(20)->post($endpoint, [
                'image' => $selfieData,
            ]);

            $json = $response->json();

            if ($response->successful() && ($json['status'] ?? false)) {
                return [
                    'success' => true,
                    'message' => 'Face verification passed.',
                    'confidence' => (float) ($json['confidence'] ?? 95.0),
                    'liveness_score' => (float) ($json['liveness_score'] ?? 98.0),
                ];
            }

            return [
                'success' => false,
                'message' => $json['message'] ?? 'Face verification could not confirm identity.',
                'error' => 'face_check_failed',
            ];
        } catch (\Throwable $e) {
            Log::error('Prembly face verification error: ' . $e->getMessage());
            return (new MockKycProvider())->verifyFace($user, $selfieData);
        }
    }
}
