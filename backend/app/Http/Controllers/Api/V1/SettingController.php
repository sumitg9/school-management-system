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
            'school_name' => 'nullable|string|max:255',
            'school_logo' => 'nullable|string',
            'school_tagline' => 'nullable|string|max:255',
            'school_email' => 'nullable|string|max:255',
            'school_phone' => 'nullable|string|max:50',
            'school_address' => 'nullable|string|max:500',
            'school_affiliation' => 'nullable|string|max:255',
            'school_website' => 'nullable|string|max:255',
            'date_time_format' => 'nullable|string|max:100',
            'date_format' => 'nullable|string|max:100',
            'time_format' => 'nullable|string|max:100',
            'timezone' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:20',
            'currency_symbol' => 'nullable|string|max:10',
            'student_min_age_years' => 'nullable|numeric|min:0',
            'student_min_age_months' => 'nullable|numeric|min:0|max:11',
            'teacher_min_age_years' => 'nullable|numeric|min:15',
            'staff_min_age_years' => 'nullable|numeric|min:15',
            'class_age_criteria' => 'nullable',
            'fee_late_fine_enabled' => 'nullable',
            'fee_late_fine_type' => 'nullable|string|max:50',
            'fee_late_fine_amount' => 'nullable|numeric|min:0',
            'fee_due_day_of_month' => 'nullable|integer|min:1|max:31',
            'fee_grace_period_days' => 'nullable|integer|min:0|max:60',
            'fee_late_fine_max_cap' => 'nullable|numeric|min:0',
            'user_role_permissions' => 'nullable',
            'settings' => 'nullable|array',
        ]);

        $payload = $request->except(['_token', '_method']);

        // If 'settings' array passed:
        if (isset($payload['settings']) && is_array($payload['settings'])) {
            foreach ($payload['settings'] as $key => $value) {
                $valStr = is_array($value) ? json_encode($value) : (string)$value;
                Setting::set($key, $valStr, 'general');
            }
            unset($payload['settings']);
        }

        foreach ($payload as $key => $value) {
            $group = str_starts_with($key, 'school_')
                ? 'school_info'
                : (in_array($key, ['date_time_format', 'date_format', 'time_format', 'timezone', 'currency', 'currency_symbol'])
                    ? 'localization'
                    : (str_starts_with($key, 'fee_') ? 'fees' : 'age_criteria'));
            $valStr = (is_array($value) || is_object($value)) ? json_encode($value) : (string)$value;
            Setting::set($key, $valStr, $group);
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

