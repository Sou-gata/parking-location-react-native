import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";
import { cssInterop } from "nativewind";

const hexToRgba = (hex, alpha) => {
    let c = hex.toLowerCase().trim();
    if (c === "green") c = "#16a34a";
    else if (c === "red") c = "#dc2626";
    else if (c === "blue") c = "#2563eb";
    else if (c === "yellow") c = "#ca8a04";
    else if (c === "orange") c = "#ea580c";
    else if (c === "indigo") c = "#4f46e5";
    else if (c === "gray") c = "#475569";

    if (c.startsWith("#")) {
        let clean = c.replace("#", "");
        if (clean.length === 3) {
            clean =
                clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
        }
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return c;
};

const getPastelTheme = (color, selected) => {
    const baseColor = color || (selected ? "#4f46e5" : "#475569");
    let resolvedColor = baseColor.toLowerCase().trim();
    if (resolvedColor === "green") resolvedColor = "#16a34a";
    else if (resolvedColor === "red") resolvedColor = "#dc2626";
    else if (resolvedColor === "blue") resolvedColor = "#2563eb";
    else if (resolvedColor === "yellow") resolvedColor = "#ca8a04";
    else if (resolvedColor === "orange") resolvedColor = "#ea580c";
    else if (resolvedColor === "indigo") resolvedColor = "#4f46e5";
    else if (resolvedColor === "gray") resolvedColor = "#475569";

    if (
        resolvedColor === "#22c55e" ||
        resolvedColor === "#10b981" ||
        resolvedColor === "#15803d" ||
        resolvedColor === "#16a34a"
    ) {
        return {
            bg: "rgba(22, 163, 74, 0.08)",
            text: "#16a34a",
            border: "#16a34a",
        };
    }
    if (
        resolvedColor === "#ef4444" ||
        resolvedColor === "#dc2626" ||
        resolvedColor === "#b91c1c"
    ) {
        return {
            bg: "rgba(220, 38, 38, 0.07)",
            text: "#dc2626",
            border: "#dc2626",
        };
    }
    if (
        resolvedColor === "#eab308" ||
        resolvedColor === "#f59e0b" ||
        resolvedColor === "#d97706" ||
        resolvedColor === "#ca8a04"
    ) {
        return {
            bg: "rgba(202, 138, 4, 0.08)",
            text: "#ca8a04",
            border: "#ca8a04",
        };
    }
    if (
        resolvedColor === "#3b82f6" ||
        resolvedColor === "#2563eb" ||
        resolvedColor === "#1d4ed8"
    ) {
        return {
            bg: "rgba(37, 99, 235, 0.07)",
            text: "#2563eb",
            border: "#2563eb",
        };
    }
    if (
        resolvedColor === "#4338ca" ||
        resolvedColor === "#4f46e5" ||
        resolvedColor === "#3730a3" ||
        resolvedColor === "#6366f1"
    ) {
        return {
            bg: "rgba(79, 70, 229, 0.07)",
            text: "#4f46e5",
            border: "#4f46e5",
        };
    }
    if (
        resolvedColor === "#64748b" ||
        resolvedColor === "#475569" ||
        resolvedColor === "#334155" ||
        resolvedColor === "#94a3b8" ||
        resolvedColor === "#cbd5e1"
    ) {
        return {
            bg: "rgba(71, 85, 105, 0.06)",
            text: "#475569",
            border: "#475569",
        };
    }

    if (resolvedColor.startsWith("#")) {
        return {
            bg: hexToRgba(resolvedColor, 0.07),
            text: resolvedColor,
            border: resolvedColor,
        };
    }

    return {
        bg: "rgba(71, 85, 105, 0.06)",
        text: "#475569",
        border: "#475569",
    };
};

function Chip({
    children,
    selected = false,
    onPress,
    style,
    textStyle,
    selectedColor,
    showSelectedOverlay = false,
    compact = false,
    isCompact,
    icon,
    disabled = false,
    onClose,
    avatar,
}) {
    const activeCompact = isCompact !== undefined ? Boolean(isCompact) : Boolean(compact);
    const flattenedStyle = StyleSheet.flatten(style) || {};
    const flattenedTextStyle = StyleSheet.flatten(textStyle) || {};

    const themeColor =
        flattenedStyle.backgroundColor || (selected ? selectedColor : null);
    const theme = getPastelTheme(themeColor, selected);

    const defaultBgColor = selected
        ? "rgba(79, 70, 229, 0.07)"
        : "rgba(71, 85, 105, 0.06)";
    const defaultTextColor = selected ? "#4f46e5" : "#475569";
    const defaultBorderColor = selected ? "#4f46e5" : "#475569";

    const finalBgColor = flattenedStyle.backgroundColor
        ? flattenedStyle.backgroundColor
        : theme
        ? theme.bg
        : defaultBgColor;

    const finalBorderColor = flattenedStyle.borderColor
        ? flattenedStyle.borderColor
        : theme
        ? theme.border
        : defaultBorderColor;

    const finalBorderWidth = flattenedStyle.borderWidth !== undefined
        ? flattenedStyle.borderWidth
        : theme
        ? 1
        : 1;

    const finalTextColor = flattenedTextStyle.color
        ? flattenedTextStyle.color
        : theme
        ? theme.text
        : defaultTextColor;

    const {
        backgroundColor: _bg,
        borderColor: _bc,
        borderWidth: _bw,
        borderRadius: _br,
        ...otherStyles
    } = flattenedStyle;

    const handlePress = (event) => {
        if (onPress && !disabled) {
            onPress(event);
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress ? handlePress : undefined}
            disabled={disabled || !onPress}
            activeOpacity={0.75}
            className={`self-start flex-row items-center justify-center rounded-full ${
                activeCompact ? "px-2 py-1 min-h-[24px]" : "px-2 py-1.5 min-h-[28px]"
            }`}
            style={[
                otherStyles,
                {
                    backgroundColor: finalBgColor,
                    borderColor: finalBorderColor,
                    borderWidth: finalBorderWidth,
                },
            ]}
        >
            {selected && showSelectedOverlay && (
                <View className="mr-1 items-center justify-center">
                    <Icon
                        source="check"
                        size={activeCompact ? 12 : 14}
                        color={finalTextColor}
                    />
                </View>
            )}

            {avatar && (
                <View className="mr-1.5 rounded-full overflow-hidden">
                    {avatar}
                </View>
            )}

            {!selected && icon && (
                <View className="mr-1 items-center justify-center">
                    {typeof icon === "string" ? (
                        <Icon
                            source={icon}
                            size={activeCompact ? 12 : 14}
                            color={finalTextColor}
                        />
                    ) : (
                        icon
                    )}
                </View>
            )}

            <Text
                className={`font-medium text-center ${
                    activeCompact ? "text-[10.5px]" : "text-xs"
                }`}
                style={[textStyle, { color: finalTextColor }]}
            >
                {children}
            </Text>

            {onClose && (
                <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.6}
                    className="ml-1.5 items-center justify-center"
                >
                    <Icon
                        source="close-circle"
                        size={activeCompact ? 14 : 16}
                        color={finalTextColor}
                    />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

export default Chip;
