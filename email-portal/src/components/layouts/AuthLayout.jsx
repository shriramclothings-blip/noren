import { Link } from 'react-router-dom'
import { MdEmail } from 'react-icons/md'

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Brand */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center space-x-2 mb-2">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <MdEmail className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            NOREN Email Portal
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Professional Email Marketing & Operations
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="card">
          <div className="card-body">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} NOREN Fashion. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy" className="hover:text-primary-600">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary-600">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout