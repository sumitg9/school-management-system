<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Students List</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        .badge {
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
        }
        .badge-active {
            background-color: #d4edda;
            color: #155724;
        }
        .badge-inactive {
            background-color: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Generated on: {{ $generated_at }}</p>
        <p>Total Students: {{ count($students) }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Admission No.</th>
                <th>Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Email</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($students as $index => $student)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $student->admission_number }}</td>
                <td>{{ $student->first_name }} {{ $student->last_name }}</td>
                <td>{{ $student->class->name ?? 'N/A' }}</td>
                <td>{{ $student->section->name ?? 'N/A' }}</td>
                <td>{{ $student->user->email ?? 'N/A' }}</td>
                <td>
                    <span class="badge badge-{{ $student->status }}">
                        {{ ucfirst($student->status) }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>&copy; {{ date('Y') }} School Management System. All rights reserved.</p>
    </div>
</body>
</html>

