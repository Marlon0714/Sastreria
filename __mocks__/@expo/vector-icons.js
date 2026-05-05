// Mock for @expo/vector-icons in Jest
const React = require("react");

const mockIcon = (displayName) => {
  const Icon = ({ name, size, color, ...rest }) =>
    React.createElement("View", { testID: `icon-${name}`, ...rest });
  Icon.displayName = displayName;
  return Icon;
};

module.exports = {
  Ionicons: mockIcon("Ionicons"),
  MaterialIcons: mockIcon("MaterialIcons"),
  FontAwesome: mockIcon("FontAwesome"),
  AntDesign: mockIcon("AntDesign"),
  Entypo: mockIcon("Entypo"),
  Feather: mockIcon("Feather"),
  MaterialCommunityIcons: mockIcon("MaterialCommunityIcons"),
};
