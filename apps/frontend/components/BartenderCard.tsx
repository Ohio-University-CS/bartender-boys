import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { BartenderAvatar } from '@/components/BartenderAvatar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { webStyles } from '@/utils/web-styles';
import type { BartenderModelDefinition } from '@/constants/bartender-models';
import type { RealtimeVoice } from '@/contexts/settings';

type BartenderCardProps = {
  model: BartenderModelDefinition;
  voice: RealtimeVoice;
  isSelected: boolean;
  onSelect: () => void;
};

export function BartenderCard({ model, voice, isSelected, onSelect }: BartenderCardProps) {
  const backgroundColor = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const accent = useThemeColor({}, 'tint');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor, borderColor },
        isSelected && [styles.cardSelected, { borderColor: accent }],
        webStyles.hoverable,
        webStyles.shadow,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          <BartenderAvatar
            modelPath={model.asset}
            modelDefinition={model}
            isTalking={false}
          />
        </View>
      </View>
      <View style={styles.infoContainer}>
        <ThemedText type="defaultSemiBold" style={styles.modelName}>
          {model.label}
        </ThemedText>
        <ThemedText style={styles.voiceName} colorName="mutedForeground">
          {voice.charAt(0).toUpperCase() + voice.slice(1)} Voice
        </ThemedText>
        {model.notes && (
          <ThemedText style={styles.notes} colorName="mutedForeground">
            {model.notes}
          </ThemedText>
        )}
      </View>
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: accent }]}>
          <ThemedText style={styles.checkmarkText} colorName="onTint">
            ✓
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      web: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
      },
    }),
  },
  cardSelected: {
    borderWidth: 3,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        width: 120,
        height: 120,
        marginRight: 20,
      },
    }),
  },
  avatarWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderRadius: 60,
      },
    }),
  },
  infoContainer: {
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    marginBottom: 4,
    ...Platform.select({
      web: {
        fontSize: 20,
      },
    }),
  },
  voiceName: {
    fontSize: 14,
    marginBottom: 8,
    ...Platform.select({
      web: {
        fontSize: 15,
      },
    }),
  },
  notes: {
    fontSize: 12,
    lineHeight: 18,
    ...Platform.select({
      web: {
        fontSize: 13,
        lineHeight: 20,
      },
    }),
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        width: 36,
        height: 36,
        borderRadius: 18,
      },
    }),
  },
  checkmarkText: {
    fontSize: 20,
    fontWeight: 'bold',
    ...Platform.select({
      web: {
        fontSize: 22,
      },
    }),
  },
});

