<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class AcademicYearController extends Controller
{
    /**
     * Display a listing of academic years
     */
    public function index(Request $request)
    {
        $query = AcademicYear::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $query->orderBy('start_date', 'desc');

        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all' && !$request->filled('status')) {
            $academicYears = Cache::remember('academic_years_all', 600, function() {
                return AcademicYear::orderBy('start_date', 'desc')->get();
            });
            return response()->json([
                'success' => true,
                'data' => $academicYears,
            ]);
        }

        if ($perPage === 'all') {
            $academicYears = $query->get();
            return response()->json([
                'success' => true,
                'data' => $academicYears,
            ]);
        }

        $academicYears = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $academicYears->items(),
            'meta' => [
                'current_page' => $academicYears->currentPage(),
                'total_pages' => $academicYears->lastPage(),
                'per_page' => $academicYears->perPage(),
                'total' => $academicYears->total(),
            ],
        ]);
    }

    /**
     * Store a newly created academic year
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'description' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // If this is set as current, unset other current academic years
            if ($request->is_current) {
                AcademicYear::where('is_current', true)->update(['is_current' => false]);
            }

            $academicYear = AcademicYear::create([
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'is_current' => $request->is_current ?? false,
                'status' => 'active',
                'description' => $request->description,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Academic year created successfully',
                'data' => $academicYear,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified academic year
     */
    public function show($id)
    {
        $academicYear = AcademicYear::with(['students', 'exams', 'feeStructures'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $academicYear,
        ]);
    }

    /**
     * Update the specified academic year
     */
    public function update(Request $request, $id)
    {
        $academicYear = AcademicYear::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after:start_date',
            'status' => 'sometimes|required|in:active,inactive,completed',
            'is_current' => 'sometimes|boolean',
        ]);

        DB::beginTransaction();
        try {
            // If setting as current, unset other current academic years
            if ($request->has('is_current') && $request->is_current) {
                AcademicYear::where('id', '!=', $id)
                    ->where('is_current', true)
                    ->update(['is_current' => false]);
            }

            $academicYear->update($request->only([
                'name',
                'start_date',
                'end_date',
                'is_current',
                'status',
                'description',
            ]));

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Academic year updated successfully',
                'data' => $academicYear,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified academic year
     */
    public function destroy($id)
    {
        $academicYear = AcademicYear::findOrFail($id);

        if ($academicYear->is_current) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete current academic year',
            ], 400);
        }

        $academicYear->delete();

        return response()->json([
            'success' => true,
            'message' => 'Academic year deleted successfully',
        ]);
    }

    /**
     * Get current academic year
     */
    public function getCurrent()
    {
        $academicYear = Cache::remember('academic_year_current', 600, function() {
            return AcademicYear::where('is_current', true)->first();
        });

        if (!$academicYear) {
            return response()->json([
                'success' => false,
                'message' => 'No current academic year set',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $academicYear,
        ]);
    }

    /**
     * Set academic year as current
     */
    public function setCurrent($id)
    {
        DB::beginTransaction();
        try {
            AcademicYear::where('is_current', true)->update(['is_current' => false]);

            $academicYear = AcademicYear::findOrFail($id);
            $academicYear->update(['is_current' => true]);

            Cache::forget('academic_year_current');
            Cache::forget('academic_years_all');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Academic year set as current successfully',
                'data' => $academicYear,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to set current academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

