import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing, ScrollView } from 'react-native';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';

// Simple animated equalizer bars to simulate a talking bartender
function TalkingBars({ active }: { active: boolean }) {
  const bars = [useRef(new Animated.Value(4)).current, useRef(new Animated.Value(8)).current, useRef(new Animated.Value(6)).current];
  useEffect(() => {
    const loops = bars.map((v, i) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 14 + (i * 2), duration: 220 + i * 60, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(v, { toValue: 4 + i, duration: 180 + i * 40, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ])
      );
    });
    if (active) loops.forEach(l => l.start());
    else loops.forEach(l => l.stop());
    return () => loops.forEach(l => l.stop());
  }, [active]);
  return (
    <View style={styles.eqRow}>
      {bars.map((v, idx) => (
        <Animated.View key={idx} style={[styles.eqBar, { height: v }]} />
      ))}
    </View>
  );
}

export default function BartenderModal() {
  const { apiBaseUrl } = useSettings();
  const base = apiBaseUrl || API_BASE_URL;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hey there! What can I make for you today?" },
  ]);

  // Web Speech API for microphone + TTS on web
  const recognitionRef = useRef<any>(null);
  const supportsWebSpeech = typeof window !== 'undefined' && (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));
  const supportsSpeechSynthesis = typeof window !== 'undefined' && !!window.speechSynthesis;

  const startListeningWeb = useCallback(() => {
    if (!supportsWebSpeech) return;
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
  }, [supportsWebSpeech]);

  const speakWeb = useCallback((text: string) => {
    if (!supportsSpeechSynthesis) return;
    try {
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
        body: JSON.stringify({ messages: [
          { role: 'system', content: 'You are a friendly bartender. Offer cocktail recommendations and tips.' },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content },
        ]})
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const reply = data?.reply || "Here's something you might like!";
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      if (Platform.OS === 'web') speakWeb(reply);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I had trouble hearing that. Could you try again?' }]);
    }
  }, [base, messages, speakWeb]);

  const onMicPress = () => {
    if (Platform.OS === 'web') {
      if (!supportsWebSpeech) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'Voice input is not supported in this browser. Try Chrome or Edge on desktop, or use text chat for now.' },
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
      // Native note: Implement native STT later (e.g., Speech API)
      setMessages((m) => [...m, { role: 'assistant', content: 'Microphone chat is coming soon on mobile. For now, try this on the website.' }]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bartender</Text>
        <TalkingBars active={speaking || listening} />
      </View>

      <ScrollView style={styles.chat} contentContainerStyle={{ padding: 12 }}>
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onMicPress} style={[styles.micBtn, listening && styles.micActive]}>
          <Text style={styles.micText}>{listening ? 'Listening… Tap to stop' : 'Tap to talk'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C0C' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { color: '#FFA500', fontSize: 20, fontWeight: '700' },
  chat: { flex: 1 },
  bubble: { padding: 12, borderRadius: 12, marginVertical: 6, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#121212', borderWidth: 1, borderColor: '#1f1f1f' },
  bubbleText: { color: '#eee' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#222' },
  micBtn: { backgroundColor: '#FFA500', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  micActive: { opacity: 0.8 },
  micText: { color: '#000', fontWeight: '700' },
  eqRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  eqBar: { width: 6, backgroundColor: '#FFA500', borderRadius: 999 },
});
