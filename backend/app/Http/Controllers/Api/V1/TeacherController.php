<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TeacherController extends Controller
{
    /**
     * Display a listing of teachers
     */
    public function index(Request $request)
    {
        $query = Teacher::with(['user']);

        // Filters
        if ($request->filled('department')) {
            $query->where('department', $request->department);
        }

        if ($request->filled('employment_type')) {
            $query->where('employment_type', $request->employment_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('employee_id', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all') {
            $teachers = $query->get();
            return response()->json([
                'success' => true,
                'data' => $teachers,
            ]);
        }

        $teachers = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $teachers->items(),
            'meta' => [
                'current_page' => $teachers->currentPage(),
                'total_pages' => $teachers->lastPage(),
                'per_page' => $teachers->perPage(),
                'total' => $teachers->total(),
            ],
        ]);
    }

    /**
     * Store a newly created teacher
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'employee_id' => 'required|string|max:50|unique:teachers,employee_id',
            'joining_date' => 'required|date',
            'qualification' => 'nullable|string|max:200',
            'department' => 'nullable|string|max:100',
            'designation' => 'nullable|string|max:100',
            'salary' => 'nullable|numeric|min:0',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
        ]);

        DB::beginTransaction();
        try {
            // Create user account
            $user = User::create([
                'name' => $request->first_name . ' ' . $request->last_name,
                'email' => $request->email,
                'password' => Hash::make('password123'),
                'phone' => $request->phone,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'status' => 'active',
            ]);

            // Assign teacher role
            $user->assignRole('teacher');

            // Create teacher record
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'employee_id' => $request->employee_id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'joining_date' => $request->joining_date,
                'qualification' => $request->qualification,
                'department' => $request->department,
                'designation' => $request->designation,
                'salary' => $request->salary,
                'status' => 'active',
            ]);

            DB::commit();

            $teacher->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Teacher created successfully',
                'data' => $teacher,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create teacher',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified teacher
     */
    public function show($id)
    {
        $teacher = Teacher::with(['user'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $teacher,
        ]);
    }

    /**
     * Update the specified teacher
     */
    public function update(Request $request, $id)
    {
        $teacher = Teacher::findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'department' => 'sometimes|nullable|string|max:100',
            'designation' => 'sometimes|nullable|string|max:100',
            'status' => 'sometimes|required|in:active,inactive,on-leave,resigned,terminated',
        ]);

        DB::beginTransaction();
        try {
            $teacher->update($request->only([
                'first_name',
                'last_name',
                'qualification',
                'department',
                'designation',
                'salary',
                'status',
            ]));

            if ($request->has('email') || $request->has('phone')) {
                $teacher->user->update($request->only(['email', 'phone']));
            }

            DB::commit();

            $teacher->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Teacher updated successfully',
                'data' => $teacher,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified teacher
     */
    public function destroy($id)
    {
        $teacher = Teacher::findOrFail($id);

        DB::beginTransaction();
        try {
            $teacher->delete();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete teacher',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get teacher statistics
     */
    public function statistics()
    {
        $stats = [
            'total' => Teacher::count(),
            'active' => Teacher::where('status', 'active')->count(),
            'inactive' => Teacher::where('status', 'inactive')->count(),
            'on_leave' => Teacher::where('status', 'on-leave')->count(),
            'by_department' => Teacher::select('department', DB::raw('count(*) as count'))
                ->whereNotNull('department')
                ->groupBy('department')
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}

