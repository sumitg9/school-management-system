<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Setting;
use Tests\TestCase;

class SettingTest extends TestCase
{
    /**
     * Test getting settings.
     */
    public function test_can_get_settings(): void
    {
        $response = $this->getJson('/api/v1/settings');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'date_time_format',
                    'date_format',
                    'time_format',
                    'timezone',
                ],
            ]);
    }

    /**
     * Test admin can update settings.
     */
    public function test_admin_can_update_settings(): void
    {
        $admin = User::where('email', 'admin@school.com')->first();
        if (!$admin) {
            $admin = User::factory()->create();
            $admin->assignRole('admin');
        }

        $response = $this->actingAs($admin, 'sanctum')->putJson('/api/v1/settings', [
            'date_time_format' => 'DD-MM-YYYY HH:mm:ss',
            'date_format' => 'DD-MM-YYYY',
            'time_format' => 'HH:mm:ss',
            'timezone' => 'Asia/Kolkata',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Settings updated successfully',
            ]);

        $this->assertEquals('DD-MM-YYYY HH:mm:ss', Setting::get('date_time_format'));
    }
}

