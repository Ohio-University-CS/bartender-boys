import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  Easing 
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

export default function DispensingScreen({ route, navigation }) {
  const { cocktail } = route.params;
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const rotation = useSharedValue(0);
  const glassScale = useSharedValue(0.8);

  const steps = [
    `Adding ${cocktail.ingredients[0]}...`,
    `Adding ${cocktail.ingredients[1]}...`,
    `Mixing ingredients...`,
    'Finishing touches...',
    'Your drink is ready!',
  ];

  useEffect(() => {
    // Animate glass
    glassScale.value = withTiming(1, { duration: 500 });
    
    // Rotate icon
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );

    // Progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            Toast.show({
              type: 'success',
              text1: 'Enjoy your drink!',
              text2: cocktail.name,
            });
            navigation.goBack();
          }, 1000);
          return 100;
        }
        
        const newProgress = prev + 2;
        const stepIndex = Math.floor((newProgress / 100) * steps.length);
        setCurrentStep(Math.min(stepIndex, steps.length - 1));
        
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glassStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glassScale.value }],
  }));

  const handleCancel = () => {
    Toast.show({
      type: 'error',
      text1: 'Dispense cancelled',
      text2: 'Emergency stop activated',
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Glass */}
        <Animated.View style={[styles.glassContainer, glassStyle]}>
          <Text style={styles.glassEmoji}>{cocktail.emoji}</Text>
        </Animated.View>

        {/* Drink Name */}
        <Text style={styles.drinkName}>{cocktail.name}</Text>

        {/* Current Step */}
        <View style={styles.stepContainer}>
          <Animated.Text style={[styles.stepIcon, rotationStyle]}>
            ⚙️
          </Animated.Text>
          <Text style={styles.stepText}>{steps[currentStep]}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Ingredients List */}
        <View style={styles.ingredientsContainer}>
          <Text style={styles.ingredientsTitle}>Ingredients:</Text>
          {cocktail.ingredients.map((ingredient, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.ingredientBullet}>•</Text>
              <Text style={styles.ingredientText}>{ingredient}</Text>
              {idx < currentStep && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          ))}
        </View>

        {/* Emergency Stop */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>🛑 Emergency Stop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 75,
    borderWidth: 2,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    marginBottom: 32,
  },
  glassEmoji: {
    fontSize: 80,
  },
  drinkName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepText: {
    fontSize: 16,
    color: '#D97706',
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#171717',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D97706',
  },
  progressText: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  ingredientsContainer: {
    width: '100%',
    backgroundColor: '#171717',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    marginBottom: 32,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  ingredientBullet: {
    fontSize: 16,
    color: '#737373',
    marginRight: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    color: '#F5F5F5',
  },
  checkmark: {
    fontSize: 16,
    color: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
