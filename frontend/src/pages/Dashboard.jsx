import { useState } from 'react';

const Dashboard = () => {

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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-blue-800 to-indigo-900 text-white transition-all duration-300 flex-shrink-0`}>
        <div className="p-6">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <h1 className="text-lg font-bold">SMS</h1>
                <p className="text-xs text-blue-200">Admin Panel</p>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            <Link to="/" className="flex items-center px-4 py-3 bg-blue-700 rounded-lg">
              <span className="text-xl">🏠</span>
              {sidebarOpen && <span className="ml-3">Dashboard</span>}
            </Link>
            <Link to="/students" className="flex items-center px-4 py-3 hover:bg-blue-700 rounded-lg transition">
              <span className="text-xl">👨‍🎓</span>
              {sidebarOpen && <span className="ml-3">Students</span>}
            </Link>
            <a href="#" className="flex items-center px-4 py-3 hover:bg-blue-700 rounded-lg transition">
              <span className="text-xl">👨‍🏫</span>
              {sidebarOpen && <span className="ml-3">Teachers</span>}
            </a>
            <a href="#" className="flex items-center px-4 py-3 hover:bg-blue-700 rounded-lg transition">
              <span className="text-xl">📚</span>
              {sidebarOpen && <span className="ml-3">Academic</span>}
            </a>
            <a href="#" className="flex items-center px-4 py-3 hover:bg-blue-700 rounded-lg transition">
              <span className="text-xl">💵</span>
              {sidebarOpen && <span className="ml-3">Fees</span>}
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 text-gray-600 hover:text-gray-800"
              >
                <span className="text-2xl">☰</span>
              </button>
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative text-gray-600 hover:text-gray-800">
                <span className="text-2xl">🔔</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center cursor-pointer" onClick={handleLogout}>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">
                    {user?.roles?.[0]?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <div key={index} className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-${stat.color}-500`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">{stat.icon}</span>
                  <span className={`text-sm font-semibold text-${stat.color}-600 bg-${stat.color}-100 px-2 py-1 rounded`}>
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
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fee Collection Chart and Upcoming Events */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fee Collection Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Fee Collection</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart will be displayed here</p>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {upcomingEvents.map((event, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="font-semibold text-gray-800">{event.title}</p>
                    <p className="text-sm text-gray-600">{event.date}</p>
                    <p className="text-xs text-gray-500">{event.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

