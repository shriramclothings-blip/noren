import { Component } from 'react'
import Button from './Button'
import { MdError, MdRefresh } from 'react-icons/md'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
    window.location.href = '/'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <MdError className="w-10 h-10 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6 text-left bg-gray-50 rounded p-4 text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="whitespace-pre-wrap text-gray-600 overflow-auto max-h-48">
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                icon={<MdRefresh />}
                variant="outline"
              >
                Reload Page
              </Button>
              <Button onClick={this.handleReset}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
