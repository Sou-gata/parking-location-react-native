import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Dimensions, Modal } from "react-native";
import { Text, Surface } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useSelector, useDispatch } from "react-redux";
import { hideToast, ToastType } from "../store/slices/toastSlice";
import { RootState } from "../store/store";

const { width } = Dimensions.get("window");

interface ToastConfig {
    color: string;
    icon: string;
    title: string;
}

const TOAST_TYPES: Record<ToastType, ToastConfig> = {
    success: {
        color: "#10b981",
        icon: "check-circle",
        title: "Success",
    },
    info: {
        color: "#3b82f6",
        icon: "information",
        title: "Information",
    },
    warning: {
        color: "#f59e0b",
        icon: "alert",
        title: "Warning",
    },
    danger: {
        color: "#ef4444",
        icon: "alert-circle",
        title: "Error",
    },
};

const Toast: React.FC = () => {
    const dispatch = useDispatch();
    const { visible, message, type, title, showHeading } = useSelector(
        (state: RootState) => state.toast
    );
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide Down
            Animated.spring(animation, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();

            // Auto Hide
            const timer = setTimeout(() => {
                handleHide();
            }, 4000);

            return () => clearTimeout(timer);
        } else {
            animation.setValue(0);
        }
    }, [visible]);

    const handleHide = () => {
        Animated.timing(animation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            dispatch(hideToast());
        });
    };

    if (!visible && (animation as any)._value === 0) return null;

    const config = TOAST_TYPES[type] || TOAST_TYPES.info;
    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 50], // Start off-screen, slide to y=50
    });

    return (
        <Modal
            transparent={true}
            visible={visible || (animation as any)._value !== 0}
            animationType="none"
            pointerEvents="none"
        >
            <Animated.View
                style={[styles.container, { transform: [{ translateY }], opacity: animation }]}
                pointerEvents="box-none"
            >
                <Surface elevation={4} style={[styles.toast, { borderLeftColor: config.color }]}>
                    <View style={styles.content}>
                        <View
                            style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}
                        >
                            <MaterialDesignIcons
                                name={config.icon as any}
                                size={24}
                                color={config.color}
                            />
                        </View>
                        <View style={styles.textContainer}>
                            {showHeading && (
                                <Text style={[styles.title, { color: config.color }]}>
                                    {title || config.title}
                                </Text>
                            )}
                            <Text style={styles.message} numberOfLines={2}>
                                {message}
                            </Text>
                        </View>
                    </View>
                </Surface>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 9999,
        paddingHorizontal: 20,
    },
    toast: {
        width: "100%",
        maxWidth: 450,
        backgroundColor: "white",
        borderRadius: 12,
        borderLeftWidth: 5,
        padding: 12,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontWeight: "bold",
        fontSize: 16,
    },
    message: {
        color: "#64748b",
        fontSize: 13,
    },
});

export default Toast;
