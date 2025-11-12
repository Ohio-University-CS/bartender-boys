import { Redirect } from 'expo-router';

// Defaults to the menu page when opening the app
export default function Index() {
  return <Redirect href="/(tabs)/menu" />;
}


