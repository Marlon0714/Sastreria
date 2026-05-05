import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { MeasurementCard } from "./MeasurementCard";

interface MeasurementGridSectionProps {
  title: string;
  children: React.ReactNode;
}

export function MeasurementGridSection({
  title,
  children,
}: MeasurementGridSectionProps) {
  const { width } = useWindowDimensions();

  const CARD_MIN = 148;
  const GAP = 8;
  const PADDING = 32;
  const cols = Math.max(2, Math.min(4, Math.floor((width - PADDING) / (CARD_MIN + GAP))));
  const cardWidth = (width - PADDING - GAP * (cols - 1)) / cols;

  const clonedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === MeasurementCard) {
      return React.cloneElement(child as React.ReactElement<{ cardWidth?: number }>, {
        cardWidth,
      });
    }
    return child;
  });

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.separator} />
      <View style={styles.cardsContainer}>{clonedChildren}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "bold",
    color: "#475569",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  separator: {
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
