import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { TabHeader } from '@/components/tab-header';
import { BartenderCard } from '@/components/BartenderCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSettings, isRealtimeVoice } from '@/contexts/settings';
import type { RealtimeVoice } from '@/contexts/settings';
import { BARTENDER_MODEL_REGISTRY } from '@/constants/bartender-models';
import { webStyles } from '@/utils/web-styles';

// Map bartender model ids to a realtime voice key
const MODEL_VOICE_MAP: Record<string, RealtimeVoice> = {
  classic: 'alloy',
  luisa: 'ash',
  elizabeth: 'ballad',
  mike: 'coral',
  robo: 'echo',
  ironman: 'sage',
  makayla: 'shimmer',
  martin: 'verse',
  matt: 'marin',
  noir: 'cedar',
};

export default function BartenderSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { bartenderModel, setBartenderModel, setRealtimeVoice } = useSettings();

  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Bartender Selection';
    }
  }, []);

  const handleSelectModel = (modelId: string) => {
    setBartenderModel(modelId as any);
    const mappedVoice = MODEL_VOICE_MAP[modelId];
    if (mappedVoice && isRealtimeVoice(mappedVoice)) {
      setRealtimeVoice(mappedVoice);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <TabHeader title="Select Bartender" />
      
      <ScrollView 
        contentContainerStyle={styles.containerContent}
        style={webStyles.smoothScroll}
      >
        <ThemedText style={styles.description} colorName="mutedForeground">
          Choose your bartender. Each model is paired with a unique voice.
        </ThemedText>

        {BARTENDER_MODEL_REGISTRY.map((model) => {
          const mappedVoice = MODEL_VOICE_MAP[model.id];
          const voice = mappedVoice && isRealtimeVoice(mappedVoice) ? mappedVoice : 'alloy';
          const isSelected = bartenderModel === model.id;

          return (
            <BartenderCard
              key={model.id}
              model={model}
              voice={voice}
              isSelected={isSelected}
              onSelect={() => handleSelectModel(model.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    padding: 16,
    paddingBottom: 24,
    ...Platform.select({
      web: {
        padding: 24,
        paddingBottom: 40,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      },
    }),
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    ...Platform.select({
      web: {
        fontSize: 15,
        marginBottom: 32,
        lineHeight: 22,
      },
    }),
  },
});

