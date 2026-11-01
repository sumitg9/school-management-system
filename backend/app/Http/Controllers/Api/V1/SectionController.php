<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SectionController extends Controller
{
    /**
     * Display a listing of sections
     */
    public function index(Request $request)
    {
        $query = Section::with(['class']);

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->get('per_page', 50);

        if ($perPage === 'all') {
            $classId = $request->get('class_id', 'all');
            $status = $request->get('status', 'all');
            $cacheKey = "sections_list_{$classId}_{$status}";

            $sections = Cache::remember($cacheKey, 600, function() use ($query) {
                return $query->get();
            });

            return response()->json([
                'success' => true,
                'data' => $sections,
            ]);
        }

        $sections = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $sections->items(),
            'meta' => [
                'current_page' => $sections->currentPage(),
                'total_pages' => $sections->lastPage(),
                'per_page' => $sections->perPage(),
                'total' => $sections->total(),
            ],
        ]);
    }

    /**
     * Store a newly created section
     */
    public function store(Request $request)
    {
        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'name' => 'required|string|max:50',
            'capacity' => 'nullable|integer|min:1',
            'description' => 'nullable|string',
        ]);

        $section = Section::create([
            'class_id' => $request->class_id,
            'name' => $request->name,
            'capacity' => $request->capacity ?? 40,
            'current_strength' => 0,
            'description' => $request->description,
            'status' => 'active',
        ]);

        $section->load('class');

        return response()->json([
            'success' => true,
            'message' => 'Section created successfully',
            'data' => $section,
        ], 201);
    }

    /**
     * Display the specified section
     */
    public function show($id)
    {
        $section = Section::with(['class', 'students'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $section,
        ]);
    }

    /**
     * Update the specified section
     */
    public function update(Request $request, $id)
    {
        $section = Section::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:50',
            'capacity' => 'sometimes|nullable|integer|min:1',
            'status' => 'sometimes|required|in:active,inactive',
        ]);

        $section->update($request->only([
            'name',
            'capacity',
            'description',
            'status',
        ]));

        $section->load('class');

        return response()->json([
            'success' => true,
            'message' => 'Section updated successfully',
            'data' => $section,
        ]);
    }

    /**
     * Remove the specified section
     */
    public function destroy($id)
    {
        $section = Section::findOrFail($id);
        $section->delete();

        return response()->json([
            'success' => true,
            'message' => 'Section deleted successfully',
        ]);
    }
}

