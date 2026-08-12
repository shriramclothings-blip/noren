import { useState, useEffect } from 'react';
import api from '../../../../../utils/api';

export const useVisitorLocations = (filters) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await api.get('/erp/utm/visitor-locations', { params: filters });
        setLocations(response.data.locations || []);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
        setLocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [filters]);

  return { locations, loading };
};
