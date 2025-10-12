<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Report Card</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            color: #333;
        }
        .header h2 {
            margin: 10px 0 0 0;
            font-size: 18px;
            color: #666;
        }
        .student-info {
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .student-info table {
            width: 100%;
        }
        .student-info td {
            padding: 5px;
            border: none;
        }
        .student-info .label {
            font-weight: bold;
            width: 150px;
        }
        .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .grades-table th {
            background-color: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        .grades-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        .grades-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .summary {
            margin-top: 30px;
            padding: 20px;
            background-color: #e8f5e9;
            border-radius: 5px;
            border-left: 5px solid #4CAF50;
        }
        .summary table {
            width: 100%;
        }
        .summary td {
            padding: 8px;
            font-size: 14px;
            border: none;
        }
        .summary .label {
            font-weight: bold;
            width: 200px;
        }
        .summary .value {
            text-align: right;
            font-weight: bold;
            color: #2e7d32;
        }
        .grade-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 16px;
        }
        .grade-A-plus { background-color: #4CAF50; color: white; }
        .grade-A { background-color: #8BC34A; color: white; }
        .grade-B-plus { background-color: #CDDC39; color: #333; }
        .grade-B { background-color: #FFEB3B; color: #333; }
        .grade-C-plus { background-color: #FFC107; color: #333; }
        .grade-C { background-color: #FF9800; color: white; }
        .grade-F { background-color: #F44336; color: white; }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }
        .signatures {
            margin-top: 50px;
            display: table;
            width: 100%;
        }
        .signature {
            display: table-cell;
            width: 33%;
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #333;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>REPORT CARD</h1>
        <h2>{{ $student->academicYear->name ?? 'Academic Year' }}</h2>
        <p>{{ $grades->first()->exam->name ?? 'Examination' }}</p>
    </div>

    <div class="student-info">
        <table>
            <tr>
                <td class="label">Student Name:</td>
                <td>{{ $student->first_name }} {{ $student->last_name }}</td>
                <td class="label">Admission No:</td>
                <td>{{ $student->admission_number }}</td>
            </tr>
            <tr>
                <td class="label">Class:</td>
                <td>{{ $student->class->name ?? 'N/A' }}</td>
                <td class="label">Section:</td>
                <td>{{ $student->section->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Date of Birth:</td>
                <td>{{ $student->date_of_birth ? \Carbon\Carbon::parse($student->date_of_birth)->format('d M Y') : 'N/A' }}</td>
                <td class="label">Roll Number:</td>
                <td>{{ $student->roll_number ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    <table class="grades-table">
        <thead>
            <tr>
                <th>Subject</th>
                <th style="text-align: center;">Total Marks</th>
                <th style="text-align: center;">Marks Obtained</th>
                <th style="text-align: center;">Percentage</th>
                <th style="text-align: center;">Grade</th>
            </tr>
        </thead>
        <tbody>
            @foreach($grades as $grade)
            <tr>
                <td>{{ $grade->subject->name ?? 'N/A' }}</td>
                <td style="text-align: center;">{{ $grade->total_marks }}</td>
                <td style="text-align: center;">{{ $grade->marks_obtained }}</td>
                <td style="text-align: center;">{{ $grade->percentage }}%</td>
                <td style="text-align: center;">
                    <span class="grade-badge grade-{{ str_replace('+', '-plus', $grade->grade) }}">
                        {{ $grade->grade }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="summary">
        <table>
            <tr>
                <td class="label">Total Marks:</td>
                <td class="value">{{ $totalMarks }}</td>
            </tr>
            <tr>
                <td class="label">Marks Obtained:</td>
                <td class="value">{{ $marksObtained }}</td>
            </tr>
            <tr>
                <td class="label">Percentage:</td>
                <td class="value">{{ $percentage }}%</td>
            </tr>
            <tr>
                <td class="label">Overall Grade:</td>
                <td class="value">
                    <span class="grade-badge grade-{{ str_replace('+', '-plus', $overallGrade) }}">
                        {{ $overallGrade }}
                    </span>
                </td>
            </tr>
        </table>
    </div>

    <div class="signatures">
        <div class="signature">
            <p>Class Teacher</p>
        </div>
        <div class="signature">
            <p>Principal</p>
        </div>
        <div class="signature">
            <p>Parent's Signature</p>
        </div>
    </div>

    <div class="footer">
        <p>Generated on: {{ $generated_at }}</p>
        <p>&copy; {{ date('Y') }} School Management System. All rights reserved.</p>
    </div>
</body>
</html>

