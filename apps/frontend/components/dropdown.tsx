import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { webStyles } from '@/utils/web-styles';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  preview?: React.ReactNode;
}

interface DropdownProps<T = string> {
  options: DropdownOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  renderValue?: (value: T) => React.ReactNode;
}

export function Dropdown<T = string>({
  options,
  value,
  onValueChange,
  label,
  icon,
  renderValue,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<View>(null);
  const textColor = useThemeColor({}, 'text');
  const surface = useThemeColor({}, 'surfaceElevated');
  const borderColor = useThemeColor({}, 'border');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const accent = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');

  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web') return;

    const handlePressOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current) {
        const element = containerRef.current as any;
        if (element && !element.contains?.(target)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handlePressOutside);
    return () => {
      document.removeEventListener('mousedown', handlePressOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption
    ? renderValue
      ? renderValue(value)
      : selectedOption.label
    : 'Select...';

  const handleSelect = (optionValue: T) => {
    onValueChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };


  return (
    <View ref={containerRef} style={styles.container}>
      <TouchableOpacity
        style={[styles.trigger, webStyles.hoverable, { borderColor: inputBorder }]}
        onPress={handleToggle}
      >
        <View style={styles.triggerContent}>
          {icon && (
            <Ionicons name={icon} size={24} color={textColor} style={styles.triggerIcon} />
          )}
          {label && (
            <ThemedText style={styles.triggerLabel}>{label}</ThemedText>
          )}
          <View style={styles.triggerValue}>
            {typeof displayValue === 'string' ? (
              <ThemedText style={styles.triggerValueText} colorName="mutedForeground">
                {displayValue}
              </ThemedText>
            ) : (
              displayValue
            )}
          </View>
          <Ionicons 
            name={isOpen ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={mutedForeground} 
          />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View
          style={[
            styles.dropdownMenu, 
            { 
              backgroundColor: surface, 
              borderColor: borderColor,
              shadowColor: '#000',
            }
          ]}
        >
            <ScrollView 
              style={styles.optionsList}
              nestedScrollEnabled
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.option,
                      { borderBottomColor: borderColor },
                      webStyles.hoverable,
                      isSelected && { backgroundColor: accent },
                      index === options.length - 1 && styles.optionLast,
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    {option.preview && (
                      <View style={styles.optionPreview}>{option.preview}</View>
                    )}
                    <ThemedText
                      style={styles.optionLabel}
                      colorName={isSelected ? 'onTint' : 'text'}
                    >
                      {option.label}
                    </ThemedText>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={onTint}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    ...Platform.select({
      web: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        cursor: 'pointer',
        borderRadius: 10,
      },
    }),
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  triggerIcon: {
    marginRight: 12,
  },
  triggerLabel: {
    fontSize: 16,
    fontWeight: '400',
    marginRight: 12,
  },
  triggerValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: 8,
  },
  triggerValueText: {
    fontSize: 16,
    fontWeight: '400',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%' as any,
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1001,
    maxHeight: 300,
    ...Platform.select({
      web: {
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        cursor: 'pointer',
      },
    }),
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionPreview: {
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
});

