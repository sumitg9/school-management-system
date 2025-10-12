<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\ExamSchedule;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class GradeController extends Controller
{
    /**
     * Display grades
     */
    public function index(Request $request)
    {
        $query = Grade::with(['student', 'exam', 'subject', 'class', 'section']);

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        $perPage = $request->get('per_page', 50);

        if ($perPage === 'all') {
            $grades = $query->get();
            return response()->json([
                'success' => true,
                'data' => $grades,
            ]);
        }

        $grades = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $grades->items(),
            'meta' => [
                'current_page' => $grades->currentPage(),
                'total_pages' => $grades->lastPage(),
                'per_page' => $grades->perPage(),
                'total' => $grades->total(),
            ],
        ]);
    }

    /**
     * Enter grades for students
     */
    public function enterGrades(Request $request)
    {
        $request->validate([
            'exam_schedule_id' => 'required|exists:exam_schedules,id',
            'grades' => 'required|array',
            'grades.*.student_id' => 'required|exists:students,id',
            'grades.*.marks_obtained' => 'required|numeric|min:0',
            'grades.*.remarks' => 'nullable|string',
        ]);

        $examSchedule = ExamSchedule::findOrFail($request->exam_schedule_id);

        DB::beginTransaction();
        try {
            foreach ($request->grades as $gradeData) {
                $marksObtained = $gradeData['marks_obtained'];
                $totalMarks = $examSchedule->total_marks;
                $percentage = ($marksObtained / $totalMarks) * 100;

                // Determine grade
                $grade = $this->calculateGrade($percentage);

                // Determine result
                $result = $marksObtained >= $examSchedule->passing_marks ? 'pass' : 'fail';

                Grade::updateOrCreate(
                    [
                        'exam_schedule_id' => $request->exam_schedule_id,
                        'student_id' => $gradeData['student_id'],
                    ],
                    [
                        'marks_obtained' => $marksObtained,
                        'total_marks' => $totalMarks,
                        'grade' => $grade,
                        'percentage' => round($percentage, 2),
                        'result' => $result,
                        'remarks' => $gradeData['remarks'] ?? null,
                        'entered_by' => auth()->id(),
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Grades entered successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to enter grades',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk create grades
     */
    public function bulkCreate(Request $request)
    {
        $request->validate([
            'grades' => 'required|array',
            'grades.*.exam_id' => 'required|exists:exams,id',
            'grades.*.student_id' => 'required|exists:students,id',
            'grades.*.subject_id' => 'required|exists:subjects,id',
            'grades.*.class_id' => 'required|exists:classes,id',
            'grades.*.section_id' => 'required|exists:sections,id',
            'grades.*.marks_obtained' => 'required|numeric|min:0',
            'grades.*.total_marks' => 'required|numeric|min:0',
            'grades.*.remarks' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->grades as $gradeData) {
                $marksObtained = $gradeData['marks_obtained'];
                $totalMarks = $gradeData['total_marks'];
                $percentage = $totalMarks > 0 ? ($marksObtained / $totalMarks) * 100 : 0;

                // Determine grade
                $grade = $this->calculateGrade($percentage);

                // Determine if absent
                $isAbsent = $gradeData['is_absent'] ?? false;

                Grade::updateOrCreate(
                    [
                        'exam_id' => $gradeData['exam_id'],
                        'student_id' => $gradeData['student_id'],
                        'subject_id' => $gradeData['subject_id'],
                    ],
                    [
                        'class_id' => $gradeData['class_id'],
                        'section_id' => $gradeData['section_id'],
                        'marks_obtained' => $marksObtained,
                        'total_marks' => $totalMarks,
                        'grade' => $grade,
                        'percentage' => round($percentage, 2),
                        'remarks' => $gradeData['remarks'] ?? null,
                        'is_absent' => $isAbsent,
                        'entered_by' => auth()->id(),
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Grades created successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create grades',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get student report card
     */
    public function getReportCard(Request $request, $studentId)
    {
        $request->validate([
            'exam_id' => 'required|exists:exams,id',
        ]);

        $student = Student::with(['class', 'section'])->findOrFail($studentId);

        $grades = Grade::where('exam_id', $request->exam_id)
            ->where('student_id', $studentId)
            ->with(['exam', 'subject', 'class', 'section'])
            ->get();

        $totalMarks = $grades->sum('marks_obtained');
        $totalPossible = $grades->sum('total_marks');
        $overallPercentage = $totalPossible > 0 ? round(($totalMarks / $totalPossible) * 100, 2) : 0;
        $overallGrade = $this->calculateGrade($overallPercentage);

        $reportCard = [
            'student' => $student,
            'grades' => $grades,
            'summary' => [
                'total_marks_obtained' => $totalMarks,
                'total_marks' => $totalPossible,
                'percentage' => $overallPercentage,
                'grade' => $overallGrade,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $reportCard,
        ]);
    }

    /**
     * Update a grade
     */
    public function update(Request $request, $id)
    {
        $grade = Grade::findOrFail($id);

        $request->validate([
            'marks_obtained' => 'sometimes|required|numeric|min:0',
            'remarks' => 'nullable|string',
        ]);

        if ($request->has('marks_obtained')) {
            $marksObtained = $request->marks_obtained;
            $totalMarks = $grade->total_marks;
            $percentage = ($marksObtained / $totalMarks) * 100;

            $grade->update([
                'marks_obtained' => $marksObtained,
                'percentage' => round($percentage, 2),
                'grade' => $this->calculateGrade($percentage),
                'result' => $marksObtained >= $grade->examSchedule->passing_marks ? 'pass' : 'fail',
                'remarks' => $request->remarks ?? $grade->remarks,
            ]);
        } else {
            $grade->update($request->only(['remarks']));
        }

        return response()->json([
            'success' => true,
            'message' => 'Grade updated successfully',
            'data' => $grade,
        ]);
    }

    /**
     * Calculate grade based on percentage
     */
    private function calculateGrade($percentage)
    {
        if ($percentage >= 90) return 'A+';
        if ($percentage >= 80) return 'A';
        if ($percentage >= 70) return 'B+';
        if ($percentage >= 60) return 'B';
        if ($percentage >= 50) return 'C+';
        if ($percentage >= 40) return 'C';
        return 'F';
    }

    /**
     * Generate report card PDF
     */
    public function generateReportCardPDF($studentId, Request $request)
    {
        $examId = $request->get('exam_id');

        $student = Student::with(['user', 'class', 'section', 'academicYear'])->findOrFail($studentId);

        $grades = Grade::with(['subject', 'exam'])
            ->where('student_id', $studentId)
            ->where('exam_id', $examId)
            ->get();

        $totalMarks = $grades->sum('total_marks');
        $marksObtained = $grades->sum('marks_obtained');
        $percentage = $totalMarks > 0 ? ($marksObtained / $totalMarks) * 100 : 0;
        $overallGrade = $this->calculateGrade($percentage);

        $pdf = Pdf::loadView('pdf.report-card', [
            'student' => $student,
            'grades' => $grades,
            'totalMarks' => $totalMarks,
            'marksObtained' => $marksObtained,
            'percentage' => round($percentage, 2),
            'overallGrade' => $overallGrade,
            'generated_at' => now()->format('d M Y, h:i A'),
        ]);

        return $pdf->download('report-card-' . $student->admission_number . '-' . now()->format('Y-m-d') . '.pdf');
    }
}

