<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\ClassModel;
use App\Models\Section;
use App\Models\AcademicYear;

class StudentUpdateTest extends TestCase
{
    public function test_student_update_flow_persists_all_fields(): void
    {
        // 1. Authenticate as admin
        $admin = User::where('email', 'admin@school.com')->first();
        $this->assertNotNull($admin);

        // 2. Fetch student list
        $listResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/students');
        $listResponse->assertStatus(200);
        $listData = $listResponse->json('data');
        $this->assertNotEmpty($listData);

        // Verify list data has email, phone, gender, admission_number
        $firstStudentInList = $listData[0];
        $this->assertNotEmpty($firstStudentInList['admission_number']);
        $this->assertNotNull($firstStudentInList['email']);

        $studentId = $firstStudentInList['id'];

        // 3. Fetch single student view
        $showResponse = $this->actingAs($admin, 'sanctum')->getJson("/api/v1/students/{$studentId}");
        $showResponse->assertStatus(200);
        $studentData = $showResponse->json('data');
        $this->assertEquals($studentId, $studentData['id']);

        // 4. Update student with new data for ALL modules (student, user, parent)
        $updateEmail = "aarav.sharma.{$studentId}@school.com";
        // Ensure no collision
        User::where('email', $updateEmail)->where('id', '!=', $studentData['user_id'] ?? 0)->delete();

        $updatePayload = [
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'email' => $updateEmail,
            'phone' => '+91 98765 44321',
            'date_of_birth' => '2007-09-15',
            'gender' => 'male',
            'blood_group' => 'B+',
            'admission_number' => $studentData['admission_number'],
            'admission_date' => '2023-08-01',
            'roll_number' => '99',
            'class_id' => $studentData['class_id'],
            'section_id' => $studentData['section_id'],
            'academic_year_id' => $studentData['academic_year_id'],
            'status' => 'active',
            'address' => '789, MG Road, Shivaji Nagar',
            'city' => 'Bengaluru',
            'state' => 'Karnataka',
            'country' => 'India',
            'postal_code' => '560001',
            'father_name' => 'Suresh Sharma',
            'father_phone' => '+91 98765 88001',
            'father_occupation' => 'Chief Engineer',
            'mother_name' => 'Sunita Sharma',
            'mother_phone' => '+91 98765 88002',
            'mother_occupation' => 'Professor',
            'previous_school' => 'Delhi Public School',
            'medical_conditions' => 'Mild pollen allergy',
        ];

        $updateResponse = $this->actingAs($admin, 'sanctum')->putJson("/api/v1/students/{$studentId}", $updatePayload);
        $updateResponse->assertStatus(200);
        $updatedData = $updateResponse->json('data');

        // 5. Verify API response has updated fields
        $this->assertEquals('Aarav', $updatedData['first_name']);
        $this->assertEquals('Sharma', $updatedData['last_name']);
        $this->assertEquals('Aarav Sharma', $updatedData['full_name']);
        $this->assertEquals($updateEmail, $updatedData['email']);
        $this->assertEquals('+91 98765 44321', $updatedData['phone']);
        $this->assertEquals('2007-09-15', $updatedData['date_of_birth']);
        $this->assertEquals('male', $updatedData['gender']);
        $this->assertEquals('B+', $updatedData['blood_group']);
        $this->assertEquals('99', $updatedData['roll_number']);
        $this->assertEquals('789, MG Road, Shivaji Nagar', $updatedData['address']);
        $this->assertEquals('Bengaluru', $updatedData['city']);
        $this->assertEquals('Suresh Sharma', $updatedData['father_name']);
        $this->assertEquals('Sunita Sharma', $updatedData['mother_name']);
        $this->assertEquals('Delhi Public School', $updatedData['previous_school']);
        $this->assertEquals('Mild pollen allergy', $updatedData['medical_conditions']);

        // 6. Verify directly in database!
        $freshStudent = Student::with(['user', 'parents'])->find($studentId);
        $this->assertEquals('Aarav', $freshStudent->first_name);
        $this->assertEquals('Sharma', $freshStudent->last_name);
        $this->assertEquals('B+', $freshStudent->blood_group);
        $this->assertEquals('99', $freshStudent->roll_number);
        $this->assertEquals('Delhi Public School', $freshStudent->previous_school);
        $this->assertEquals('Mild pollen allergy', $freshStudent->medical_conditions);

        // Verify User table in DB
        $freshUser = $freshStudent->user;
        $this->assertEquals('Aarav Sharma', $freshUser->name);
        $this->assertEquals($updateEmail, $freshUser->email);
        $this->assertEquals('+91 98765 44321', $freshUser->phone);
        $this->assertEquals('789, MG Road, Shivaji Nagar', $freshUser->address);
        $this->assertEquals('Bengaluru', $freshUser->city);
        $this->assertEquals('male', $freshUser->gender);

        // Verify Parent table in DB
        $freshParent = $freshStudent->parents()->first();
        $this->assertNotNull($freshParent);
        $this->assertEquals('Suresh Sharma', $freshParent->father_name);
        $this->assertEquals('Chief Engineer', $freshParent->father_occupation);
        $this->assertEquals('Sunita Sharma', $freshParent->mother_name);

        // 7. Verify Show endpoint returns all these fields
        $verifyShow = $this->actingAs($admin, 'sanctum')->getJson("/api/v1/students/{$studentId}");
        $verifyShow->assertStatus(200);
        $showData = $verifyShow->json('data');
        $this->assertEquals('Aarav Sharma', $showData['full_name']);
        $this->assertEquals($updateEmail, $showData['email']);
        $this->assertEquals('Suresh Sharma', $showData['father_name']);
        $this->assertEquals('Delhi Public School', $showData['previous_school']);
    }

    public function test_download_student_template(): void
    {
        $admin = User::where('email', 'admin@school.com')->first();
        $response = $this->actingAs($admin, 'sanctum')->get('/api/v1/students/template');
        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('content-type'));

        // Capture streamed content
        ob_start();
        $response->sendContent();
        $content = ob_get_clean();

        $this->assertStringContainsString('previous_school', $content);
        $this->assertStringContainsString('medical_conditions', $content);
        $this->assertStringContainsString('allergies', $content);
        $this->assertStringContainsString('notes', $content);
        $this->assertStringContainsString('guardian_name', $content);
    }

    public function test_import_student_with_additional_information_fields(): void
    {
        $admin = User::where('email', 'admin@school.com')->first();

        // Delete test student if already exists from prior run
        $existing = Student::where('admission_number', 'ADMIMP001')->first();
        if ($existing) {
            $existing->forceDelete();
        }
        User::where('email', 'rohan.verma.import@example.com')->forceDelete();

        $csvData = "first_name,last_name,email,phone,admission_number,admission_date,class_id,section_id,academic_year_id,roll_number,date_of_birth,gender,blood_group,religion,caste,nationality,mother_tongue,status,address,city,state,country,postal_code,father_name,father_phone,father_occupation,mother_name,mother_phone,mother_occupation,guardian_name,guardian_phone,guardian_relation,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,previous_school,medical_conditions,allergies,notes\n" .
            "Rohan,Verma,rohan.verma.import@example.com,+91 98765 77001,ADMIMP001,2026-04-01,1,1,1,201,2015-03-10,male,A+,Hindu,General,Indian,Hindi,active,\"12, Park Street\",Kolkata,West Bengal,India,700016,Manoj Verma,+91 98765 88001,Architect,Rekha Verma,+91 98765 88002,Professor,,,,Manoj Verma,+91 98765 88001,Father,\"Modern High School\",None,Peanut Allergy,\"Member of school robotics club\"";

        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('students.csv', $csvData);

        $response = $this->actingAs($admin, 'sanctum')->post('/api/v1/students/import', [
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'imported_count' => 1,
            ]);

        $student = Student::where('admission_number', 'ADMIMP001')->first();
        $this->assertNotNull($student);
        $this->assertEquals('Modern High School', $student->previous_school);
        $this->assertEquals('Peanut Allergy', $student->allergies);
        $this->assertEquals('Member of school robotics club', $student->notes);
        $this->assertEquals('None', $student->medical_conditions);
        $this->assertEquals('Indian', $student->nationality);
        $this->assertEquals('Hindi', $student->mother_tongue);
        $this->assertEquals('Hindu', $student->religion);
    }
}

