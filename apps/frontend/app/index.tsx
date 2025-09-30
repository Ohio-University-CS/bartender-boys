import { Redirect } from 'expo-router';

// Defaults to the auth page when opening the app
export default function Index() {
  return <Redirect href="/auth" />;
}


