import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SYSTEM_ROLES } from '../../utils/permissionRules';

/**
 * Route guard component that checks whether the authenticated user has
 * the required permission. If not, displays an alert dialog stating:
 * "You don't have permission to view this page" and options to return.
 */
const PermissionRoute = ({ permission, children }) => {
  const { hasPermission, activeRole, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Super-admin always has access; otherwise check required permission
  const isAllowed = isSuperAdmin() || !permission || hasPermission(permission);

  if (!isAllowed) {
    const roleObj = SYSTEM_ROLES.find(r => r.id === activeRole);

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-labelledby="access-denied-title"
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-red-200 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Lock Icon Badge */}
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl shadow-inner">
            🔒
          </div>

          <h3 id="access-denied-title" className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h3>

          <p className="text-sm text-gray-700 mb-5 font-semibold">
            You don't have permission to view this page.
          </p>

          <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl mb-6 text-xs text-red-900 text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Your Role:</span>
              <span className="font-bold text-gray-900">{roleObj?.badge || activeRole || 'Student'}</span>
            </div>
            {permission && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Required:</span>
                <code className="bg-red-100 px-2 py-0.5 rounded text-[11px] font-mono text-red-800 font-bold">
                  {permission}
                </code>
              </div>
            )}
            <p className="text-[11px] text-red-700 pt-1 leading-relaxed border-t border-red-200/60 mt-1">
              If you require access to this section, please contact a school administrator.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              ← Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default PermissionRoute;
