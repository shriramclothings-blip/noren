import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MdEmail, MdArrowBack } from 'react-icons/md'
import authService from '@/services/authService'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setError('Email is required')
      return
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid')
      return
    }
    
    setLoading(true)
    
    try {
      await authService.forgotPassword(email)
      setSubmitted(true)
      toast.success('Password reset link sent to your email')
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error(error.message || 'Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MdEmail className="w-8 h-8 text-success-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-600 mb-6">
          We've sent a password reset link to <strong>{email}</strong>
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setSubmitted(false)}
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            try again
          </button>
        </p>
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 font-medium"
        >
          <MdArrowBack className="mr-2" />
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h2>
      <p className="text-sm text-gray-600 mb-6">
        Enter your email address and we'll send you a link to reset your password
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          error={error}
          placeholder="you@example.com"
          icon={<MdEmail className="h-5 w-5 text-gray-400" />}
          required
          fullWidth
          autoComplete="email"
        />

        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          fullWidth
        >
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 font-medium"
        >
          <MdArrowBack className="mr-2" />
          Back to login
        </Link>
      </div>
    </div>
  )
}

export default ForgotPassword