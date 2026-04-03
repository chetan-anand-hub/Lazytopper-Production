import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { LTSubjectKey } from "@/data/types";

interface Props {
  selected: LTSubjectKey;
  onChange: (subject: LTSubjectKey) => void;
}

export function SubjectToggle({ selected, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.muted }]}>
      <Pressable
        onPress={() => onChange("Maths")}
        style={[
          styles.option,
          selected === "Maths" && { backgroundColor: colors.card },
        ]}
      >
        <Feather
          name="triangle"
          size={16}
          color={selected === "Maths" ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.label,
            { color: selected === "Maths" ? colors.foreground : colors.mutedForeground },
          ]}
        >
          Maths
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("Science")}
        style={[
          styles.option,
          selected === "Science" && { backgroundColor: colors.card },
        ]}
      >
        <Feather
          name="zap"
          size={16}
          color={selected === "Science" ? colors.secondary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.label,
            { color: selected === "Science" ? colors.foreground : colors.mutedForeground },
          ]}
        >
          Science
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
