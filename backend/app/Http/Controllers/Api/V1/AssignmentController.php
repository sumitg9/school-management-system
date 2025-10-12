<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssignmentController extends Controller
{
    /**
     * Display a listing of assignments
     */
    public function index(Request $request)
    {
        $query = Assignment::with(['class', 'section', 'subject', 'teacher']);

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $query->orderBy('due_date', 'desc');

        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all') {
            $assignments = $query->get();
            return response()->json([
                'success' => true,
                'data' => $assignments,
            ]);
        }

        $assignments = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $assignments->items(),
            'meta' => [
                'current_page' => $assignments->currentPage(),
                'total_pages' => $assignments->lastPage(),
                'per_page' => $assignments->perPage(),
                'total' => $assignments->total(),
            ],
        ]);
    }

    /**
     * Store a newly created assignment
     */
    public function store(Request $request)
    {
        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'required|exists:teachers,id',
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'assigned_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:assigned_date',
            'total_marks' => 'nullable|integer|min:0',
            'attachment' => 'nullable|string',
        ]);

        $assignment = Assignment::create([
            'class_id' => $request->class_id,
            'section_id' => $request->section_id,
            'subject_id' => $request->subject_id,
            'teacher_id' => $request->teacher_id,
            'title' => $request->title,
            'description' => $request->description,
            'assigned_date' => $request->assigned_date,
            'due_date' => $request->due_date,
            'total_marks' => $request->total_marks ?? 100,
            'attachment' => $request->attachment,
            'status' => 'active',
        ]);

        $assignment->load(['class', 'section', 'subject', 'teacher']);

        return response()->json([
            'success' => true,
            'message' => 'Assignment created successfully',
            'data' => $assignment,
        ], 201);
    }

    /**
     * Display the specified assignment
     */
    public function show($id)
    {
        $assignment = Assignment::with([
            'class',
            'section',
            'subject',
            'teacher',
            'submissions.student'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $assignment,
        ]);
    }

    /**
     * Update the specified assignment
     */
    public function update(Request $request, $id)
    {
        $assignment = Assignment::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'description' => 'nullable|string',
            'due_date' => 'sometimes|required|date',
            'total_marks' => 'sometimes|nullable|integer|min:0',
            'status' => 'sometimes|required|in:active,completed,cancelled',
        ]);

        $assignment->update($request->only([
            'title',
            'description',
            'due_date',
            'total_marks',
            'attachment',
            'status',
        ]));

        $assignment->load(['class', 'section', 'subject', 'teacher']);

        return response()->json([
            'success' => true,
            'message' => 'Assignment updated successfully',
            'data' => $assignment,
        ]);
    }

    /**
     * Remove the specified assignment
     */
    public function destroy($id)
    {
        $assignment = Assignment::findOrFail($id);
        $assignment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Assignment deleted successfully',
        ]);
    }

    /**
     * Submit assignment
     */
    public function submit(Request $request, $id)
    {
        $assignment = Assignment::findOrFail($id);

        $request->validate([
            'student_id' => 'required|exists:students,id',
            'submission_text' => 'nullable|string',
            'attachment' => 'nullable|string',
        ]);

        $submission = AssignmentSubmission::updateOrCreate(
            [
                'assignment_id' => $id,
                'student_id' => $request->student_id,
            ],
            [
                'submission_text' => $request->submission_text,
                'attachment' => $request->attachment,
                'submitted_at' => now(),
                'status' => now() > $assignment->due_date ? 'late' : 'submitted',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Assignment submitted successfully',
            'data' => $submission,
        ]);
    }

    /**
     * Grade assignment submission
     */
    public function gradeSubmission(Request $request, $submissionId)
    {
        $submission = AssignmentSubmission::findOrFail($submissionId);

        $request->validate([
            'marks_obtained' => 'required|numeric|min:0',
            'feedback' => 'nullable|string',
        ]);

        $submission->update([
            'marks_obtained' => $request->marks_obtained,
            'feedback' => $request->feedback,
            'graded_at' => now(),
            'graded_by' => auth()->id(),
            'status' => 'graded',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assignment graded successfully',
            'data' => $submission,
        ]);
    }

    /**
     * Get submissions for an assignment
     */
    public function getSubmissions($id)
    {
        $assignment = Assignment::findOrFail($id);

        $submissions = AssignmentSubmission::where('assignment_id', $id)
            ->with(['student'])
            ->get();

        $stats = [
            'total_students' => $assignment->section->current_strength,
            'submitted' => $submissions->whereIn('status', ['submitted', 'graded', 'late'])->count(),
            'pending' => $submissions->where('status', 'pending')->count(),
            'graded' => $submissions->where('status', 'graded')->count(),
            'late' => $submissions->where('status', 'late')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'submissions' => $submissions,
                'statistics' => $stats,
            ],
        ]);
    }

    /**
     * Get student's assignments
     */
    public function getStudentAssignments($studentId)
    {
        $student = \App\Models\Student::findOrFail($studentId);

        $assignments = Assignment::where('class_id', $student->class_id)
            ->where('section_id', $student->section_id)
            ->with(['subject', 'teacher'])
            ->orderBy('due_date', 'desc')
            ->get();

        $submissions = AssignmentSubmission::where('student_id', $studentId)
            ->get()
            ->keyBy('assignment_id');

        $result = $assignments->map(function ($assignment) use ($submissions) {
            $submission = $submissions->get($assignment->id);
            return [
                'assignment' => $assignment,
                'submission' => $submission,
                'is_submitted' => $submission && in_array($submission->status, ['submitted', 'graded', 'late']),
                'is_overdue' => !$submission && $assignment->due_date < now(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}

