<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fee Receipt</title>
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
        .receipt-info {
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .receipt-info table {
            width: 100%;
        }
        .receipt-info td {
            padding: 8px;
            border: none;
        }
        .receipt-info .label {
            font-weight: bold;
            width: 180px;
        }
        .payment-details {
            margin-top: 30px;
            border: 2px solid #333;
            border-radius: 5px;
            overflow: hidden;
        }
        .payment-details .header-row {
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            font-size: 16px;
            font-weight: bold;
        }
        .payment-details table {
            width: 100%;
            border-collapse: collapse;
        }
        .payment-details td {
            padding: 12px 15px;
            border-bottom: 1px solid #ddd;
        }
        .payment-details .label {
            font-weight: bold;
            width: 200px;
            background-color: #f9f9f9;
        }
        .payment-details .value {
            text-align: right;
        }
        .total-row {
            background-color: #e8f5e9;
            font-weight: bold;
            font-size: 16px;
        }
        .total-row td {
            border-bottom: none;
            padding: 15px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        .status-completed {
            background-color: #d4edda;
            color: #155724;
        }
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(76, 175, 80, 0.1);
            font-weight: bold;
            z-index: -1;
        }
        .signature {
            margin-top: 60px;
            text-align: right;
            padding-right: 50px;
        }
        .signature-line {
            display: inline-block;
            width: 200px;
            border-top: 1px solid #333;
            margin-top: 50px;
            text-align: center;
            padding-top: 5px;
        }
    </style>
</head>
<body>
    <div class="watermark">PAID</div>

    <div class="header">
        <h1>FEE RECEIPT</h1>
        <h2>School Management System</h2>
    </div>

    <div class="receipt-info">
        <table>
            <tr>
                <td class="label">Receipt Number:</td>
                <td><strong>{{ $payment->receipt_number }}</strong></td>
                <td class="label">Payment Date:</td>
                <td>{{ \Carbon\Carbon::parse($payment->payment_date)->format('d M Y') }}</td>
            </tr>
            <tr>
                <td class="label">Student Name:</td>
                <td>{{ $payment->student->first_name }} {{ $payment->student->last_name }}</td>
                <td class="label">Admission No:</td>
                <td>{{ $payment->student->admission_number }}</td>
            </tr>
            <tr>
                <td class="label">Class:</td>
                <td>{{ $payment->student->class->name ?? 'N/A' }}</td>
                <td class="label">Section:</td>
                <td>{{ $payment->student->section->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Email:</td>
                <td>{{ $payment->student->user->email ?? 'N/A' }}</td>
                <td class="label">Phone:</td>
                <td>{{ $payment->student->user->phone ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    <div class="payment-details">
        <div class="header-row">
            Payment Details
        </div>
        <table>
            <tr>
                <td class="label">Fee Type:</td>
                <td class="value">{{ $payment->feeStructure->name ?? 'N/A' }} ({{ ucfirst($payment->feeStructure->type ?? 'N/A') }})</td>
            </tr>
            <tr>
                <td class="label">Fee Amount:</td>
                <td class="value">₹{{ number_format($payment->amount, 2) }}</td>
            </tr>
            @if($payment->discount > 0)
            <tr>
                <td class="label">Discount:</td>
                <td class="value" style="color: #4CAF50;">- ₹{{ number_format($payment->discount, 2) }}</td>
            </tr>
            @endif
            @if($payment->fine > 0)
            <tr>
                <td class="label">Fine/Late Fee:</td>
                <td class="value" style="color: #F44336;">+ ₹{{ number_format($payment->fine, 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td class="label">Total Amount Paid:</td>
                <td class="value" style="color: #2e7d32; font-size: 18px;">₹{{ number_format($payment->total_amount, 2) }}</td>
            </tr>
            <tr>
                <td class="label">Payment Method:</td>
                <td class="value">{{ ucfirst(str_replace('-', ' ', $payment->payment_method)) }}</td>
            </tr>
            @if($payment->transaction_id)
            <tr>
                <td class="label">Transaction ID:</td>
                <td class="value">{{ $payment->transaction_id }}</td>
            </tr>
            @endif
            <tr>
                <td class="label">Status:</td>
                <td class="value">
                    <span class="status-badge status-{{ $payment->status }}">
                        {{ ucfirst($payment->status) }}
                    </span>
                </td>
            </tr>
            @if($payment->remarks)
            <tr>
                <td class="label">Remarks:</td>
                <td class="value">{{ $payment->remarks }}</td>
            </tr>
            @endif
            <tr>
                <td class="label">Collected By:</td>
                <td class="value">{{ $payment->collectedBy->name ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    <div class="signature">
        <div class="signature-line">
            Authorized Signature
        </div>
    </div>

    <div class="footer">
        <p><strong>Note:</strong> This is a computer-generated receipt and does not require a physical signature.</p>
        <p>For any queries, please contact the school office.</p>
        <p>Generated on: {{ $generated_at }}</p>
        <p>&copy; {{ date('Y') }} School Management System. All rights reserved.</p>
    </div>
</body>
</html>

