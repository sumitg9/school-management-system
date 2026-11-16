import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const FeeTabs = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isStudent, isParent, hasPermission } = useAuth();
  const isPersonalView = isStudent() || isParent();

  const allTabs = [
    {
      name: isParent() ? "Child's Fee Schedule" : (isStudent() ? 'My Fee Obligations' : 'Fee Structures'),
      path: '/fees',
      icon: isPersonalView ? '📊' : '📋',
      active:
        currentPath === '/fees' ||
        (currentPath.startsWith('/fees/') &&
          !currentPath.startsWith('/fees/payment') &&
          !currentPath.startsWith('/fees/payments') &&
          !currentPath.includes('/payments')),
      description: isPersonalView ? 'Upcoming, paid & overdue fee schedule' : 'Fee structures & class tuition rules',
    },
    {
      name: 'Collect Fees / Payment',
      path: '/fees/payment',
      icon: '💳',
      permission: 'collect-fees',
      adminOnly: true,
      active:
        currentPath === '/fees/payment' ||
        currentPath === '/fees/collect',
      description: 'Single or advance multi-month fee collection',
    },
    {
      name: isParent() ? "Child's Receipts" : (isStudent() ? 'My Payment Receipts' : 'Payment Records'),
      path: '/fees/payments',
      icon: '🧾',
      active:
        currentPath === '/fees/payments' ||
        currentPath.includes('/payments'),
      description: isPersonalView ? 'Paid fee receipts and transaction breakdown' : 'Search, filter, and inspect past receipts',
    },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.adminOnly && isPersonalView) return false;
    if (tab.permission && (!hasPermission(tab.permission) || isPersonalView)) return false;
    return true;
  });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 mb-6">
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
            tab.active
              ? 'bg-blue-600 text-white shadow-sm font-semibold'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200'
          }`}
          title={tab.description}
        >
          <span className="text-base">{tab.icon}</span>
          <span>{tab.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default FeeTabs;

