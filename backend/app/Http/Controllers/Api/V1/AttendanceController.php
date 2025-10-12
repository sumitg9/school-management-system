<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendance records
     */
    public function index(Request $request)
    {
        $query = Attendance::with(['student', 'class', 'section']);

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->filled('date')) {
            $query->whereDate('date', $request->date);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        $query->orderBy('date', 'desc');

        $perPage = $request->get('per_page', 50);

        if ($perPage === 'all') {
            $attendance = $query->get();
            return response()->json([
                'success' => true,
                'data' => $attendance,
            ]);
        }

        $attendance = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $attendance->items(),
            'meta' => [
                'current_page' => $attendance->currentPage(),
                'total_pages' => $attendance->lastPage(),
                'per_page' => $attendance->perPage(),
                'total' => $attendance->total(),
            ],
        ]);
    }

    /**
     * Mark attendance for a class
     */
    public function markAttendance(Request $request)
    {
        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'date' => 'required|date',
            'attendance' => 'required|array',
            'attendance.*.student_id' => 'required|exists:students,id',
            'attendance.*.status' => 'required|in:present,absent,late,half-day,on-leave',
            'attendance.*.remarks' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->attendance as $record) {
                Attendance::updateOrCreate(
                    [
                        'student_id' => $record['student_id'],
                        'date' => $request->date,
                    ],
                    [
                        'class_id' => $request->class_id,
                        'section_id' => $request->section_id,
                        'status' => $record['status'],
                        'remarks' => $record['remarks'] ?? null,
                        'marked_by' => auth()->id(),
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Attendance marked successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark attendance',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get attendance for a specific date and class
     */
    public function getByDate(Request $request)
    {
        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'date' => 'required|date',
        ]);

        $students = Student::where('class_id', $request->class_id)
            ->where('section_id', $request->section_id)
            ->where('status', 'active')
            ->with(['user'])
            ->get();

        $attendance = Attendance::where('class_id', $request->class_id)
            ->where('section_id', $request->section_id)
            ->whereDate('date', $request->date)
            ->get()
            ->keyBy('student_id');

        $result = $students->map(function ($student) use ($attendance) {
            return [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'roll_number' => $student->roll_number,
                'status' => $attendance->has($student->id) ? $attendance[$student->id]->status : null,
                'remarks' => $attendance->has($student->id) ? $attendance[$student->id]->remarks : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Get attendance statistics
     */
    public function statistics(Request $request)
    {
        $query = Attendance::query();

        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->has('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $total = $query->count();
        $present = $query->where('status', 'present')->count();
        $absent = $query->where('status', 'absent')->count();
        $late = $query->where('status', 'late')->count();

        $stats = [
            'total' => $total,
            'present' => $present,
            'absent' => $absent,
            'late' => $late,
            'percentage' => $total > 0 ? round(($present / $total) * 100, 2) : 0,
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Update attendance record
     */
    public function update(Request $request, $id)
    {
        $attendance = Attendance::findOrFail($id);

        $request->validate([
            'status' => 'sometimes|required|in:present,absent,late,half-day,on-leave',
            'remarks' => 'nullable|string',
        ]);

        $attendance->update($request->only(['status', 'remarks']));

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully',
            'data' => $attendance,
        ]);
    }
}

