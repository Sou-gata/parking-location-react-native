import React, { useEffect, useRef, useCallback, useState } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Text, Surface } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useSelector, useDispatch } from "react-redux";
import { hideToast, ToastType } from "../store/slices/toastSlice";
import { RootState } from "../store/store";

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
    const insets = useSafeAreaInsets();
    const [modalVisible, setModalVisible] = useState(false);

    const handleHide = useCallback(() => {
        Animated.timing(animation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            dispatch(hideToast());
            setModalVisible(false);
        });
    }, [animation, dispatch]);

    useEffect(() => {
        if (visible) {
            setModalVisible(true);

            // Slide Up
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
        } else if (modalVisible) {
            handleHide();
        }
    }, [visible, modalVisible, animation, handleHide, message, type, title]);

    if (!modalVisible && !visible) return null;

    const config = TOAST_TYPES[type] || TOAST_TYPES.info;
    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [200, 0], // Start off-screen at bottom, slide up to its natural position
    });

    return (
        <View
            style={[
                StyleSheet.absoluteFill,
                { zIndex: 999999, elevation: 999999 },
            ]}
            pointerEvents="box-none"
        >
            <Animated.View
                className="absolute bottom-0 left-0 right-0 items-center px-5"
                style={[
                    {
                        transform: [{ translateY }],
                        opacity: animation,
                        paddingBottom: Math.max(insets.bottom, 16),
                    },
                ]}
                pointerEvents="box-none"
            >
                <Surface
                    elevation={4}
                    className="w-full max-w-[450px] bg-white rounded-xl border-l-[5px] p-3"
                    style={{ borderLeftColor: config.color }}
                    pointerEvents="auto"
                >
                    <View className="flex-row items-center gap-3">
                        <View
                            className="w-10 h-10 rounded-full justify-center items-center"
                            style={{ backgroundColor: `${config.color}20` }}
                        >
                            <MaterialDesignIcons
                                name={config.icon as any}
                                size={24}
                                color={config.color}
                            />
                        </View>
                        <View className="flex-1">
                            {Boolean(showHeading) && (
                                <Text
                                    className="font-bold text-base"
                                    style={{ color: config.color }}
                                >
                                    {title || config.title}
                                </Text>
                            )}
                            <Text className="text-slate-500 text-[13px]" numberOfLines={2}>
                                {message}
                            </Text>
                        </View>
                    </View>
                </Surface>
            </Animated.View>
        </View>
    );
};

export default Toast;
