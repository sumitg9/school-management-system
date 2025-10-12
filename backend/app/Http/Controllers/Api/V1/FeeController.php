<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use App\Models\FeePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class FeeController extends Controller
{
    /**
     * Display fee structures
     */
    public function indexStructures(Request $request)
    {
        $query = FeeStructure::with(['academicYear', 'class']);

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all') {
            $feeStructures = $query->get();
            return response()->json([
                'success' => true,
                'data' => $feeStructures,
            ]);
        }

        $feeStructures = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $feeStructures->items(),
            'meta' => [
                'current_page' => $feeStructures->currentPage(),
                'total_pages' => $feeStructures->lastPage(),
                'per_page' => $feeStructures->perPage(),
                'total' => $feeStructures->total(),
            ],
        ]);
    }

    /**
     * Create fee structure
     */
    public function storeStructure(Request $request)
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'class_id' => 'required|exists:classes,id',
            'name' => 'required|string|max:100',
            'type' => 'required|in:tuition,transport,library,sports,exam,other',
            'amount' => 'required|numeric|min:0',
            'frequency' => 'required|in:one-time,monthly,quarterly,half-yearly,yearly',
            'due_date' => 'nullable|date',
            'is_mandatory' => 'nullable|boolean',
        ]);

        $feeStructure = FeeStructure::create([
            'academic_year_id' => $request->academic_year_id,
            'class_id' => $request->class_id,
            'name' => $request->name,
            'type' => $request->type,
            'amount' => $request->amount,
            'frequency' => $request->frequency,
            'due_date' => $request->due_date,
            'is_mandatory' => $request->is_mandatory ?? true,
            'description' => $request->description,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Fee structure created successfully',
            'data' => $feeStructure,
        ], 201);
    }

    /**
     * Display fee payments
     */
    public function indexPayments(Request $request)
    {
        $query = FeePayment::with(['student', 'feeStructure', 'collectedBy']);

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('fee_structure_id')) {
            $query->where('fee_structure_id', $request->fee_structure_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('payment_date', [$request->start_date, $request->end_date]);
        }

        $query->orderBy('payment_date', 'desc');

        $perPage = $request->get('per_page', 20);

        if ($perPage === 'all') {
            $payments = $query->get();
            return response()->json([
                'success' => true,
                'data' => $payments,
            ]);
        }

        $payments = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $payments->items(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'total_pages' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Collect fee payment
     */
    public function collectPayment(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'fee_structure_id' => 'required|exists:fee_structures,id',
            'amount' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'fine' => 'nullable|numeric|min:0',
            'payment_date' => 'required|date',
            'payment_method' => 'required|in:cash,check,card,online,bank-transfer',
            'transaction_id' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        $amount = $request->amount;
        $discount = $request->discount ?? 0;
        $fine = $request->fine ?? 0;
        $totalAmount = $amount - $discount + $fine;

        // Generate receipt number
        $receiptNumber = 'RCP-' . date('Ymd') . '-' . str_pad(FeePayment::count() + 1, 6, '0', STR_PAD_LEFT);

        $payment = FeePayment::create([
            'student_id' => $request->student_id,
            'fee_structure_id' => $request->fee_structure_id,
            'receipt_number' => $receiptNumber,
            'amount' => $amount,
            'discount' => $discount,
            'fine' => $fine,
            'total_amount' => $totalAmount,
            'payment_date' => $request->payment_date,
            'payment_method' => $request->payment_method,
            'transaction_id' => $request->transaction_id,
            'remarks' => $request->remarks,
            'status' => 'completed',
            'collected_by' => auth()->id(),
        ]);

        $payment->load(['student', 'feeStructure']);

        return response()->json([
            'success' => true,
            'message' => 'Payment collected successfully',
            'data' => $payment,
        ], 201);
    }

    /**
     * Get fee statistics
     */
    public function statistics(Request $request)
    {
        $query = FeePayment::query();

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('payment_date', [$request->start_date, $request->end_date]);
        }

        $stats = [
            'total_collected' => $query->where('status', 'completed')->sum('total_amount'),
            'total_discount' => $query->where('status', 'completed')->sum('discount'),
            'total_fine' => $query->where('status', 'completed')->sum('fine'),
            'total_transactions' => $query->where('status', 'completed')->count(),
            'by_payment_method' => FeePayment::select('payment_method', DB::raw('SUM(total_amount) as total'))
                ->where('status', 'completed')
                ->groupBy('payment_method')
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get student fee details
     */
    public function getStudentFees($studentId)
    {
        $payments = FeePayment::where('student_id', $studentId)
            ->with(['feeStructure'])
            ->orderBy('payment_date', 'desc')
            ->get();

        $totalPaid = $payments->where('status', 'completed')->sum('total_amount');
        $totalDiscount = $payments->where('status', 'completed')->sum('discount');
        $totalFine = $payments->where('status', 'completed')->sum('fine');

        return response()->json([
            'success' => true,
            'data' => [
                'payments' => $payments,
                'summary' => [
                    'total_paid' => $totalPaid,
                    'total_discount' => $totalDiscount,
                    'total_fine' => $totalFine,
                ],
            ],
        ]);
    }

    /**
     * Generate fee receipt PDF
     */
    public function generateReceipt($paymentId)
    {
        $payment = FeePayment::with(['student.user', 'student.class', 'student.section', 'feeStructure', 'collectedBy'])
            ->findOrFail($paymentId);

        $pdf = Pdf::loadView('pdf.fee-receipt', [
            'payment' => $payment,
            'generated_at' => now()->format('d M Y, h:i A'),
        ]);

        return $pdf->download('fee-receipt-' . $payment->receipt_number . '.pdf');
    }
}

