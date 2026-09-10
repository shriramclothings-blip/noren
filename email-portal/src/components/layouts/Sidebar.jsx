import { NavLink } from 'react-router-dom'
import { 
  MdDashboard, MdEdit, MdInbox, MdSend, MdDrafts, 
  MdDescription, MdCampaign, MdContacts, MdPeople,
  MdAnalytics, MdAutorenew, MdSettings, MdEmail, MdSchedule
} from 'react-icons/md'
import useAuthStore from '@/store/authStore'
import useEmailStore from '@/store/emailStore'

const Sidebar = () => {
  const user = useAuthStore(state => state.user)
  const hasMarketingAccess = useAuthStore(state => state.hasMarketingAccess())
  const isAdmin = useAuthStore(state => state.isAdmin())
  const sidebarOpen = useEmailStore(state => state.sidebarOpen)

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: MdDashboard,
      show: true
    },
    {
      name: 'Compose',
      href: '/compose',
      icon: MdEdit,
      show: hasMarketingAccess
    },
    {
      name: 'Inbox',
      href: '/inbox',
      icon: MdInbox,
      show: true
    },
    {
      name: 'Sent',
      href: '/sent',
      icon: MdSend,
      show: true
    },
    {
      name: 'Drafts',
      href: '/drafts',
      icon: MdDrafts,
      show: true
    },
    {
      type: 'divider',
      show: hasMarketingAccess
    },
    {
      type: 'heading',
      name: 'Marketing',
      show: hasMarketingAccess
    },
    {
      name: 'Templates',
      href: '/templates',
      icon: MdDescription,
      show: hasMarketingAccess
    },
    {
      name: 'Campaigns',
      href: '/campaigns',
      icon: MdCampaign,
      show: hasMarketingAccess
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: MdContacts,
      show: hasMarketingAccess
    },
    {
      name: 'Segments',
      href: '/segments',
      icon: MdPeople,
      show: hasMarketingAccess
    },
    {
      type: 'divider',
      show: hasMarketingAccess
    },
    {
      type: 'heading',
      name: 'Insights',
      show: hasMarketingAccess
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: MdAnalytics,
      show: hasMarketingAccess
    },
    {
      name: 'Automation',
      href: '/automation',
      icon: MdAutorenew,
      show: hasMarketingAccess
    },
    {
      name: 'Scheduled Broadcasts',
      href: '/broadcasts',
      icon: MdSchedule,
      show: hasMarketingAccess
    },
    {
      type: 'divider',
      show: isAdmin
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: MdSettings,
      show: isAdmin
    }
  ]

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <MdEmail className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">NOREN Email</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.filter(item => item.show).map((item, index) => {
          if (item.type === 'divider') {
            return <div key={`divider-${index}`} className="my-2 border-t border-gray-200" />
          }

          if (item.type === 'heading') {
            return (
              <div key={`heading-${index}`} className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {item.name}
              </div>
            )
          }

          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar