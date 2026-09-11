import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDrawerStatus } from 'expo-router/drawer';
import { ProfileTable, refreshProfilePhoto, useProfilePhoto } from '../lib/profilePhotos';

export function useDrawerProfilePhoto(table: ProfileTable, id: string | undefined, initial: string | null | undefined) {
  const status = useDrawerStatus();
  const photo = useProfilePhoto(table, id, initial);

  useEffect(() => {
    if (!id || status !== 'open') return;
    const refresh = () => {
      void refreshProfilePhoto(table, id).catch(error => {
        console.warn('Unable to refresh profile photo:', error);
      });
    };
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [table, id, status]);

  return photo;
}
