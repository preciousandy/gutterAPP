<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\AppControl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminWebTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_screen_renders_successfully(): void
    {
        $response = $this->get('/admin/login');
        $response->assertStatus(200);
        $response->assertSee('Sign in to Administrative Console');
    }

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $admin = AdminUser::firstOrCreate(
            ['email' => 'admin@gutter.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('Admin@123456'),
                'role' => 'super_admin',
                'status' => 'active',
            ]
        );

        $response = $this->post('/admin/login', [
            'email' => 'admin@gutter.com',
            'password' => 'Admin@123456',
        ]);

        $response->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin, 'admin');
    }

    public function test_authenticated_admin_can_view_dashboard(): void
    {
        $admin = AdminUser::firstOrCreate(
            ['email' => 'admin@gutter.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('Admin@123456'),
                'role' => 'super_admin',
                'status' => 'active',
            ]
        );

        $response = $this->actingAs($admin, 'admin')->get('/admin');
        $response->assertStatus(200);
        $response->assertSee('Executive Financial Overview');
        $response->assertSee('User Account Governance', false);
        $response->assertSee('Active Users');
        $response->assertSee('Frozen Users');
        $response->assertSee('Suspended / Blocked');
        $response->assertSee('Financial Rails Breakdown');
    }

    public function test_super_admin_can_toggle_mobile_feature_switch(): void
    {
        $admin = AdminUser::firstOrCreate(
            ['email' => 'admin@gutter.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('Admin@123456'),
                'role' => 'super_admin',
                'status' => 'active',
            ]
        );

        $response = $this->actingAs($admin, 'admin')
            ->postJson('/admin/app-controls/feature_airtime/toggle');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'is_enabled' => false,
        ]);

        $this->assertFalse(AppControl::where('key', 'feature_airtime')->first()->is_enabled);
    }

    public function test_admin_menu_shows_notification_count(): void
    {
        $admin = AdminUser::firstOrCreate(
            ['email' => 'admin@gutter.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('Admin@123456'),
                'role' => 'super_admin',
                'status' => 'active',
            ]
        );

        // Seed 1 pending KYC user and 1 open complaint
        \App\Models\User::factory()->create(['kyc_status' => 'pending']);
        \App\Models\Complaint::create([
            'ticket_id' => 'TKT-TEST-999',
            'category' => 'transaction_issue',
            'message' => 'Pending resolution',
            'status' => 'open',
        ]);

        $response = $this->actingAs($admin, 'admin')->get('/admin');

        $response->assertStatus(200);
        $response->assertSee('Notifications');
        $response->assertSee('2 Action Items');
        $response->assertSee('2 New');
        $response->assertSee('2 Alerts');
    }
}
