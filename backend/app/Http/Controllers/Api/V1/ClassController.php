<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    /**
     * Display a listing of classes
     */
    public function index(Request $request)
    {
        $query = ClassModel::with(['sections']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $query->ordered();

        $perPage = $request->get('per_page', 50);

        if ($perPage === 'all') {
            $classes = $query->get();
            return response()->json([
                'success' => true,
                'data' => $classes,
            ]);
        }

        $classes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $classes->items(),
            'meta' => [
                'current_page' => $classes->currentPage(),
                'total_pages' => $classes->lastPage(),
                'per_page' => $classes->perPage(),
                'total' => $classes->total(),
            ],
        ]);
    }

    /**
     * Store a newly created class
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'numeric_name' => 'nullable|string|max:10',
            'order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $class = ClassModel::create([
            'name' => $request->name,
            'numeric_name' => $request->numeric_name,
            'order' => $request->order ?? 0,
            'description' => $request->description,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Class created successfully',
            'data' => $class,
        ], 201);
    }

    /**
     * Display the specified class
     */
    public function show($id)
    {
        $class = ClassModel::with(['sections', 'subjects', 'students'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $class,
        ]);
    }

    /**
     * Update the specified class
     */
    public function update(Request $request, $id)
    {
        $class = ClassModel::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'numeric_name' => 'sometimes|nullable|string|max:10',
            'order' => 'sometimes|nullable|integer',
            'status' => 'sometimes|required|in:active,inactive',
        ]);

        $class->update($request->only([
            'name',
            'numeric_name',
            'order',
            'description',
            'status',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Class updated successfully',
            'data' => $class,
        ]);
    }

    /**
     * Remove the specified class
     */
    public function destroy($id)
    {
        $class = ClassModel::findOrFail($id);
        $class->delete();

        return response()->json([
            'success' => true,
            'message' => 'Class deleted successfully',
        ]);
    }

    /**
     * Assign subjects to class
     */
    public function assignSubjects(Request $request, $id)
    {
        $class = ClassModel::findOrFail($id);

        $request->validate([
            'subjects' => 'required|array',
            'subjects.*.subject_id' => 'required|exists:subjects,id',
            'subjects.*.is_elective' => 'nullable|boolean',
            'subjects.*.total_marks' => 'nullable|integer',
            'subjects.*.passing_marks' => 'nullable|integer',
        ]);

        $syncData = [];
        foreach ($request->subjects as $subject) {
            $syncData[$subject['subject_id']] = [
                'is_elective' => $subject['is_elective'] ?? false,
                'total_marks' => $subject['total_marks'] ?? null,
                'passing_marks' => $subject['passing_marks'] ?? null,
            ];
        }

        $class->subjects()->sync($syncData);

        return response()->json([
            'success' => true,
            'message' => 'Subjects assigned successfully',
            'data' => $class->load('subjects'),
        ]);
    }
}

