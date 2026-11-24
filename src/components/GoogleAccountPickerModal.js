import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ScrollView,
    Linking,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEVICE_GOOGLE_ACCOUNTS } from '../services/GoogleAuthService';
import { DILDORA_AVATAR_URI } from '../constants/defaultAvatar';

const GoogleAccountPickerModal = ({
    visible,
    onClose,
    onSelectAccount,
    title,
    subtitle
}) => {
    const { i18n } = useTranslation();
    const isEn = i18n.language === "en";
    const isRu = i18n.language === "ru";
    const resolvedTitle = title || (isEn ? "Sign in with Google" : (isRu ? "Вход через аккаунт Google" : "Google hisobiga kirish"));
    const resolvedSubtitle = subtitle || (isEn ? "Continue in 1-tap with your Google account on this device:" : (isRu ? "Продолжите в один клик с аккаунта Google на устройстве:" : "Qurilmangizdagi Google hisobingiz orqali bir bosishda davom eting:"));
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customEmail, setCustomEmail] = useState('');
    const [customName, setCustomName] = useState('');

    const handleSelect = (account) => {
        onClose();
        if (onSelectAccount) {
            onSelectAccount(account.email, account.name);
        }
    };

    const handleCustomSubmit = () => {
        const email = customEmail.trim();
        if (!email || !email.includes('@')) return;
        const name = customName.trim() || email.split('@')[0];
        onClose();
        if (onSelectAccount) {
            onSelectAccount(email, name);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetContainer}>
                            {/* Drag handle */}
                            <View style={styles.handle} />

                            {/* Center Google Chrome Brand Icon */}
                            <View style={styles.headerBrand}>
                                <View style={styles.brandCircle}>
                                    <View style={styles.chromeLogo}>
                                        <Ionicons name="logo-google" size={26} color="#FFFFFF" />
                                    </View>
                                </View>
                            </View>

                            {/* Sheet Title */}
                            <Text style={styles.titleText}>{resolvedTitle}</Text>
                            <Text style={styles.subtitleText}>{resolvedSubtitle}</Text>

                            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                                {/* Primary Account */}
                                <TouchableOpacity
                                    style={[styles.accountCard, { borderColor: 'rgba(0, 230, 118, 0.4)', borderWidth: 1.5 }]}
                                    activeOpacity={0.7}
                                    onPress={() => handleSelect(DEVICE_GOOGLE_ACCOUNTS[0])}
                                >
                                    <View style={[styles.avatarBox, { backgroundColor: '#00E676', overflow: 'hidden' }]}>
                                        <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>D</Text>
                                    </View>
                                    <View style={styles.accountTextContainer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.accountName}>Dildora G'ofurova</Text>
                                            <Ionicons name="checkmark-circle" size={14} color="#00E676" />
                                        </View>
                                        <Text style={styles.accountEmail}>dildora.gofurova@gmail.com</Text>
                                        <Text style={{ fontSize: 10, color: '#FF6D00', marginTop: 2, fontWeight: '600' }}>
                                            {isEn ? "⌚️ Strava & Mibro Fit Linked" : (isRu ? "⌚️ Strava и Mibro Fit подключены" : "⌚️ Strava & Mibro Fit bog'langan")}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Option: Boshqa hisob qo'shish */}
                                {!showCustomInput ? (
                                    <TouchableOpacity
                                        style={[styles.accountCard, styles.addAccountCard]}
                                        activeOpacity={0.7}
                                        onPress={() => setShowCustomInput(true)}
                                    >
                                        <View style={styles.addIconBox}>
                                            <Ionicons name="person-add-outline" size={20} color="#FDD663" />
                                        </View>
                                        <View style={styles.accountTextContainer}>
                                            <Text style={styles.addAccountText}>{isEn ? "Add another account" : (isRu ? "Добавить аккаунт на устройстве" : "Qurilmaga hisob kiritish")}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.customInputContainer}>
                                        <Text style={styles.inputLabel}>Google elektron pochta:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="masalan: yangi_hisob@gmail.com"
                                            placeholderTextColor="#757575"
                                            value={customEmail}
                                            onChangeText={setCustomEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoFocus
                                        />
                                        <Text style={[styles.inputLabel, { marginTop: 8 }]}>Ismingiz:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Ism familiya"
                                            placeholderTextColor="#757575"
                                            value={customName}
                                            onChangeText={setCustomName}
                                        />
                                        <TouchableOpacity
                                            style={styles.customContinueBtn}
                                            onPress={handleCustomSubmit}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.customContinueTxt}>Hisob bilan davom etish</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Bottom close button */}
                            <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.7}>
                                <Text style={styles.dismissTxt}>{isEn ? "Close" : (isRu ? "Закрыть" : "Yopish")}</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: '#1E1F22',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 28,
        maxHeight: '85%',
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#5F6368',
        alignSelf: 'center',
        marginBottom: 16,
    },
    headerBrand: {
        alignItems: 'center',
        marginBottom: 14,
    },
    brandCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2A2B2E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chromeLogo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#4285F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleText: {
        color: '#FFFFFF',
        fontSize: 21,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    subtitleText: {
        color: '#9AA0A6',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
        paddingHorizontal: 12,
    },
    scrollList: {
        marginBottom: 12,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#28292D',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    avatarBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarInitial: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    accountTextContainer: {
        flex: 1,
    },
    accountName: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    accountEmail: {
        color: '#9AA0A6',
        fontSize: 13,
    },
    addAccountCard: {
        backgroundColor: '#232427',
        borderWidth: 1,
        borderColor: 'rgba(253, 214, 99, 0.25)',
    },
    addIconBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(253, 214, 99, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    addAccountText: {
        color: '#FDD663',
        fontSize: 15,
        fontWeight: '600',
    },
    customInputContainer: {
        backgroundColor: '#28292D',
        borderRadius: 18,
        padding: 16,
        marginBottom: 10,
    },
    inputLabel: {
        color: '#E8EAED',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: '#1E1F22',
        borderRadius: 12,
        height: 46,
        paddingHorizontal: 14,
        color: '#FFFFFF',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#3C4043',
    },
    customContinueBtn: {
        backgroundColor: '#4285F4',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 14,
    },
    customContinueTxt: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    dismissBtn: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    dismissTxt: {
        color: '#9AA0A6',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default GoogleAccountPickerModal;
