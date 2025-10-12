<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    /**
     * Display a listing of subjects
     */
    public function index(Request $request)
    {
        $query = Subject::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $perPage = $request->get('per_page', 50);

        if ($perPage === 'all') {
            $subjects = $query->get();
            return response()->json([
                'success' => true,
                'data' => $subjects,
            ]);
        }

        $subjects = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $subjects->items(),
            'meta' => [
                'current_page' => $subjects->currentPage(),
                'total_pages' => $subjects->lastPage(),
                'per_page' => $subjects->perPage(),
                'total' => $subjects->total(),
            ],
        ]);
    }

    /**
     * Store a newly created subject
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:subjects,code',
            'type' => 'required|in:theory,practical,both',
            'total_marks' => 'nullable|integer|min:0',
            'passing_marks' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
        ]);

        $subject = Subject::create([
            'name' => $request->name,
            'code' => $request->code,
            'type' => $request->type,
            'total_marks' => $request->total_marks ?? 100,
            'passing_marks' => $request->passing_marks ?? 40,
            'description' => $request->description,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject created successfully',
            'data' => $subject,
        ], 201);
    }

    /**
     * Display the specified subject
     */
    public function show($id)
    {
        $subject = Subject::with(['classes'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $subject,
        ]);
    }

    /**
     * Update the specified subject
     */
    public function update(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'sometimes|required|string|max:20|unique:subjects,code,' . $id,
            'type' => 'sometimes|required|in:theory,practical,both',
            'status' => 'sometimes|required|in:active,inactive',
        ]);

        $subject->update($request->only([
            'name',
            'code',
            'type',
            'total_marks',
            'passing_marks',
            'description',
            'status',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Subject updated successfully',
            'data' => $subject,
        ]);
    }

    /**
     * Remove the specified subject
     */
    public function destroy($id)
    {
        $subject = Subject::findOrFail($id);
        $subject->delete();

        return response()->json([
            'success' => true,
            'message' => 'Subject deleted successfully',
        ]);
    }
}

