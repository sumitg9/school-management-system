<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Models\ParentModel;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\AcademicYear;
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
        $query = Student::with(['user:id,name,email,phone,gender', 'class:id,name', 'section:id,name']);

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
                  ->orWhere('admission_number', 'like', "%{$search}%")
                  ->orWhere('roll_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('email', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
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
            'religion' => 'nullable|string|max:50',
            'caste' => 'nullable|string|max:50',
            'nationality' => 'nullable|string|max:50',
            'mother_tongue' => 'nullable|string|max:50',
            'previous_school' => 'nullable|string|max:200',
            'medical_conditions' => 'nullable|string',
            'allergies' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relation' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'roll_number' => 'nullable|string|max:20',
            'status' => 'sometimes|required|in:active,inactive,graduated,transferred,expelled',
            'father_name' => 'nullable|string|max:100',
            'father_phone' => 'nullable|string|max:20',
            'father_occupation' => 'nullable|string|max:100',
            'mother_name' => 'nullable|string|max:100',
            'mother_phone' => 'nullable|string|max:20',
            'mother_occupation' => 'nullable|string|max:100',
            'guardian_name' => 'nullable|string|max:100',
            'guardian_phone' => 'nullable|string|max:20',
            'guardian_relation' => 'nullable|string|max:50',
        ]);

        DB::beginTransaction();
        try {
            // Create user account
            $user = User::create([
                'name' => trim($request->first_name . ' ' . $request->last_name),
                'email' => $request->email,
                'password' => Hash::make('password123'), // Default password
                'phone' => $request->phone,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'address' => $request->address,
                'city' => $request->city,
                'state' => $request->state,
                'country' => $request->country ?? 'USA',
                'postal_code' => $request->postal_code,
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
                'roll_number' => $request->roll_number,
                'blood_group' => $request->blood_group,
                'religion' => $request->religion,
                'caste' => $request->caste,
                'nationality' => $request->nationality ?? 'American',
                'mother_tongue' => $request->mother_tongue,
                'previous_school' => $request->previous_school,
                'medical_conditions' => $request->medical_conditions,
                'allergies' => $request->allergies,
                'emergency_contact_name' => $request->emergency_contact_name ?? $request->father_name ?? $request->guardian_name,
                'emergency_contact_phone' => $request->emergency_contact_phone ?? $request->father_phone ?? $request->guardian_phone,
                'emergency_contact_relation' => $request->emergency_contact_relation ?? ($request->father_name ? 'Father' : ($request->guardian_relation ?? 'Guardian')),
                'status' => $request->status ?? 'active',
                'notes' => $request->notes,
            ]);

            // Link parent if parent info provided
            if ($request->filled('father_name') || $request->filled('mother_name') || $request->filled('guardian_name')) {
                $parentEmail = $request->filled('father_phone')
                    ? 'parent.' . preg_replace('/[^0-9]/', '', $request->father_phone) . '@school.com'
                    : 'parent.' . $student->admission_number . '@school.com';

                $parentUser = User::firstOrCreate(
                    ['email' => $parentEmail],
                    [
                        'name' => $request->father_name ?? ($request->mother_name ?? 'Parent of ' . $student->first_name),
                        'password' => Hash::make('password123'),
                        'phone' => $request->father_phone ?? $request->mother_phone,
                        'status' => 'active',
                    ]
                );

                if (!$parentUser->hasRole('parent')) {
                    $parentUser->assignRole('parent');
                }

                $parentRecord = ParentModel::create([
                    'user_id' => $parentUser->id,
                    'father_name' => $request->father_name,
                    'father_phone' => $request->father_phone,
                    'father_occupation' => $request->father_occupation,
                    'mother_name' => $request->mother_name,
                    'mother_phone' => $request->mother_phone,
                    'mother_occupation' => $request->mother_occupation,
                    'guardian_name' => $request->guardian_name,
                    'guardian_phone' => $request->guardian_phone,
                    'guardian_relation' => $request->guardian_relation,
                    'status' => 'active',
                ]);

                $student->parents()->attach($parentRecord->id, [
                    'relation' => 'father',
                    'is_primary' => true,
                ]);
            }

            DB::commit();

            $student->load(['user', 'class', 'section', 'academicYear', 'parents']);

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
        $student = Student::with([
            'user',
            'class',
            'section',
            'academicYear',
            'parents',
            'attendances' => fn($q) => $q->latest('date')->take(30),
            'grades.exam',
            'grades.subject',
            'feePayments.feeStructure',
        ])->findOrFail($id);

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
        $student = Student::with(['user', 'parents'])->findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'email' => 'sometimes|required|email|unique:users,email,' . ($student->user_id ?? 'NULL'),
            'phone' => 'nullable|string|max:20',
            'admission_number' => 'sometimes|required|string|max:50|unique:students,admission_number,' . $student->id,
            'admission_date' => 'sometimes|required|date',
            'class_id' => 'sometimes|required|exists:classes,id',
            'section_id' => 'sometimes|required|exists:sections,id',
            'academic_year_id' => 'sometimes|required|exists:academic_years,id',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'blood_group' => 'nullable|string|max:10',
            'religion' => 'nullable|string|max:50',
            'caste' => 'nullable|string|max:50',
            'nationality' => 'nullable|string|max:50',
            'mother_tongue' => 'nullable|string|max:50',
            'previous_school' => 'nullable|string|max:200',
            'medical_conditions' => 'nullable|string',
            'allergies' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relation' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'roll_number' => 'nullable|string|max:20',
            'status' => 'sometimes|required|in:active,inactive,graduated,transferred,expelled',
            'father_name' => 'nullable|string|max:100',
            'father_phone' => 'nullable|string|max:20',
            'father_occupation' => 'nullable|string|max:100',
            'mother_name' => 'nullable|string|max:100',
            'mother_phone' => 'nullable|string|max:20',
            'mother_occupation' => 'nullable|string|max:100',
            'guardian_name' => 'nullable|string|max:100',
            'guardian_phone' => 'nullable|string|max:20',
            'guardian_relation' => 'nullable|string|max:50',
        ]);

        DB::beginTransaction();
        try {
            // Update Student attributes
            $studentFields = [
                'academic_year_id',
                'class_id',
                'section_id',
                'admission_number',
                'admission_date',
                'first_name',
                'last_name',
                'roll_number',
                'blood_group',
                'religion',
                'caste',
                'nationality',
                'mother_tongue',
                'previous_school',
                'medical_conditions',
                'allergies',
                'emergency_contact_name',
                'emergency_contact_phone',
                'emergency_contact_relation',
                'status',
                'notes',
            ];
            $studentUpdate = [];
            foreach ($studentFields as $field) {
                if ($request->has($field)) {
                    $studentUpdate[$field] = $request->input($field);
                }
            }
            if (!empty($studentUpdate)) {
                $student->update($studentUpdate);
            }

            // Update User attributes
            if ($student->user) {
                $userFields = [
                    'email',
                    'phone',
                    'date_of_birth',
                    'gender',
                    'address',
                    'city',
                    'state',
                    'country',
                    'postal_code',
                ];
                $userUpdate = [];
                foreach ($userFields as $field) {
                    if ($request->has($field)) {
                        $userUpdate[$field] = $request->input($field);
                    }
                }
                if ($request->has('first_name') || $request->has('last_name')) {
                    $fn = $request->input('first_name', $student->first_name);
                    $ln = $request->input('last_name', $student->last_name);
                    $userUpdate['name'] = trim("{$fn} {$ln}");
                }
                if (!empty($userUpdate)) {
                    $student->user->update($userUpdate);
                }
            }

            // Update or Create Parent details
            $parentFields = [
                'father_name',
                'father_phone',
                'father_occupation',
                'mother_name',
                'mother_phone',
                'mother_occupation',
                'guardian_name',
                'guardian_phone',
                'guardian_relation',
            ];
            $parentUpdate = [];
            $hasParentInput = false;
            foreach ($parentFields as $pField) {
                if ($request->has($pField)) {
                    $parentUpdate[$pField] = $request->input($pField);
                    if ($request->filled($pField)) {
                        $hasParentInput = true;
                    }
                }
            }

            if (!empty($parentUpdate)) {
                $existingParent = $student->parents()->first();
                if ($existingParent) {
                    $existingParent->update($parentUpdate);
                } elseif ($hasParentInput) {
                    $pEmail = $request->filled('father_phone')
                        ? 'parent.' . preg_replace('/[^0-9]/', '', $request->father_phone) . '@school.com'
                        : 'parent.' . $student->admission_number . '@school.com';

                    $parentUser = User::firstOrCreate(
                        ['email' => $pEmail],
                        [
                            'name' => $request->father_name ?? ($request->mother_name ?? 'Parent of ' . $student->first_name),
                            'password' => Hash::make('password123'),
                            'phone' => $request->father_phone ?? $request->mother_phone,
                            'status' => 'active',
                        ]
                    );

                    if (!$parentUser->hasRole('parent')) {
                        $parentUser->assignRole('parent');
                    }

                    $newParent = ParentModel::create(array_merge($parentUpdate, [
                        'user_id' => $parentUser->id,
                        'status' => 'active',
                    ]));

                    $student->parents()->attach($newParent->id, [
                        'relation' => 'father',
                        'is_primary' => true,
                    ]);
                }
            }

            DB::commit();

            $student->load([
                'user',
                'class',
                'section',
                'academicYear',
                'parents',
                'attendances' => fn($q) => $q->latest('date')->take(30),
                'grades.exam',
                'grades.subject',
                'feePayments.feeStructure',
            ]);

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

    /**
     * Download student CSV import template
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="student_import_template.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = [
            // Basic & Academic Information
            'first_name',
            'last_name',
            'email',
            'phone',
            'admission_number',
            'admission_date',
            'class_id',
            'section_id',
            'academic_year_id',
            'roll_number',
            'date_of_birth',
            'gender',
            'blood_group',
            'religion',
            'caste',
            'nationality',
            'mother_tongue',
            'status',

            // Address Information
            'address',
            'city',
            'state',
            'country',
            'postal_code',

            // Parent & Guardian Information
            'father_name',
            'father_phone',
            'father_occupation',
            'mother_name',
            'mother_phone',
            'mother_occupation',
            'guardian_name',
            'guardian_phone',
            'guardian_relation',

            // Emergency Contact
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relation',

            // Additional Information
            'previous_school',
            'medical_conditions',
            'allergies',
            'notes',
        ];

        $sampleRows = [
            [
                'Aarav',
                'Sharma',
                'aarav.sharma@example.com',
                '+91 98765 11001',
                'ADM2026001',
                '2026-04-01',
                '1',
                '1',
                '1',
                '101',
                '2015-05-15',
                'male',
                'B+',
                'Hindu',
                'General',
                'Indian',
                'Hindi',
                'active',
                'Flat 402, Shanti Kunj, Sector 14, Dwarka',
                'New Delhi',
                'Delhi',
                'India',
                '110078',
                'Rajesh Sharma',
                '+91 98765 22001',
                'Software Engineer',
                'Pooja Sharma',
                '+91 98765 22002',
                'Teacher',
                '',
                '',
                '',
                'Rajesh Sharma',
                '+91 98765 22001',
                'Father',
                'Delhi Public School, R.K. Puram',
                'None',
                'None',
                'Excels in mathematics and active in school athletics',
            ],
            [
                'Ananya',
                'Patel',
                'ananya.patel@example.com',
                '+91 98765 11002',
                'ADM2026002',
                '2026-04-01',
                '1',
                '1',
                '1',
                '102',
                '2015-08-20',
                'female',
                'O+',
                'Hindu',
                'General',
                'Indian',
                'Gujarati',
                'active',
                'B-12, Gokul Dham, Satellite',
                'Ahmedabad',
                'Gujarat',
                'India',
                '380015',
                'Kirit Patel',
                '+91 98765 22003',
                'Businessman',
                'Neeta Patel',
                '+91 98765 22004',
                'Homemaker',
                '',
                '',
                '',
                'Kirit Patel',
                '+91 98765 22003',
                'Father',
                'St. Xavier High School, Ahmedabad',
                'Mild Asthmatic',
                'Dust allergy',
                'Interested in classical vocal music and debate',
            ]
        ];

        $callback = function () use ($columns, $sampleRows) {
            $file = fopen('php://output', 'w');
            // Write UTF-8 BOM so Excel opens it with proper encoding
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, $columns);
            foreach ($sampleRows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Import students from CSV file
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $handle = fopen($path, 'r');
        
        // Strip BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $header = fgetcsv($handle);
        if (!$header) {
            return response()->json(['success' => false, 'message' => 'Uploaded CSV file is empty'], 422);
        }

        // Normalize headers
        $header = array_map(function($h) {
            return trim(strtolower(str_replace([' ', '-'], '_', $h)));
        }, $header);

        $importedCount = 0;
        $errors = [];
        $rowNum = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            if (empty(array_filter($row))) continue;
            if (count($row) < count($header)) {
                $row = array_pad($row, count($header), '');
            }
            $data = array_combine(array_slice($header, 0, count($row)), array_slice($row, 0, count($header)));

            try {
                $admNo = $data['admission_number'] ?? null;
                $email = $data['email'] ?? null;
                if (!$admNo || !$email) {
                    $errors[] = "Row $rowNum: admission_number and email are required.";
                    continue;
                }

                if (Student::where('admission_number', $admNo)->exists()) {
                    $errors[] = "Row $rowNum: Student with admission number $admNo already exists.";
                    continue;
                }

                if (User::where('email', $email)->exists()) {
                    $errors[] = "Row $rowNum: User with email $email already exists.";
                    continue;
                }

                DB::beginTransaction();
                $firstName = $data['first_name'] ?? 'Student';
                $lastName = $data['last_name'] ?? '';

                $user = User::create([
                    'name' => trim($firstName . ' ' . $lastName),
                    'email' => $email,
                    'password' => Hash::make('password123'),
                    'phone' => $data['phone'] ?? null,
                    'date_of_birth' => !empty($data['date_of_birth']) ? $data['date_of_birth'] : null,
                    'gender' => !empty($data['gender']) ? strtolower($data['gender']) : null,
                    'address' => $data['address'] ?? null,
                    'city' => $data['city'] ?? null,
                    'state' => $data['state'] ?? null,
                    'country' => $data['country'] ?? 'India',
                    'postal_code' => $data['postal_code'] ?? null,
                    'status' => 'active',
                ]);

                $user->assignRole('student');

                $student = Student::create([
                    'user_id' => $user->id,
                    'academic_year_id' => !empty($data['academic_year_id']) ? $data['academic_year_id'] : 1,
                    'class_id' => !empty($data['class_id']) ? $data['class_id'] : 1,
                    'section_id' => !empty($data['section_id']) ? $data['section_id'] : 1,
                    'admission_number' => $admNo,
                    'admission_date' => !empty($data['admission_date']) ? $data['admission_date'] : now()->toDateString(),
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'roll_number' => $data['roll_number'] ?? null,
                    'blood_group' => $data['blood_group'] ?? null,
                    'religion' => $data['religion'] ?? null,
                    'caste' => $data['caste'] ?? null,
                    'nationality' => $data['nationality'] ?? ($data['country'] ?? 'India'),
                    'mother_tongue' => $data['mother_tongue'] ?? null,
                    'previous_school' => $data['previous_school'] ?? null,
                    'medical_conditions' => $data['medical_conditions'] ?? null,
                    'allergies' => $data['allergies'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                    'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                    'emergency_contact_relation' => $data['emergency_contact_relation'] ?? null,
                    'status' => !empty($data['status']) ? $data['status'] : 'active',
                ]);

                if (!empty($data['father_name']) || !empty($data['mother_name']) || !empty($data['guardian_name'])) {
                    $parentEmail = !empty($data['father_phone'])
                        ? 'parent.' . preg_replace('/[^0-9]/', '', $data['father_phone']) . '@school.com'
                        : 'parent.' . $student->admission_number . '@school.com';

                    $parentUser = User::firstOrCreate(
                        ['email' => $parentEmail],
                        [
                            'name' => $data['father_name'] ?? ($data['mother_name'] ?? ($data['guardian_name'] ?? 'Parent of ' . $student->first_name)),
                            'password' => Hash::make('password123'),
                            'phone' => $data['father_phone'] ?? ($data['mother_phone'] ?? ($data['guardian_phone'] ?? null)),
                            'status' => 'active',
                        ]
                    );

                    if (!$parentUser->hasRole('parent')) {
                        $parentUser->assignRole('parent');
                    }

                    $parentRecord = ParentModel::create([
                        'user_id' => $parentUser->id,
                        'father_name' => $data['father_name'] ?? null,
                        'father_phone' => $data['father_phone'] ?? null,
                        'father_occupation' => $data['father_occupation'] ?? null,
                        'mother_name' => $data['mother_name'] ?? null,
                        'mother_phone' => $data['mother_phone'] ?? null,
                        'mother_occupation' => $data['mother_occupation'] ?? null,
                        'guardian_name' => $data['guardian_name'] ?? null,
                        'guardian_phone' => $data['guardian_phone'] ?? null,
                        'guardian_relation' => $data['guardian_relation'] ?? null,
                        'status' => 'active',
                    ]);

                    $relation = 'father';
                    if (!empty($data['guardian_relation'])) {
                        $cleanRel = strtolower(trim($data['guardian_relation']));
                        $relation = in_array($cleanRel, ['father', 'mother', 'guardian', 'other']) ? $cleanRel : 'other';
                    } elseif (!empty($data['father_name'])) {
                        $relation = 'father';
                    } elseif (!empty($data['mother_name'])) {
                        $relation = 'mother';
                    }

                    $student->parents()->attach($parentRecord->id, [
                        'relation' => $relation,
                        'is_primary' => true,
                    ]);
                }

                DB::commit();
                $importedCount++;
            } catch (\Exception $e) {
                DB::rollBack();
                $errors[] = "Row $rowNum: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'success' => true,
            'message' => "Successfully imported $importedCount students.",
            'imported_count' => $importedCount,
            'errors' => $errors,
        ]);
    }
}

