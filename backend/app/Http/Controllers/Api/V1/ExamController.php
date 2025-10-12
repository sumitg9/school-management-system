<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamController extends Controller
{
    /**
     * Display a listing of exams
     */
    public function index(Request $request)
    {
        $query = Exam::with(['academicYear']);

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $query->orderBy('start_date', 'desc');

        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all') {
            $exams = $query->get();
            return response()->json([
                'success' => true,
                'data' => $exams,
            ]);
        }

        $exams = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $exams->items(),
            'meta' => [
                'current_page' => $exams->currentPage(),
                'total_pages' => $exams->lastPage(),
                'per_page' => $exams->perPage(),
                'total' => $exams->total(),
            ],
        ]);
    }

    /**
     * Store a newly created exam
     */
    public function store(Request $request)
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:exams,code',
            'type' => 'required|in:mid-term,final,quarterly,unit-test,other',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'description' => 'nullable|string',
        ]);

        $exam = Exam::create([
            'academic_year_id' => $request->academic_year_id,
            'name' => $request->name,
            'code' => $request->code,
            'type' => $request->type,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'description' => $request->description,
            'publish_results' => false,
            'status' => 'scheduled',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exam created successfully',
            'data' => $exam,
        ], 201);
    }

    /**
     * Display the specified exam
     */
    public function show($id)
    {
        $exam = Exam::with(['academicYear', 'schedules.class', 'schedules.subject'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $exam,
        ]);
    }

    /**
     * Update the specified exam
     */
    public function update(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'sometimes|required|string|max:20|unique:exams,code,' . $id,
            'type' => 'sometimes|required|in:mid-term,final,quarterly,unit-test,other',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'status' => 'sometimes|required|in:scheduled,ongoing,completed,cancelled',
            'publish_results' => 'sometimes|boolean',
        ]);

        $exam->update($request->only([
            'name',
            'code',
            'type',
            'start_date',
            'end_date',
            'description',
            'publish_results',
            'status',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Exam updated successfully',
            'data' => $exam,
        ]);
    }

    /**
     * Remove the specified exam
     */
    public function destroy($id)
    {
        $exam = Exam::findOrFail($id);
        $exam->delete();

        return response()->json([
            'success' => true,
            'message' => 'Exam deleted successfully',
        ]);
    }

    /**
     * Create exam schedule
     */
    public function createSchedule(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);

        $request->validate([
            'schedules' => 'required|array',
            'schedules.*.class_id' => 'required|exists:classes,id',
            'schedules.*.subject_id' => 'required|exists:subjects,id',
            'schedules.*.exam_date' => 'required|date',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i|after:schedules.*.start_time',
            'schedules.*.total_marks' => 'nullable|integer',
            'schedules.*.passing_marks' => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->schedules as $schedule) {
                ExamSchedule::create([
                    'exam_id' => $exam->id,
                    'class_id' => $schedule['class_id'],
                    'subject_id' => $schedule['subject_id'],
                    'exam_date' => $schedule['exam_date'],
                    'start_time' => $schedule['start_time'],
                    'end_time' => $schedule['end_time'],
                    'room_number' => $schedule['room_number'] ?? null,
                    'total_marks' => $schedule['total_marks'] ?? 100,
                    'passing_marks' => $schedule['passing_marks'] ?? 40,
                    'instructions' => $schedule['instructions'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Exam schedule created successfully',
                'data' => $exam->load('schedules'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create exam schedule',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get exam schedule for a class
     */
    public function getSchedule(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);

        $query = ExamSchedule::where('exam_id', $id)
            ->with(['class', 'subject']);

        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        $schedules = $query->orderBy('exam_date')->orderBy('start_time')->get();

        return response()->json([
            'success' => true,
            'data' => $schedules,
        ]);
    }
}

