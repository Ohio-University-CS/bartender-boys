import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';

// Bartender avatar component
function BartenderImage() {
  return (
    <View style={styles.bartenderSvg}>
      {/* Head */}
      <View style={styles.head} />
      
      {/* Hair */}
      <View style={styles.hair} />
      
      {/* Eyes */}
      <View style={[styles.eye, { left: 55 }]} />
      <View style={[styles.eye, { right: 55 }]} />
      
      {/* Smile */}
      <View style={styles.smile} />
      
      {/* Mustache */}
      <View style={styles.mustache} />
      
      {/* Bow tie */}
      <View style={styles.bowTie}>
        <View style={styles.bowTieLeft} />
        <View style={styles.bowTieCenter} />
        <View style={styles.bowTieRight} />
      </View>
      
      {/* Vest badge */}
      <View style={styles.vest}>
        <Text style={styles.vestText}>🍸</Text>
      </View>
    </View>
  );
}

// Animated bartender avatar with image and equalizer bars
function BartenderAvatar({ active }: { active: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const bars = [
    useRef(new Animated.Value(8)).current,
    useRef(new Animated.Value(12)).current,
    useRef(new Animated.Value(10)).current,
    useRef(new Animated.Value(14)).current,
    useRef(new Animated.Value(9)).current,
  ];

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [active, pulse]);

  useEffect(() => {
    const loops = bars.map((v, i) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 18 + (i * 2), duration: 250 + i * 50, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(v, { toValue: 6 + i, duration: 200 + i * 40, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ])
      );
    });
    if (active) loops.forEach(l => l.start());
    else {
      loops.forEach(l => l.stop());
      bars.forEach((v, i) => v.setValue(8 + i * 2));
    }
    return () => loops.forEach(l => l.stop());
  }, [active]);

  return (
    <View style={styles.avatarContainer}>
      <Animated.View style={[styles.avatarCircle, { transform: [{ scale: pulse }] }]}>
        <BartenderImage />
        {active && (
          <View style={styles.eqOverlay}>
            <View style={styles.eqRow}>
              {bars.map((v, idx) => (
                <Animated.View key={idx} style={[styles.eqBar, { height: v }]} />
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default function BartenderModal() {
  const router = useRouter();
  const { apiBaseUrl } = useSettings();
  const base = apiBaseUrl || API_BASE_URL;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hey! I'm your bartender. What can I help you with today?" },
  ]);
  const scrollRef = useRef<ScrollView>(null);

  // Web Speech API for microphone + TTS on web
  const recognitionRef = useRef<any>(null);
  const supportsWebSpeech = typeof window !== 'undefined' && (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));
  const supportsSpeechSynthesis = typeof window !== 'undefined' && !!window.speechSynthesis;

  const startListeningWeb = useCallback(() => {
    if (!supportsWebSpeech) return;
    try {
      const Rec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new Rec();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript as string;
        if (transcript) {
          setMessages((m) => [...m, { role: 'user', content: transcript }]);
          void sendToBartender(transcript);
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch (error) {
      console.error('Speech recognition error:', error);
      setListening(false);
    }
  }, [supportsWebSpeech]);

  const speakWeb = useCallback((text: string) => {
    if (!supportsSpeechSynthesis) return;
    try {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {}
  }, [supportsSpeechSynthesis]);

  const sendToBartender = useCallback(async (content: string) => {
    try {
      const res = await fetch(`${base}/chat/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a friendly, knowledgeable bartender. Give concise, helpful cocktail advice and recommendations. Keep responses conversational and brief.' },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ]
        })
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const reply = data?.reply || "I'm here to help with any drink questions!";
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      if (Platform.OS === 'web') speakWeb(reply);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I had trouble with that. Could you try again?' }]);
    }
  }, [base, messages, speakWeb]);

  const onMicPress = () => {
    if (Platform.OS === 'web') {
      if (!supportsWebSpeech) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'Voice input is not supported in this browser. Try Chrome or Edge on desktop.' },
        ]);
        return;
      }
      if (listening) {
        try { recognitionRef.current?.stop?.(); } catch {}
        setListening(false);
      } else {
        startListeningWeb();
      }
    } else {
      // Native: coming soon
      setMessages((m) => [...m, { role: 'assistant', content: 'Voice chat is coming soon on mobile! For now, try the website.' }]);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <View style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Talk to Bartender</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Bartender avatar */}
      <BartenderAvatar active={speaking || listening} />

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, m.role === 'user' && styles.userBubbleText]}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Microphone button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onMicPress}
          style={[styles.micBtn, listening && styles.micActive]}
          activeOpacity={0.7}
          accessibilityLabel="Voice input"
        >
          <Ionicons name={listening ? "stop-circle" : "mic"} size={32} color="#000" />
        </TouchableOpacity>
        <Text style={styles.micHint}>
          {listening ? 'Listening... Tap to stop' : speaking ? 'Bartender is speaking...' : 'Tap to speak'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0C0C0C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 16 : 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0C0C0C',
  },
  closeBtn: { 
    padding: 8,
    backgroundColor: '#FFA500',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#FFA500', fontSize: 18, fontWeight: '700' },
  avatarContainer: { alignItems: 'center', paddingVertical: 32 },
  avatarCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1a1a1a',
    borderWidth: 4,
    borderColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bartenderSvg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFD4A3',
    position: 'absolute',
    top: 30,
  },
  hair: {
    width: 75,
    height: 30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: '#3D2817',
    position: 'absolute',
    top: 25,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C2416',
    position: 'absolute',
    top: 55,
  },
  smile: {
    width: 30,
    height: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#2C2416',
    position: 'absolute',
    top: 75,
  },
  mustache: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3D2817',
    position: 'absolute',
    top: 68,
  },
  bowTie: {
    position: 'absolute',
    top: 105,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bowTieLeft: {
    width: 15,
    height: 20,
    backgroundColor: '#FF4444',
    transform: [{ skewY: '10deg' }],
  },
  bowTieCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CC0000',
  },
  bowTieRight: {
    width: 15,
    height: 20,
    backgroundColor: '#FF4444',
    transform: [{ skewY: '-10deg' }],
  },
  vest: {
    position: 'absolute',
    top: 125,
    width: 60,
    height: 40,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFA500',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vestText: {
    fontSize: 24,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  eqOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
  },
  eqRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  eqBar: { width: 4, backgroundColor: '#FFA500', borderRadius: 999 },
  chat: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },
  bubble: { padding: 12, borderRadius: 16, marginVertical: 6, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFA500' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
  bubbleText: { color: '#eee', fontSize: 15, lineHeight: 20 },
  userBubbleText: { color: '#000' },
  footer: { padding: 24, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA500',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  micActive: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  micHint: { color: '#888', fontSize: 14, marginTop: 12, textAlign: 'center' },
});

