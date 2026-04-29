import { NavigationContainer } from "@react-navigation/native";

import ClientsStackNavigator from "./ClientsStackNavigator";

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <ClientsStackNavigator />
    </NavigationContainer>
  );
}
