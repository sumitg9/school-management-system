<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all users
        $users = User::all();

        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please run UserSeeder first.');
            return;
        }

        $notificationTypes = [
            [
                'type' => 'fee_reminder',
                'title' => 'Fee Payment Reminder',
                'message' => 'Your tuition fee payment is due on 30th April. Please make the payment to avoid late fees.',
                'data' => ['amount' => 15000, 'due_date' => '2024-04-30'],
            ],
            [
                'type' => 'exam_schedule',
                'title' => 'Exam Schedule Released',
                'message' => 'The schedule for First Term Exam has been released. Please check the exam dates.',
                'data' => ['exam_name' => 'First Term Exam', 'start_date' => '2024-05-15'],
            ],
            [
                'type' => 'assignment_due',
                'title' => 'Assignment Due Tomorrow',
                'message' => 'Your Mathematics Assignment 1 is due tomorrow. Please submit it on time.',
                'data' => ['assignment_title' => 'Mathematics Assignment 1', 'due_date' => '2025-10-13'],
            ],
            [
                'type' => 'result_published',
                'title' => 'Exam Results Published',
                'message' => 'Your First Term Exam results have been published. Check your report card now.',
                'data' => ['exam_name' => 'First Term Exam'],
            ],
            [
                'type' => 'attendance_alert',
                'title' => 'Low Attendance Alert',
                'message' => 'Your attendance is below 75%. Please ensure regular attendance to avoid issues.',
                'data' => ['attendance_percentage' => 72],
            ],
            [
                'type' => 'event_reminder',
                'title' => 'School Event Tomorrow',
                'message' => 'Annual Sports Day is scheduled for tomorrow. Please arrive by 8:00 AM.',
                'data' => ['event_name' => 'Annual Sports Day', 'date' => '2025-10-13', 'time' => '08:00 AM'],
            ],
            [
                'type' => 'library_due',
                'title' => 'Library Book Due',
                'message' => 'The book "Introduction to Physics" is due for return. Please return it to avoid fines.',
                'data' => ['book_name' => 'Introduction to Physics', 'due_date' => '2025-10-15'],
            ],
            [
                'type' => 'announcement',
                'title' => 'School Holiday Announcement',
                'message' => 'School will remain closed on 15th October due to a public holiday.',
                'data' => ['date' => '2025-10-15', 'reason' => 'Public Holiday'],
            ],
        ];

        // Create notifications for each user
        foreach ($users->take(10) as $user) {
            // Create 3-5 random notifications per user
            $count = rand(3, 5);

            for ($i = 0; $i < $count; $i++) {
                $notificationData = $notificationTypes[array_rand($notificationTypes)];

                $isRead = rand(0, 100) < 40; // 40% chance of being read

                Notification::create([
                    'user_id' => $user->id,
                    'type' => $notificationData['type'],
                    'title' => $notificationData['title'],
                    'message' => $notificationData['message'],
                    'data' => $notificationData['data'],
                    'is_read' => $isRead,
                    'read_at' => $isRead ? Carbon::now()->subDays(rand(1, 7)) : null,
                    'created_at' => Carbon::now()->subDays(rand(0, 14)),
                ]);
            }
        }

        $this->command->info('Notifications seeded successfully!');
    }
}
