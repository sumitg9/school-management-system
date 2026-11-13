const DashboardContent = () => {
  const stats = [
    { label: 'Total Students', value: '1,245', icon: '👨‍🎓', color: 'blue', change: '+12%' },
    { label: 'Total Teachers', value: '87', icon: '👨‍🏫', color: 'green', change: '+3%' },
    { label: 'Attendance Today', value: '94.5%', icon: '📊', color: 'yellow', change: '+2.1%' },
    { label: 'Fee Collection', value: '₹45.2K', icon: '💰', color: 'red', change: '+8%' },
  ];

  const recentActivities = [
    { icon: '✅', text: 'New student admission: Aarohi Verma', time: '5 min ago', color: 'green' },
    { icon: '📝', text: 'Exam results published for Class 10', time: '1 hour ago', color: 'blue' },
    { icon: '💵', text: 'Fee payment received: ₹500', time: '2 hours ago', color: 'yellow' },
    { icon: '📢', text: 'New announcement posted', time: '3 hours ago', color: 'purple' },
  ];

  const upcomingEvents = [
    { title: 'Parent-Teacher Meeting', date: 'Oct 15, 2025', time: '10:00 AM' },
    { title: 'Annual Sports Day', date: 'Oct 20, 2025', time: '9:00 AM' },
    { title: 'Mid-term Examinations', date: 'Oct 25, 2025', time: '8:00 AM' },
  ];

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{stat.icon}</span>
              <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                {stat.change}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Overview</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Chart will be displayed here</p>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start">
                <span className="text-2xl mr-3">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingEvents.map((event, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <h4 className="font-semibold text-gray-800 mb-2">{event.title}</h4>
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-4">📅 {event.date}</span>
                <span>🕐 {event.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;

