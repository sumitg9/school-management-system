<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get all settings
     */
    public function index()
    {
        $settings = Setting::all();
        $keyValue = $settings->pluck('value', 'key')->toArray();

        return response()->json([
            'success' => true,
            'data' => $keyValue,
            'settings' => $settings,
        ]);
    }

    /**
     * Update settings (admin only)
     */
    public function update(Request $request)
    {
        $request->validate([
            'date_time_format' => 'nullable|string|max:100',
            'date_format' => 'nullable|string|max:100',
            'time_format' => 'nullable|string|max:100',
            'timezone' => 'nullable|string|max:100',
            'settings' => 'nullable|array',
        ]);

        // If 'settings' array passed:
        if ($request->has('settings') && is_array($request->settings)) {
            foreach ($request->settings as $key => $value) {
                Setting::set($key, (string)$value, 'localization');
            }
        }

        // Direct keys
        $directKeys = [
            'date_time_format',
            'date_format',
            'time_format',
            'timezone',
        ];

        foreach ($directKeys as $key) {
            if ($request->has($key)) {
                Setting::set($key, $request->input($key), 'localization');
            }
        }

        $allSettings = Setting::all();
        $keyValue = $allSettings->pluck('value', 'key')->toArray();

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'data' => $keyValue,
            'settings' => $allSettings,
        ]);
    }
}

