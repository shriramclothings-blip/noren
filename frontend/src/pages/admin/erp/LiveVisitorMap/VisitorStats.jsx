import { Users, Globe, BarChart3, TrendingUp } from 'lucide-react';

export default function VisitorStats({ stats, loading }) {
  const cards = [
    {
      label: 'Total Visitors',
      value: stats.total,
      icon: Users,
      color: '#3b82f6',
      bgColor: '#dbeafe',
      trend: '+12.6%',
    },
    {
      label: 'Live Visitors',
      value: 156,
      icon: Users,
      color: '#10b981',
      bgColor: '#dcfce7',
      trend: '+8.3%',
      live: true,
    },
    {
      label: 'Countries',
      value: stats.countries,
      icon: Globe,
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      trend: '+1',
    },
    {
      label: 'Total Clicks',
      value: stats.totalClicks,
      icon: BarChart3,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      trend: '+13.7%',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: '#ec4899',
      bgColor: '#fce7f3',
      trend: '+0.8%',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #f3f4f6',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={20} color={card.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {card.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {loading ? '—' : card.value}
                </div>
                {card.live && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#10b981',
                      background: '#dcfce7',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                    Live
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                {card.trend}
              </div>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
