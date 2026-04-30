import { NavigationContainer } from "@react-navigation/native";

import FeatureTabsNavigator from "./FeatureTabsNavigator";

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <FeatureTabsNavigator />
    </NavigationContainer>
  );
}
