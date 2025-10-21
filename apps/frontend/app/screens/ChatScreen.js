import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { cocktails } from '../../data/cocktails';

const QUICK_PROMPTS = [
  '🍸 Surprise me',
  '🔥 Something strong',
  '🍓 Fruity & sweet',
  '🌿 Classic cocktail',
];

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hi! I'm your AI bartender. What kind of drink are you in the mood for?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  
  const handleSend = (text = input) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const recommendation = getRecommendation(text);
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: recommendation.message,
        sender: 'bot',
        timestamp: new Date(),
        cocktail: recommendation.cocktail,
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const getRecommendation = (prompt) => {
    const lower = prompt.toLowerCase();
    let cocktail;

    if (lower.includes('strong') || lower.includes('alcohol')) {
      cocktail = cocktails.find((c) => c.alcohol >= 30);
    } else if (lower.includes('fruity') || lower.includes('sweet')) {
      cocktail = cocktails.find((c) => c.flavor.includes('Sweet'));
    } else if (lower.includes('classic') || lower.includes('traditional')) {
      cocktail = cocktails.find((c) => c.name === 'Old Fashioned');
    } else {
      cocktail = cocktails[Math.floor(Math.random() * cocktails.length)];
    }

    return {
      cocktail,
      message: `I recommend a ${cocktail.name}! ${cocktail.description}`,
    };
  };

  const handleOrderDrink = (cocktail) => {
    navigation.navigate('Dispensing', { cocktail });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bartender AI</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.menuIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg, idx) => (
            <Animated.View
              key={msg.id}
              entering={FadeInUp.delay(idx * 100)}
            >
              <View
                style={[
                  styles.messageBubble,
                  msg.sender === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === 'user' && styles.userMessageText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>

              {msg.cocktail && (
                <View style={styles.cocktailCard}>
                  <Text style={styles.cocktailEmoji}>{msg.cocktail.emoji}</Text>
                  <View style={styles.cocktailInfo}>
                    <Text style={styles.cocktailName}>{msg.cocktail.name}</Text>
                    <Text style={styles.cocktailFlavor}>{msg.cocktail.flavor}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => handleOrderDrink(msg.cocktail)}
                  >
                    <Text style={styles.orderButtonText}>Order</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          ))}
        </ScrollView>

        {/* Quick Prompts */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickPrompts}
          contentContainerStyle={styles.quickPromptsContent}
        >
          {QUICK_PROMPTS.map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickPrompt}
              onPress={() => handleSend(prompt)}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask for a drink..."
            placeholderTextColor="#737373"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 119, 6, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5F5F5',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 100,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#D97706',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  messageText: {
    fontSize: 16,
    color: '#F5F5F5',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  cocktailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginLeft: 12,
  },
  cocktailEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  cocktailInfo: {
    flex: 1,
  },
  cocktailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  cocktailFlavor: {
    fontSize: 14,
    color: '#737373',
  },
  orderButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickPrompts: {
    maxHeight: 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 119, 6, 0.2)',
  },
  quickPromptsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  quickPrompt: {
    backgroundColor: '#171717',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    marginRight: 8,
  },
  quickPromptText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
    gap: 12,
    backgroundColor: '#0A0A0A',
  },
  input: {
    flex: 1,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F5F5F5',
  },
  sendButton: {
    backgroundColor: '#D97706',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});