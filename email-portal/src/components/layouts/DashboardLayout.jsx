import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import useEmailStore from '@/store/emailStore'

const DashboardLayout = ({ children }) => {
  const sidebarOpen = useEmailStore(state => state.sidebarOpen)

  // Close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        useEmailStore.setState({ sidebarOpen: false })
      } else {
        useEmailStore.setState({ sidebarOpen: true })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container-custom py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => useEmailStore.setState({ sidebarOpen: false })}
        />
      )}
    </div>
  )
}

export default DashboardLayout