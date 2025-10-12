<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Barryvdh\DomPDF\Facade\Pdf;

class StudentController extends Controller
{
    /**
     * Display a listing of students
     */
    public function index(Request $request)
    {
        $query = Student::with(['user', 'class', 'section', 'academicYear']);

        // Filters
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('admission_number', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all') {
            $students = $query->get();
            return response()->json([
                'success' => true,
                'data' => $students,
            ]);
        }

        $students = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $students->items(),
            'meta' => [
                'current_page' => $students->currentPage(),
                'total_pages' => $students->lastPage(),
                'per_page' => $students->perPage(),
                'total' => $students->total(),
            ],
        ]);
    }

    /**
     * Store a newly created student
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'admission_number' => 'required|string|max:50|unique:students,admission_number',
            'admission_date' => 'required|date',
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'blood_group' => 'nullable|string|max:10',
            'address' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Create user account
            $user = User::create([
                'name' => $request->first_name . ' ' . $request->last_name,
                'email' => $request->email,
                'password' => Hash::make('password123'), // Default password
                'phone' => $request->phone,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'address' => $request->address,
                'status' => 'active',
            ]);

            // Assign student role
            $user->assignRole('student');

            // Create student record
            $student = Student::create([
                'user_id' => $user->id,
                'academic_year_id' => $request->academic_year_id,
                'class_id' => $request->class_id,
                'section_id' => $request->section_id,
                'admission_number' => $request->admission_number,
                'admission_date' => $request->admission_date,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'blood_group' => $request->blood_group,
                'status' => 'active',
            ]);

            DB::commit();

            $student->load(['user', 'class', 'section', 'academicYear']);

            return response()->json([
                'success' => true,
                'message' => 'Student created successfully',
                'data' => $student,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create student',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified student
     */
    public function show($id)
    {
        $student = Student::with(['user', 'class', 'section', 'academicYear', 'parents'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $student,
        ]);
    }

    /**
     * Update the specified student
     */
    public function update(Request $request, $id)
    {
        $student = Student::findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'class_id' => 'sometimes|required|exists:classes,id',
            'section_id' => 'sometimes|required|exists:sections,id',
            'status' => 'sometimes|required|in:active,inactive,graduated,transferred,expelled',
        ]);

        DB::beginTransaction();
        try {
            // Update student
            $student->update($request->only([
                'first_name',
                'last_name',
                'class_id',
                'section_id',
                'blood_group',
                'status',
            ]));

            // Update user if needed
            if ($request->has('email') || $request->has('phone')) {
                $student->user->update($request->only(['email', 'phone']));
            }

            DB::commit();

            $student->load(['user', 'class', 'section', 'academicYear']);

            return response()->json([
                'success' => true,
                'message' => 'Student updated successfully',
                'data' => $student,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update student',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified student
     */
    public function destroy($id)
    {
        $student = Student::findOrFail($id);

        DB::beginTransaction();
        try {
            $student->delete();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete student',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get student statistics
     */
    public function statistics()
    {
        $stats = [
            'total' => Student::count(),
            'active' => Student::where('status', 'active')->count(),
            'inactive' => Student::where('status', 'inactive')->count(),
            'graduated' => Student::where('status', 'graduated')->count(),
            'by_class' => Student::select('class_id', DB::raw('count(*) as count'))
                ->groupBy('class_id')
                ->with('class:id,name')
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Export students list as PDF
     */
    public function exportPDF(Request $request)
    {
        $query = Student::with(['user', 'class', 'section', 'academicYear']);

        // Apply same filters as index
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $students = $query->orderBy('first_name')->get();

        $pdf = Pdf::loadView('pdf.students-list', [
            'students' => $students,
            'title' => 'Students List',
            'generated_at' => now()->format('d M Y, h:i A'),
        ]);

        return $pdf->download('students-list-' . now()->format('Y-m-d') . '.pdf');
    }
}

