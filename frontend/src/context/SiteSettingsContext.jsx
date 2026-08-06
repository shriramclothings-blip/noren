import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const SiteSettingsContext = createContext({});

const DEFAULTS = {
  hero_heading: 'Timeless By Design.',
  hero_subheading: 'Made For Every Journey.',
  hero_cta_text: 'Shop Now',
  hero_cta_link: '/shop',
  announcement_text: 'Free Shipping on Prepaid Orders &nbsp;&middot;&nbsp; Easy Returns',
  seo_title: 'NOREN - Timeless By Design. Premium Unisex Luxury Fashion.',
  seo_description: 'NOREN is a premium luxury unisex fashion house. Shop timeless clothing - Oversized T-Shirts, Shirts, Polo, Jeans, Jackets, Hoodies and Accessories. Crafted beyond trends.',
  seo_keywords: 'NOREN, luxury fashion, premium clothing, unisex fashion, timeless design, oversized t-shirts, luxury shirts, premium jeans, designer hoodies',
  footer_description: 'NOREN creates timeless clothing designed for confidence, individuality and everyday elegance. A luxury unisex fashion house, crafted beyond trends.',
  footer_phone: '+91 79846 26447',
  footer_email: 'supportnoren1@gmail.com',
  footer_whatsapp: '917984626447',
  footer_address: 'Silver Square Link, Near Sravan Choukdi, Bharuch, Gujarat - 392001, India',
  footer_maps_url: 'https://maps.google.com/?q=Bharuch,Gujarat,India',
  footer_hours: 'Mon - Sat: 9:00 AM to 8:00 PM',
  footer_instagram: 'https://www.instagram.com/norenfashion',
  footer_facebook: 'https://facebook.com/norenfashion',
  footer_youtube: 'https://youtube.com/@norenfashion',
};

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded]     = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/homepage/settings');
      const data = res.data || {};
      setSettings({ ...DEFAULTS, ...data });
    } catch {
      // Keep defaults on error — do not crash
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (!loaded) return;
    // NOTE: document.title is managed by SeoManager per-page.
    // Only update meta description here from CMS settings.
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', settings.seo_description || DEFAULTS.seo_description);
  }, [settings, loaded]);

  return (
    <SiteSettingsContext.Provider value={{ settings, fetchSettings, loaded }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
