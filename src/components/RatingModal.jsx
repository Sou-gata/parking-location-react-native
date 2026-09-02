import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import {
    Text,
    TextInput,
    Button,
    IconButton,
} from "react-native-paper";

const RATING_LABELS = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
};

export default function RatingModal({
    visible,
    onClose,
    onSubmit,
    title = "Rate & Review",
    subtitle = "",
    existingRating = null,
    loading = false,
}) {
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState("");

    useEffect(() => {
        if (existingRating) {
            setRating(existingRating.rating || 5);
            setReview(existingRating.review || "");
        } else {
            setRating(5);
            setReview("");
        }
    }, [existingRating, visible]);

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit({ rating, review: review.trim() });
        }
    };

    const isReadOnly = Boolean(existingRating);

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[450px] shadow-2xl">
                {/* Header Row */}
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                        <Text className="text-xl font-bold text-slate-800">
                            {title}
                        </Text>
                        {Boolean(subtitle) && (
                            <Text className="text-xs text-slate-500 mt-0.5">
                                {subtitle}
                            </Text>
                        )}
                    </View>
                    <IconButton
                        icon="close"
                        size={22}
                        onPress={onClose}
                        style={{ margin: 0 }}
                    />
                </View>

                {/* Star Rating Bar */}
                <View className="flex-row justify-center items-center my-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            disabled={isReadOnly}
                            onPress={() => setRating(star)}
                            className="p-0.5"
                        >
                            <IconButton
                                icon={star <= rating ? "star" : "star-outline"}
                                iconColor={star <= rating ? "#f59e0b" : "#9ca3af"}
                                size={34}
                                style={{ margin: 0 }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <Text className="text-center text-sm font-semibold text-amber-600 mb-4">
                    {RATING_LABELS[rating] || ""} ({rating}/5)
                </Text>

                {/* Review Comment Box */}
                <TextInput
                    label="Review / Feedback (Optional)"
                    value={review}
                    onChangeText={setReview}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    disabled={isReadOnly}
                    outlineColor="#cbd5e1"
                    activeOutlineColor="#4338ca"
                    className="bg-slate-50 mb-4"
                    placeholder="Share details of your experience..."
                />

                {isReadOnly ? (
                    <View className="items-center mt-2">
                        <Text className="text-emerald-600 font-semibold text-sm">
                            ✓ Rating already submitted
                        </Text>
                        <Button
                            mode="outlined"
                            onPress={onClose}
                            className="mt-3 rounded-xl"
                        >
                            Close
                        </Button>
                    </View>
                ) : (
                    <View className="flex-row gap-3">
                        <Button
                            mode="outlined"
                            onPress={onClose}
                            className="flex-1 rounded-xl"
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1" }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            className="flex-1 rounded-xl bg-indigo-700"
                            loading={loading}
                            disabled={loading}
                            labelStyle={{ fontWeight: "700" }}
                        >
                            Submit Rating
                        </Button>
                    </View>
                )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
