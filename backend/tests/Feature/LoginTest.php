<?php

namespace Tests\Feature;

use Tests\TestCase;

class LoginTest extends TestCase
{
    public function test_login_with_demo_admin(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@school.com',
            'password' => 'password',
        ]);

        $response->dump();
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
    }
}

