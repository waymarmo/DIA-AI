import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';

// expo-speech faqat Text-to-Speech uchun — mic input uchun placeholder
const VoiceInput = ({ onSpeechStart, onSpeechEnd, onSpeechResults, onSpeechError, language = 'uz-UZ' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const startRecognizing = async () => {
        setIsLoading(true);
        setIsListening(true);
        if (onSpeechStart) onSpeechStart();

        // expo-speech voice recognition mavjud emas (faqat TTS)
        // Shuning uchun 2 soniya simulatsiya qilamiz
        setTimeout(() => {
            setIsListening(false);
            setIsLoading(false);
            if (onSpeechEnd) onSpeechEnd();
            // Foydalanuvchiga xabar — keyingi versiyada ovoz kiritish qo'shiladi
            if (onSpeechResults) onSpeechResults('');
        }, 2000);
    };

    const stopRecognizing = () => {
        setIsListening(false);
        setIsLoading(false);
        if (onSpeechEnd) onSpeechEnd();
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={isListening ? stopRecognizing : startRecognizing}
                style={styles.button}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={isListening ? ['#FF4B4B', '#FF0000'] : ['#4B7BFF', '#2D5BFF']}
                    style={styles.gradient}
                >
                    {isLoading && !isListening ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Ionicons
                            name={isListening ? 'mic-off' : 'mic'}
                            size={24}
                            color="#FFF"
                        />
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    gradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default VoiceInput;
