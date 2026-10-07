<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KycSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_image_is_strictly_required_for_kyc_submission(): void
    {
        $user = User::factory()->create([
            'kyc_status' => 'unverified',
        ]);

        // Attempt submission without document_image
        $response = $this->actingAs($user)->postJson('/api/v1/kyc/submit', [
            'document_type' => 'nin',
            'document_number' => '12345678901',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['document_image'])
            ->assertJsonPath('errors.document_image.0', 'Please upload a photo or document copy of your identity card.');
    }

    public function test_document_submission_succeeds_with_image_provided(): void
    {
        $user = User::factory()->create([
            'kyc_status' => 'unverified',
        ]);

        $response = $this->actingAs($user)->postJson('/api/v1/kyc/submit', [
            'document_type' => 'nin',
            'document_number' => '12345678901',
            'document_image' => 'file:///data/user/0/host.exp.exponent/cache/document.jpg',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'id_verified')
            ->assertJsonPath('next_step', 'face_verification');

        $this->assertDatabaseHas('kyc_verifications', [
            'user_id' => $user->id,
            'document_type' => 'nin',
            'status' => 'id_verified',
        ]);
    }
}
